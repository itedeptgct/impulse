import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
	Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PUSH_WEBHOOK_SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type, x-webhook-secret",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
};

export interface NotificationRow {
	id: string;
	recipient_id: string;
	actor_id?: string | null;
	type: "comment" | "reply" | "mention" | "message";
	title: string;
	body: string;
	post_id?: string | null;
	comment_id?: string | null;
	conversation_id?: string | null;
	profile_id?: string | null;
	data?: Record<string, unknown> | null;
	read_at?: string | null;
	created_at?: string;
}

export interface WebhookPayload {
	type?: string;
	table?: string;
	schema?: string;
	record?: NotificationRow;
	old_record?: NotificationRow | null;
}

export interface ExpoPushMessage {
	to: string;
	title: string;
	body: string;
	sound: "default";
	channelId: string;
	data: {
		notificationId: string;
		type: string;
		postId: string | null;
		commentId: string | null;
		conversationId: string | null;
		username: string | null;
	};
}

export interface ExpoPushTicket {
	status: "ok" | "error";
	id?: string;
	message?: string;
	details?: {
		error?: string;
		[key: string]: unknown;
	};
}

export interface SendPushDeps {
	supabase?: any;
	webhookSecret?: string | null;
	sendExpoPush?: (
		messages: ExpoPushMessage[],
	) => Promise<{ data?: ExpoPushTicket[] }>;
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			...corsHeaders,
			"Content-Type": "application/json",
		},
	});
}

function isExpoPushToken(token: unknown): token is string {
	return (
		typeof token === "string" &&
		(token.startsWith("ExponentPushToken[") ||
			token.startsWith("ExpoPushToken["))
	);
}

function chunkArray<T>(items: T[], size = 100): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < items.length; i += size) {
		chunks.push(items.slice(i, i + size));
	}
	return chunks;
}

