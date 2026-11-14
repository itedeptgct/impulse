import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
	type ConversationMeta,
	type ExpoPushMessage,
	handlePushWebhook,
} from "./handler.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
	Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PUSH_WEBHOOK_SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (request: Request) => {
	return handlePushWebhook(request, {
		webhookSecret: PUSH_WEBHOOK_SECRET,
		verifyUserJwt: async (jwt: string) => {
			const { data, error } = await supabaseAdmin.auth.getUser(jwt);
			if (error || !data?.user?.id) return null;
			return data.user.id;
		},
		getConversation: async (conversationId: string) => {
			const { data } = await supabaseAdmin
				.from("conversations")
				.select("id, type, title")
				.eq("id", conversationId)
				.maybeSingle();
			return (data as ConversationMeta | null) ?? null;
		},
		getSenderName: async (senderId: string) => {
			const { data } = await supabaseAdmin
				.from("profiles")
				.select("display_name, username")
				.eq("id", senderId)
				.maybeSingle();
			const profile = data as {
				display_name?: string | null;
				username?: string | null;
			} | null;
			return profile?.display_name || profile?.username || "User";
		},
		getRecipientTokens: async (
			conversationId: string,
			senderId: string,
		) => {
			const { data } = await supabaseAdmin
				.from("conversation_participants")
				.select("user_id, profiles:user_id ( expo_push_token )")
				.eq("conversation_id", conversationId)
				.neq("user_id", senderId);

			const rows = (data ?? []) as Array<{
				profiles?: { expo_push_token?: string | null } | null;
			}>;
			return rows.map((row) => row.profiles?.expo_push_token);
		},
		sendExpoPush: async (messages: ExpoPushMessage[]) => {
			const response = await fetch(
				"https://exp.host/--/api/v2/push/send",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					body: JSON.stringify(messages),
				},
			);
			return response.json();
		},
	});
});
