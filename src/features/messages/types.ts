import type { Profile } from "@/features/auth/types";
import type { Post } from "@/features/posts/types";

export type ConversationType = "direct" | "group";
export type ParticipantRole = "admin" | "member";

export interface Conversation {
	id: string;
	type: ConversationType;
	title: string | null;
	avatar_url: string | null;
	created_by: string | null;
	created_at: string;
	updated_at: string;
}

export interface ConversationParticipant {
	conversation_id: string;
	user_id: string;
	role: ParticipantRole;
	is_pinned?: boolean;
	nickname?: string | null;
	last_read_at: string;
	created_at: string;
	profile?: Profile;
}

export type MessageType = "text" | "system";

export interface MessageAttachment {
	url: string;
	type: "image";
	width?: number;
	height?: number;
	size?: number;
}

export interface MessageReplyPreview {
	id: string;
	sender_id: string;
	sender_name?: string;
	content: string | null;
	has_media?: boolean;
}

export interface Message {
	id: string;
	conversation_id: string;
	sender_id: string;
	content: string | null;
	media_urls: string[];
	attachments?: MessageAttachment[] | null;
	shared_post_id: string | null;
	reply_to_id?: string | null;
	reply_to?: MessageReplyPreview | null;
	reactions?: Record<string, string[]>;
	message_type?: MessageType;
	edited_at?: string | null;
	is_pinned?: boolean;
	pinned_by?: string | null;
	unsent_at?: string | null;
	created_at: string;
	sender?: Profile;
	shared_post?: Post;
}

export type OptimisticMessageStatus = "sending" | "sent" | "failed";

export interface OptimisticMessage extends Message {
	status: OptimisticMessageStatus;
	tempId?: string;
	errorMessage?: string;
}

export interface DirectConversationSummary {
	id: string;
	type: ConversationType;
	title: string | null;
	avatar_url: string | null;
	created_by?: string | null;
	is_pinned?: boolean;
	updated_at: string;
	last_message: Message | null;
	unread_count: number;
	other_participant: Profile | null;
	participants: ConversationParticipant[];
}

export interface SendMessagePayload {
	content?: string;
	mediaUrls?: string[];
	attachments?: MessageAttachment[];
	sharedPostId?: string;
	replyToId?: string | null;
	messageType?: MessageType;
}