export async function handleSendPush(
	request: Request,
	deps: SendPushDeps = {},
): Promise<Response> {
	if (request.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	if (request.method !== "POST") {
		return jsonResponse({ error: "Method Not Allowed" }, 405);
	}

	// 1. Verify PUSH_WEBHOOK_SECRET when configured
	const configuredSecret = (
		deps.webhookSecret !== undefined
			? deps.webhookSecret
			: PUSH_WEBHOOK_SECRET
	)?.trim();

	if (configuredSecret && configuredSecret.length > 0) {
		const xWebhookSecret = request.headers.get("x-webhook-secret")?.trim();
		const authHeader =
			request.headers.get("authorization") ??
			request.headers.get("Authorization") ??
			"";
		const bearerToken = authHeader.startsWith("Bearer ")
			? authHeader.slice(7).trim()
			: authHeader.startsWith("bearer ")
				? authHeader.slice(7).trim()
				: "";

		const secretMatches =
			(xWebhookSecret && xWebhookSecret === configuredSecret) ||
			(bearerToken && bearerToken === configuredSecret);

		if (!secretMatches) {
			return jsonResponse({ error: "Unauthorized" }, 401);
		}
	}

	// 2. Parse JSON payload
	let payload: WebhookPayload;
	try {
		payload = (await request.json()) as WebhookPayload;
	} catch {
		return jsonResponse({ error: "Invalid JSON payload" }, 400);
	}

	const record = payload?.record;
	if (!record || typeof record !== "object" || !record.recipient_id) {
		return jsonResponse(
			{ error: "Missing record or record.recipient_id" },
			400,
		);
	}

	const client = deps.supabase ?? supabaseAdmin;

	// 3. Query notification_preferences (push_enabled) for record.recipient_id
	const { data: pref, error: prefError } = await client
		.from("notification_preferences")
		.select("push_enabled")
		.eq("user_id", record.recipient_id)
		.maybeSingle();

	if (prefError) {
		console.error("[send-push] Error fetching preferences:", prefError);
	}

	if (pref && pref.push_enabled === false) {
		return jsonResponse({ skipped: "push_disabled" }, 200);
	}

	// 4. Query user_push_tokens for all expo_push_token rows belonging to record.recipient_id
	const { data: tokenRows, error: tokenError } = await client
		.from("user_push_tokens")
		.select("expo_push_token")
		.eq("user_id", record.recipient_id);

	if (tokenError) {
		console.error("[send-push] Error fetching tokens:", tokenError);
		return jsonResponse({ error: "Failed to fetch push tokens" }, 500);
	}

	const rawTokens: string[] = (
		(tokenRows as Array<{ expo_push_token?: string | null }>) ?? []
	)
		.map((row) => row.expo_push_token)
		.filter((token): token is string => Boolean(token));

	const validTokens = Array.from(new Set(rawTokens.filter(isExpoPushToken)));

	if (validTokens.length === 0) {
		return jsonResponse({ sent: 0 }, 200);
	}

	// 5. Build Expo Push messages
	let actorUsername: string | null = null;
	if (record.data && typeof record.data === "object") {
		const rawUsername = record.data.actor_username;
		if (typeof rawUsername === "string" && rawUsername.length > 0) {
			actorUsername = rawUsername;
		}
	}

	const channelId = record.type === "message" ? "messages" : "default";

	const pushData = {
		notificationId: record.id,
		type: record.type,
		postId: record.post_id ?? null,
		commentId: record.comment_id ?? null,
		conversationId: record.conversation_id ?? null,
		username: actorUsername,
	};

	const messages: ExpoPushMessage[] = validTokens.map((token) => ({
		to: token,
		title: record.title ?? "Impulse",
		body: record.body ?? "",
		sound: "default",
		channelId,
		data: pushData,
	}));

	// 6. Send via Expo Push API (chunked at 100)
	const chunks = chunkArray(messages, 100);
	const allTickets: ExpoPushTicket[] = [];
	const tokensToDelete = new Set<string>();

	for (const chunk of chunks) {
		let result: { data?: ExpoPushTicket[] } | null = null;

		if (deps.sendExpoPush) {
			result = await deps.sendExpoPush(chunk);
		} else {
			try {
				const response = await fetch(
					"https://exp.host/--/api/v2/push/send",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Accept: "application/json",
						},
						body: JSON.stringify(chunk),
					},
				);

				if (!response.ok) {
					console.error(
						`[send-push] Expo push API returned HTTP ${response.status}: ${await response.text()}`,
					);
					continue;
				}

				result = (await response.json()) as { data?: ExpoPushTicket[] };
			} catch (fetchErr) {
				console.error("[send-push] Failed to post to Expo:", fetchErr);
				continue;
			}
		}

		const tickets = result?.data;
		if (Array.isArray(tickets)) {
			allTickets.push(...tickets);
			for (let i = 0; i < chunk.length; i++) {
				const ticket = tickets[i];
				if (
					ticket &&
					ticket.status === "error" &&
					ticket.details?.error === "DeviceNotRegistered"
				) {
					tokensToDelete.add(chunk[i].to);
				}
			}
		}
	}

	// 7. Prune unregistered tokens from user_push_tokens
	if (tokensToDelete.size > 0) {
		const staleList = Array.from(tokensToDelete);
		const { error: deleteError } = await client
			.from("user_push_tokens")
			.delete()
			.eq("user_id", record.recipient_id)
			.in("expo_push_token", staleList);

		if (deleteError) {
			console.error(
				"[send-push] Failed to delete stale push tokens:",
				deleteError,
			);
		} else {
			console.log(
				`[send-push] Pruned ${staleList.length} unregistered token(s) for user ${record.recipient_id}`,
			);
		}
	}

	return jsonResponse(
		{
			sent: messages.length,
			tickets: allTickets,
			pruned: tokensToDelete.size,
		},
		200,
	);
}

Deno.serve(async (request: Request) => {
	try {
		return await handleSendPush(request);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Internal Server Error";
		return jsonResponse({ error: message }, 500);
	}
});
