import { isSupabaseConfigured, supabase } from "@/lib/supabase";

import type {
	FetchNotificationsOptions,
	NotificationActor,
	NotificationItem,
	NotificationPreferences,
	NotificationPreferencesPatch,
	NotificationType,
} from "./types";

export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<
	NotificationPreferences,
	"user_id" | "updated_at"
> = {
	comments_enabled: true,
	replies_enabled: true,
	mentions_enabled: true,
	messages_enabled: true,
	push_enabled: true,
};

export async function fetchNotifications(
	userId: string,
	options?: FetchNotificationsOptions,
): Promise<NotificationItem[]> {
	if (!isSupabaseConfigured || !userId) return [];

	const limit = options?.limit ?? 25;
	let query = supabase
		.from("notifications")
		.select(
			`
			id,
			recipient_id,
			actor_id,
			type,
			title,
			body,
			post_id,
			comment_id,
			conversation_id,
			profile_id,
			data,
			read_at,
			created_at,
			actor:actor_id (
				id,
				username,
				display_name,
				avatar_url,
				guild
			)
		`,
		)
		.eq("recipient_id", userId)
		.order("created_at", { ascending: false })
		.limit(limit);

	if (options?.cursor) {
		query = query.lt("created_at", options.cursor);
	}

	const { data, error } = await query;
	if (error) throw error;
	if (!data) return [];

	return (data as Array<Record<string, unknown>>).map((row) => {
		const rawActor = Array.isArray(row.actor)
			? (row.actor[0] as Record<string, unknown> | undefined)
			: (row.actor as Record<string, unknown> | undefined);

		let actor: NotificationActor | null = null;
		if (rawActor && typeof rawActor.id === "string") {
			actor = {
				id: rawActor.id,
				username: (rawActor.username as string) ?? "",
				display_name: (rawActor.display_name as string | null) ?? null,
				avatar_url: (rawActor.avatar_url as string | null) ?? null,
				guild: (rawActor.guild as string | null) ?? null,
			};
		}

		return {
			id: row.id as string,
			recipient_id: row.recipient_id as string,
			actor_id: (row.actor_id as string | null) ?? null,
			type: row.type as NotificationType,
			title: (row.title as string) ?? "",
			body: (row.body as string) ?? "",
			post_id: (row.post_id as string | null) ?? null,
			comment_id: (row.comment_id as string | null) ?? null,
			conversation_id: (row.conversation_id as string | null) ?? null,
			profile_id: (row.profile_id as string | null) ?? null,
			data: (row.data as Record<string, unknown>) ?? {},
			read_at: (row.read_at as string | null) ?? null,
			created_at: (row.created_at as string) ?? new Date().toISOString(),
			actor,
		};
	});
}

export async function fetchUnreadNotificationCount(
	userId: string,
): Promise<number> {
	if (!isSupabaseConfigured || !userId) return 0;

	const { count, error } = await supabase
		.from("notifications")
		.select("id", { count: "exact", head: true })
		.eq("recipient_id", userId)
		.is("read_at", null);

	if (error) throw error;
	return count ?? 0;
}

export async function markNotificationRead(
	notificationId: string,
): Promise<void> {
	if (!isSupabaseConfigured || !notificationId) return;

	const { error } = await supabase
		.from("notifications")
		.update({ read_at: new Date().toISOString() })
		.eq("id", notificationId)
		.is("read_at", null);

	if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
	if (!isSupabaseConfigured || !userId) return;

	const { error } = await supabase
		.from("notifications")
		.update({ read_at: new Date().toISOString() })
		.eq("recipient_id", userId)
		.is("read_at", null);

	if (error) throw error;
}

export async function fetchNotificationPreferences(
	userId: string,
): Promise<NotificationPreferences> {
	if (!isSupabaseConfigured || !userId) {
		return {
			user_id: userId,
			...DEFAULT_NOTIFICATION_PREFERENCES,
			updated_at: new Date().toISOString(),
		};
	}

	const { data, error } = await supabase
		.from("notification_preferences")
		.select(
			"user_id, comments_enabled, replies_enabled, mentions_enabled, messages_enabled, push_enabled, updated_at",
		)
		.eq("user_id", userId)
		.maybeSingle();

	if (error) throw error;

	if (data) {
		return data as NotificationPreferences;
	}

	return {
		user_id: userId,
		...DEFAULT_NOTIFICATION_PREFERENCES,
		updated_at: new Date().toISOString(),
	};
}

export async function updateNotificationPreferences(
	userId: string,
	patch: NotificationPreferencesPatch,
): Promise<NotificationPreferences> {
	if (!isSupabaseConfigured || !userId) {
		return {
			user_id: userId,
			...DEFAULT_NOTIFICATION_PREFERENCES,
			...patch,
			updated_at: new Date().toISOString(),
		};
	}

	const current = await fetchNotificationPreferences(userId);
	const merged = {
		user_id: userId,
		comments_enabled: patch.comments_enabled ?? current.comments_enabled,
		replies_enabled: patch.replies_enabled ?? current.replies_enabled,
		mentions_enabled: patch.mentions_enabled ?? current.mentions_enabled,
		messages_enabled: patch.messages_enabled ?? current.messages_enabled,
		push_enabled: patch.push_enabled ?? current.push_enabled,
		updated_at: new Date().toISOString(),
	};

	const { data, error } = await supabase
		.from("notification_preferences")
		.upsert(merged, { onConflict: "user_id" })
		.select(
			"user_id, comments_enabled, replies_enabled, mentions_enabled, messages_enabled, push_enabled, updated_at",
		)
		.single();

	if (error) throw error;
	return data as NotificationPreferences;
}
