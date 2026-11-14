export type NotificationType = "comment" | "reply" | "mention" | "message";

export interface NotificationActor {
	id: string;
	username: string;
	display_name: string | null;
	avatar_url: string | null;
	guild: string | null;
}

export interface NotificationItem {
	id: string;
	recipient_id: string;
	actor_id: string | null;
	type: NotificationType;
	title: string;
	body: string;
	post_id: string | null;
	comment_id: string | null;
	conversation_id: string | null;
	profile_id: string | null;
	data: Record<string, unknown>;
	read_at: string | null;
	created_at: string;
	actor?: NotificationActor | null;
}

export interface NotificationPreferences {
	user_id: string;
	comments_enabled: boolean;
	replies_enabled: boolean;
	mentions_enabled: boolean;
	messages_enabled: boolean;
	push_enabled: boolean;
	updated_at: string;
}

export type NotificationPreferencesPatch = Partial<
	Omit<NotificationPreferences, "user_id" | "updated_at">
>;

export interface FetchNotificationsOptions {
	limit?: number;
	cursor?: string;
}
