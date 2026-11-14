import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
	Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			...corsHeaders,
			"Content-Type": "application/json",
		},
	});
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[A-Za-z0-9_]+$/;

export async function handleAdminUserActions(
	request: Request,
	adminClient = supabaseAdmin,
): Promise<Response> {
	if (request.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	if (request.method !== "POST") {
		return jsonResponse({ error: "Method Not Allowed" }, 405);
	}

	const authHeader = request.headers.get("Authorization") ?? "";
	const match = authHeader.match(/^Bearer\s+(.+)$/i);
	const jwt = match ? match[1].trim() : "";

	if (!jwt) {
		return jsonResponse(
			{ error: "Unauthorized: Missing bearer token" },
			401,
		);
	}

	const { data: userData, error: userError } =
		await adminClient.auth.getUser(jwt);
	if (userError || !userData?.user?.id) {
		return jsonResponse(
			{ error: "Unauthorized: Invalid or expired token" },
			401,
		);
	}

	const callerId = userData.user.id;

	const { data: callerProfile, error: profileQueryError } = await adminClient
		.from("profiles")
		.select("role")
		.eq("id", callerId)
		.maybeSingle();

	if (profileQueryError || !callerProfile || callerProfile.role !== "admin") {
		return jsonResponse(
			{ error: "Forbidden: Admin privileges required" },
			403,
		);
	}

	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return jsonResponse({ error: "Invalid JSON payload" }, 400);
	}

	if (!body || typeof body !== "object") {
		return jsonResponse({ error: "Invalid request payload" }, 400);
	}

	const action = body.action;

	if (action === "delete_user") {
		const targetUserId = body.targetUserId;
		if (typeof targetUserId !== "string" || !targetUserId.trim()) {
			return jsonResponse({ error: "targetUserId is required" }, 400);
		}

		const trimmedTargetId = targetUserId.trim();
		if (trimmedTargetId === callerId) {
			return jsonResponse(
				{ error: "Admins cannot delete their own account" },
				400,
			);
		}

		const { error: deleteError } =
			await adminClient.auth.admin.deleteUser(trimmedTargetId);
		if (deleteError) {
			const status = (deleteError as { status?: number }).status ?? 500;
			return jsonResponse(
				{ error: deleteError.message },
				status >= 400 && status < 600 ? status : 500,
			);
		}

		return jsonResponse({ success: true }, 200);
	}

	if (action === "update_user" || action === "update_user_account") {
		const targetUserId = body.targetUserId;
		if (typeof targetUserId !== "string" || !targetUserId.trim()) {
			return jsonResponse({ error: "targetUserId is required" }, 400);
		}

		const trimmedTargetId = targetUserId.trim();
		const { username, email, password } = body as {
			username?: unknown;
			email?: unknown;
			password?: unknown;
		};

		if (
			username === undefined &&
			email === undefined &&
			password === undefined
		) {
			return jsonResponse(
				{
					error: "At least one of username, email, or password must be provided",
				},
				400,
			);
		}

		let trimmedUsername: string | undefined;
		if (username !== undefined) {
			if (typeof username !== "string") {
				return jsonResponse(
					{ error: "Username must be a string" },
					400,
				);
			}
			trimmedUsername = username.trim();
			if (
				trimmedUsername.length < 1 ||
				trimmedUsername.length > 20 ||
				!USERNAME_REGEX.test(trimmedUsername)
			) {
				return jsonResponse(
					{
						error: "Username must be between 1 and 20 characters and contain only letters, numbers, and underscores",
					},
					400,
				);
			}
		}

		const authUpdates: { email?: string; password?: string } = {};

		if (email !== undefined) {
			if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
				return jsonResponse({ error: "Invalid email format" }, 400);
			}
			authUpdates.email = email.trim();
		}

		if (password !== undefined) {
			if (typeof password !== "string" || password.length < 6) {
				return jsonResponse(
					{ error: "Password must be at least 6 characters" },
					400,
				);
			}
			authUpdates.password = password;
		}

		if (trimmedUsername !== undefined) {
			const { error: updateProfileError } = await adminClient
				.from("profiles")
				.update({ username: trimmedUsername })
				.eq("id", trimmedTargetId);

			if (updateProfileError) {
				if (updateProfileError.code === "23505") {
					return jsonResponse(
						{ error: "Username is already taken" },
						409,
					);
				}
				return jsonResponse({ error: updateProfileError.message }, 400);
			}
		}

		if (Object.keys(authUpdates).length > 0) {
			const { error: authError } =
				await adminClient.auth.admin.updateUserById(
					trimmedTargetId,
					authUpdates,
				);

			if (authError) {
				const status = (authError as { status?: number }).status ?? 400;
				return jsonResponse(
					{ error: authError.message },
					status >= 400 && status < 600 ? status : 400,
				);
			}

			if (authUpdates.email) {
				await adminClient
					.from("private_profiles")
					.upsert({
						user_id: trimmedTargetId,
						email: authUpdates.email,
					});
			}
		}

		return jsonResponse({ success: true }, 200);
	}

	return jsonResponse(
		{ error: `Unsupported action: ${String(action)}` },
		400,
	);
}

Deno.serve(async (request: Request) => {
	try {
		return await handleAdminUserActions(request);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Internal Server Error";
		return jsonResponse({ error: message }, 500);
	}
});
