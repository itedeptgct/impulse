import type {
	ConversationType,
	DirectConversationSummary,
	Message,
	SendMessagePayload,
} from "./types";

let counter = 0;

export function generateOptimisticMessageId(): string {
	counter = (counter + 1) % 100000;
	return `temp-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 7)}`;
}

export function calculateUnreadCount(
	messages: Array<{ id: string; created_at: string; sender_id: string }>,
	lastReadAt: string | null | undefined,
	currentUserId: string,
): number {
	if (!lastReadAt) {
		return messages.filter((m) => m.sender_id !== currentUserId).length;
	}

	const lastReadTime = new Date(lastReadAt).getTime();
	return messages.filter(
		(m) =>
			m.sender_id !== currentUserId &&
			new Date(m.created_at).getTime() > lastReadTime,
	).length;
}

export function sortConversationsByLatest<
	T extends { updated_at: string; is_pinned?: boolean } =
		DirectConversationSummary,
>(conversations: T[]): T[] {
	return [...conversations].sort((a, b) => {
		const pinA = a.is_pinned ? 1 : 0;
		const pinB = b.is_pinned ? 1 : 0;
		if (pinA !== pinB) return pinB - pinA;
		const timeA = new Date(a.updated_at).getTime();
		const timeB = new Date(b.updated_at).getTime();
		return timeB - timeA;
	});
}

export function getParticipantDisplayName(
	participants: DirectConversationSummary["participants"],
	userId: string,
	fallback?: {
		display_name?: string | null;
		username?: string | null;
	} | null,
): string {
	const match = participants.find((p) => p.user_id === userId);
	if (match?.nickname && match.nickname.trim().length > 0) {
		return match.nickname.trim();
	}
	return (
		match?.profile?.display_name ||
		match?.profile?.username ||
		fallback?.display_name ||
		fallback?.username ||
		"User"
	);
}

export function formatConversationTitle(
	conversation: Pick<
		DirectConversationSummary,
		"type" | "title" | "other_participant" | "participants"
	>,
): string {
	if (conversation.type === "group") {
		if (conversation.title && conversation.title.trim().length > 0) {
			return conversation.title.trim();
		}
		return "Group Chat";
	}

	if (conversation.other_participant) {
		return getParticipantDisplayName(
			conversation.participants,
			conversation.other_participant.id,
			conversation.other_participant,
		);
	}

	return "User";
}

export function isMediaOnlyMessage(
	message: Pick<
		Message,
		"content" | "media_urls" | "shared_post_id" | "unsent_at"
	>,
): boolean {
	if (message.unsent_at) return false;
	const hasMedia =
		Array.isArray(message.media_urls) && message.media_urls.length > 0;
	const hasText = Boolean(
		message.content && message.content.trim().length > 0,
	);
	const hasPost = Boolean(message.shared_post_id);
	return hasMedia && !hasText && !hasPost;
}

export function formatConversationSnippet(
	message: Message | null,
	currentUserId: string,
	conversationType: ConversationType,
): string {
	if (!message) return "No messages yet";

	const isOwn = message.sender_id === currentUserId;
	const senderFirstName =
		message.sender?.display_name?.split(" ")[0] ||
		message.sender?.username ||
		"User";

	if (message.unsent_at) {
		const actor =
			message.sender?.display_name || message.sender?.username || "User";
		return `${actor} unsent a message`;
	}

	if (message.message_type === "system") {
		return message.content?.trim() || "Conversation updated";
	}

	const prefix = isOwn
		? "You: "
		: conversationType === "group"
			? `${senderFirstName}: `
			: "";

	if (message.content && message.content.trim().length > 0) {
		return `${prefix}${message.content.trim()}`;
	}
	if (message.shared_post_id) {
		return `${prefix}Shared a transmission`;
	}
	if (message.media_urls && message.media_urls.length > 0) {
		return `${prefix}Sent an attachment`;
	}
	return "New message";
}

export function formatShortTimestamp(
	isoString: string,
	now: Date = new Date(),
): string {
	const diffMs = now.getTime() - new Date(isoString).getTime();
	if (!Number.isFinite(diffMs) || diffMs < 60_000) return "now";

	const diffMinutes = Math.floor(diffMs / 60_000);
	if (diffMinutes < 60) return `${diffMinutes}m`;

	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) return `${diffHours}h`;

	const diffDays = Math.floor(diffHours / 24);
	return `${diffDays}d`;
}

export function formatMessageTime(isoString: string): string {
	const d = new Date(isoString);
	if (Number.isNaN(d.getTime())) return "";
	return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function shouldShowSenderHeader(
	conversationType: ConversationType,
	isOwnMessage: boolean,
	senderId: string,
	previousSenderId?: string | null,
): boolean {
	if (conversationType !== "group" || isOwnMessage) return false;
	return senderId !== previousSenderId;
}

export function canCreateGroupChat(
	title: string,
	selectedParticipantIds: string[],
): boolean {
	return title.trim().length > 0 && selectedParticipantIds.length >= 2;
}

export function buildSharedPostMessagePayload(
	postId: string,
): SendMessagePayload {
	return { sharedPostId: postId };
}

export function isMessageSeenByOthers(
	messageCreatedAt: string,
	senderId: string,
	participants?: { user_id: string; last_read_at: string }[],
): boolean {
	if (!participants || participants.length === 0) return false;
	const msgTime = Date.parse(messageCreatedAt);
	if (Number.isNaN(msgTime)) return false;

	return participants.some((p) => {
		if (p.user_id === senderId || !p.last_read_at) return false;
		const readTime = Date.parse(p.last_read_at);
		return !Number.isNaN(readTime) && readTime >= msgTime;
	});
}
