export interface PushNotificationData {
	type?: string;
	notificationId?: string;
	postId?: string;
	commentId?: string;
	conversationId?: string;
	username?: string;
	post_id?: string;
	comment_id?: string;
	conversation_id?: string;
	[key: string]: unknown;
}

export function resolveNotificationRoute(
	data: PushNotificationData | Record<string, unknown> | undefined | null,
): string | null {
	if (!data || typeof data !== "object") return null;

	const payload = data as PushNotificationData;
	const type = typeof payload.type === "string" ? payload.type.trim() : "";

	if (type === "comment" || type === "reply" || type === "mention") {
		const rawPostId = payload.postId ?? (payload as any).post_id;
		const postId = typeof rawPostId === "string" ? rawPostId.trim() : "";
		if (postId.length > 0) {
			const rawCommentId =
				payload.commentId ?? (payload as any).comment_id;
			const commentId =
				typeof rawCommentId === "string" ? rawCommentId.trim() : "";
			return commentId.length > 0
				? `/post/${postId}?commentId=${encodeURIComponent(commentId)}`
				: `/post/${postId}`;
		}
	}

	if (type === "message" || type === "chat_message") {
		const rawConversationId =
			payload.conversationId ?? (payload as any).conversation_id;
		const conversationId =
			typeof rawConversationId === "string"
				? rawConversationId.trim()
				: "";
		if (conversationId.length > 0) {
			return `/messages/${conversationId}`;
		}
	}

	if (type === "moderation") {
		return "/notifications";
	}

	if (type === "profile") {
		const rawUsername = payload.username ?? (payload as any).actor_username;
		const username =
			typeof rawUsername === "string" ? rawUsername.trim() : "";
		if (username.length > 0) {
			return `/u/${username}`;
		}
	}

	return null;
}
