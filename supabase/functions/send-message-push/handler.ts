export interface MessageWebhookRecord {
	id: string;
	conversation_id: string;
	sender_id: string;
	content?: string | null;
	media_urls?: string[] | null;
	shared_post_id?: string | null;
}

export interface WebhookPayload {
	type?: string;
	table?: string;
	record?: MessageWebhookRecord;
}

export interface ConversationMeta {
	id: string;
	type: "direct" | "group";
	title: string | null;
}

export interface ExpoPushMessage {
	to: string;
	title: string;
	body: string;
	sound: "default";
	channelId: string;
	data: {
		type: "chat_message";
		conversationId: string;
	};
}

export interface PushHandlerDeps {
	webhookSecret?: string;
	getConversation: (
		conversationId: string,
	) => Promise<ConversationMeta | null>;
	getSenderName: (senderId: string) => Promise<string>;
	getRecipientTokens: (
		conversationId: string,
		senderId: string,
	) => Promise<Array<string | null | undefined>>;
	sendExpoPush: (messages: ExpoPushMessage[]) => Promise<unknown>;
}

function isExpoPushToken(token: unknown): token is string {
	return (
		typeof token === "string" &&
		(token.startsWith("ExponentPushToken[") ||
			token.startsWith("ExpoPushToken["))
	);
}

function formatPushBody(record: MessageWebhookRecord): string {
	if (record.content && record.content.trim().length > 0) {
		const trimmed = record.content.trim();
		return trimmed.length > 140 ? `${trimmed.slice(0, 137)}...` : trimmed;
	}
	if (record.shared_post_id) {
		return "Shared a transmission";
	}
	if (record.media_urls && record.media_urls.length > 0) {
		return "Sent an attachment";
	}
	return "Sent a message";
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function handlePushWebhook(
	request: Request,
	deps: PushHandlerDeps,
): Promise<Response> {
	if (request.method !== "POST") {
		return jsonResponse({ error: "Method Not Allowed" }, 405);
	}

	if (deps.webhookSecret) {
		const authHeader = request.headers.get("Authorization");
		if (authHeader !== `Bearer ${deps.webhookSecret}`) {
			return jsonResponse({ error: "Unauthorized" }, 401);
		}
	}

	let payload: WebhookPayload;
	try {
		payload = (await request.json()) as WebhookPayload;
	} catch {
		return jsonResponse({ error: "Invalid JSON payload" }, 400);
	}

	if (
		payload.type !== "INSERT" ||
		payload.table !== "messages" ||
		!payload.record?.conversation_id ||
		!payload.record?.sender_id
	) {
		return jsonResponse({ sent: 0, skipped: true });
	}

	const record = payload.record;
	const [conversation, senderName, rawTokens] = await Promise.all([
		deps.getConversation(record.conversation_id),
		deps.getSenderName(record.sender_id),
		deps.getRecipientTokens(record.conversation_id, record.sender_id),
	]);

	const validTokens = rawTokens.filter(isExpoPushToken);
	if (validTokens.length === 0) {
		return jsonResponse({ sent: 0 });
	}

	const title =
		conversation?.type === "group" && conversation.title
			? `${senderName} in ${conversation.title}`
			: senderName;
	const body = formatPushBody(record);

	const messages: ExpoPushMessage[] = validTokens.map((token) => ({
		to: token,
		title,
		body,
		sound: "default",
		channelId: "messages",
		data: {
			type: "chat_message",
			conversationId: record.conversation_id,
		},
	}));

	const tickets = await deps.sendExpoPush(messages);
	return jsonResponse({ sent: messages.length, tickets });
}
