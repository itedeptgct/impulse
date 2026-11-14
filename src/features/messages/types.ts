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

export interface Message {
	id: string;
	conversation_id: string;
	sender_id: string;
	content: string | null;
	media_urls: string[];
	shared_post_id: string | null;
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
	sharedPostId?: string;
	messageType?: MessageType;
}
