import type { Profile } from "@/features/auth/types";
import { uploadToR2 } from "@/lib/r2-storage";
import { supabase } from "@/lib/supabase";

import type {
	ConversationParticipant,
	DirectConversationSummary,
	Message,
	SendMessagePayload,
} from "./types";
import { calculateUnreadCount, sortConversationsByLatest } from "./utils";

export async function fetchConversations(
	userId: string,
): Promise<DirectConversationSummary[]> {
	// 1. Fetch conversations that current user participates in
	const { data: myParticipations, error: partError } = await supabase
		.from("conversation_participants")
		.select(
			`
			conversation_id,
			last_read_at,
			role,
			is_pinned,
			conversations (
				id,
				type,
				title,
				avatar_url,
				created_by,
				updated_at
			)
		`,
		)
		.eq("user_id", userId);

	if (partError) throw partError;
	if (!myParticipations || myParticipations.length === 0) return [];

	const conversationIds = myParticipations.map((p) => p.conversation_id);

	// 2. Fetch all participants for these conversations with their profiles
	const { data: allParticipants, error: allPartError } = await supabase
		.from("conversation_participants")
		.select(
			`
			conversation_id,
			user_id,
			role,
			last_read_at,
			is_pinned,
			nickname,
			created_at,
			profiles:user_id (
				id,
				username,
				display_name,
				avatar_url,
				role,
				guild,
				show_active_status,
				last_seen_at
			)
		`,
		)
		.in("conversation_id", conversationIds);

	if (allPartError) throw allPartError;

	// 3. Fetch latest message for each conversation
	const { data: recentMessages, error: msgError } = await supabase
		.from("messages")
		.select(
			`
			id,
			conversation_id,
			sender_id,
			content,
			media_urls,
			shared_post_id,
			message_type,
			edited_at,
			is_pinned,
			pinned_by,
			unsent_at,
			created_at,
			sender:sender_id (
				id,
				username,
				display_name,
				avatar_url,
				guild
			)
		`,
		)
		.in("conversation_id", conversationIds)
		.order("created_at", { ascending: false });

	if (msgError) throw msgError;

	// Group participants by conversation
	const participantsByConv = new Map<string, ConversationParticipant[]>();
	(allParticipants || []).forEach((row: any) => {
		const list = participantsByConv.get(row.conversation_id) || [];
		list.push({
			conversation_id: row.conversation_id,
			user_id: row.user_id,
			role: row.role,
			last_read_at: row.last_read_at,
			is_pinned: Boolean(row.is_pinned),
			nickname: row.nickname ?? null,
			created_at: row.created_at,
			profile: row.profiles as Profile,
		});
		participantsByConv.set(row.conversation_id, list);
	});

	// Group messages by conversation
	const messagesByConv = new Map<string, Message[]>();
	(recentMessages || []).forEach((row: any) => {
		const list = messagesByConv.get(row.conversation_id) || [];
		list.push({
			id: row.id,
			conversation_id: row.conversation_id,
			sender_id: row.sender_id,
			content: row.content,
			media_urls: row.media_urls || [],
			shared_post_id: row.shared_post_id,
			message_type: row.message_type ?? "text",
			edited_at: row.edited_at ?? null,
			is_pinned: Boolean(row.is_pinned),
			pinned_by: row.pinned_by ?? null,
			unsent_at: row.unsent_at ?? null,
			created_at: row.created_at,
			sender: row.sender as Profile,
		});
		messagesByConv.set(row.conversation_id, list);
	});

	const summaries: DirectConversationSummary[] = [];

	for (const part of myParticipations) {
		const conv = part.conversations as any;
		if (!conv) continue;

		const convParticipants =
			participantsByConv.get(part.conversation_id) || [];
		const otherParticipant =
			convParticipants.find((p) => p.user_id !== userId)?.profile || null;
		const convMessages = messagesByConv.get(part.conversation_id) || [];
		const lastMessage = convMessages[0] || null;

		const unreadCount = calculateUnreadCount(
			convMessages,
			part.last_read_at,
			userId,
		);

		summaries.push({
			id: conv.id,
			type: conv.type,
			title: conv.title,
			avatar_url: conv.avatar_url,
			updated_at: conv.updated_at,
			is_pinned: Boolean(part.is_pinned),
			last_message: lastMessage,
			unread_count: unreadCount,
			other_participant: otherParticipant,
			participants: convParticipants,
		});
	}

	return sortConversationsByLatest(summaries);
}

export async function getOrCreateDirectConversation(
	targetUserId: string,
): Promise<string> {
	const { data, error } = await supabase.rpc(
		"get_or_create_direct_conversation",
		{
			target_user_id: targetUserId,
		},
	);

	if (error) throw error;
	return data as string;
}

export async function createGroupConversation(
	title: string,
	participantIds: string[],
): Promise<string> {
	const { data, error } = await supabase.rpc("create_group_conversation", {
		p_title: title,
		p_participant_ids: participantIds,
	});

	if (error) throw error;
	return data as string;
}

export async function fetchMessages(
	conversationId: string,
	limit = 50,
	before?: string,
): Promise<Message[]> {
	let query = supabase
		.from("messages")
		.select(
			`
			id,
			conversation_id,
			sender_id,
			content,
			media_urls,
			shared_post_id,
			message_type,
			edited_at,
			is_pinned,
			pinned_by,
			unsent_at,
			created_at,
			sender:sender_id (
				id,
				username,
				display_name,
				avatar_url,
				guild
			),
			shared_post:shared_post_id (
				id,
				title,
				content,
				post_type,
				guild,
				event_date,
				event_location,
				created_at,
				author:author_id (
					id,
					username,
					display_name,
					avatar_url,
					guild
				)
			)
		`,
		)
		.eq("conversation_id", conversationId)
		.order("created_at", { ascending: false })
		.limit(limit);

	if (before) {
		query = query.lt("created_at", before);
	}

	const { data, error } = await query;
	if (error) throw error;

	return (data || []).map((row: any) => {
		const rawSender = Array.isArray(row.sender)
			? row.sender[0]
			: row.sender;
		const rawPost = Array.isArray(row.shared_post)
			? row.shared_post[0]
			: row.shared_post;

		return {
			id: row.id,
			conversation_id: row.conversation_id,
			sender_id: row.sender_id,
			content: row.content,
			media_urls: row.media_urls || [],
			shared_post_id: row.shared_post_id,
			message_type: row.message_type ?? "text",
			edited_at: row.edited_at ?? null,
			is_pinned: Boolean(row.is_pinned),
			pinned_by: row.pinned_by ?? null,
			unsent_at: row.unsent_at ?? null,
			created_at: row.created_at,
			sender: rawSender as unknown as Profile,
			shared_post: rawPost as unknown as Message["shared_post"],
		};
	});
}

export async function sendMessage(
	conversationId: string,
	senderId: string,
	payload: SendMessagePayload,
): Promise<Message> {
	const { data, error } = await supabase
		.from("messages")
		.insert({
			conversation_id: conversationId,
			sender_id: senderId,
			content: payload.content?.trim() || null,
			media_urls: payload.mediaUrls || [],
			shared_post_id: payload.sharedPostId || null,
			message_type: payload.messageType || "text",
		})
		.select(
			`
			id,
			conversation_id,
			sender_id,
			content,
			media_urls,
			shared_post_id,
			message_type,
			edited_at,
			is_pinned,
			pinned_by,
			unsent_at,
			created_at,
			sender:sender_id (
				id,
				username,
				display_name,
				avatar_url,
				guild
			),
			shared_post:shared_post_id (
				id,
				title,
				content,
				post_type,
				guild,
				event_date,
				event_location,
				created_at,
				author:author_id (
					id,
					username,
					display_name,
					avatar_url,
					guild
				)
			)
		`,
		)
		.single();

	if (error) throw error;

	const rawSender = Array.isArray(data.sender) ? data.sender[0] : data.sender;
	const rawPost = Array.isArray(data.shared_post)
		? data.shared_post[0]
		: data.shared_post;

	return {
		id: data.id,
		conversation_id: data.conversation_id,
		sender_id: data.sender_id,
		content: data.content,
		media_urls: data.media_urls || [],
		shared_post_id: data.shared_post_id,
		message_type: data.message_type ?? "text",
		created_at: data.created_at,
		sender: rawSender as unknown as Profile,
		shared_post: rawPost as unknown as Message["shared_post"],
	};
}

export async function markConversationRead(
	conversationId: string,
	userId: string,
): Promise<void> {
	const { error } = await supabase
		.from("conversation_participants")
		.update({ last_read_at: new Date().toISOString() })
		.eq("conversation_id", conversationId)
		.eq("user_id", userId);

	if (error) throw error;
}

export async function uploadChatMedia(
	userId: string,
	binaryData: ArrayBuffer | Uint8Array,
	extension = "jpg",
	contentType = "image/jpeg",
): Promise<string> {
	const filePath = `${userId}/chat/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${extension}`;
	const { publicUrl } = await uploadToR2(
		"post-media",
		filePath,
		binaryData,
		contentType,
	);
	if (!publicUrl) {
		throw new Error("Chat media upload did not return a public URL");
	}
	return publicUrl;
}

export async function uploadChatMediaFromUri(
	userId: string,
	uri: string,
): Promise<string> {
	const cleanUri = uri.split("?")[0] ?? uri;
	const extCandidate = cleanUri.includes(".")
		? cleanUri.split(".").pop()?.toLowerCase()
		: null;
	const extension =
		extCandidate && extCandidate.length <= 5 ? extCandidate : "jpg";
	const contentType =
		extension === "png"
			? "image/png"
			: extension === "webp"
				? "image/webp"
				: "image/jpeg";

	const response = await fetch(uri);
	const binaryData = await response.arrayBuffer();
	return uploadChatMedia(userId, binaryData, extension, contentType);
}

export async function togglePinConversation(
	conversationId: string,
	userId: string,
	isPinned: boolean,
): Promise<void> {
	const { error } = await supabase
		.from("conversation_participants")
		.update({ is_pinned: isPinned })
		.eq("conversation_id", conversationId)
		.eq("user_id", userId);

	if (error) throw error;
}

export async function deleteOrLeaveConversation(
	conversationId: string,
): Promise<void> {
	const { error } = await supabase.rpc("delete_or_leave_conversation", {
		target_conversation_id: conversationId,
	});

	if (error) throw error;
}

export async function updateConversationTitle(
	conversationId: string,
	title: string | null,
): Promise<void> {
	const trimmed = title?.trim() || null;
	const { error } = await supabase
		.from("conversations")
		.update({ title: trimmed })
		.eq("id", conversationId);

	if (error) throw error;
}

export async function setParticipantNickname(
	conversationId: string,
	targetUserId: string,
	nickname: string | null,
): Promise<void> {
	const trimmed = nickname?.trim() || null;
	const { error } = await supabase
		.from("conversation_participants")
		.update({ nickname: trimmed })
		.eq("conversation_id", conversationId)
		.eq("user_id", targetUserId);

	if (error) throw error;
}

export async function editMessage(
	messageId: string,
	content: string,
): Promise<Message> {
	const trimmed = content.trim();
	if (!trimmed) {
		throw new Error("Message content cannot be empty");
	}
	const { data, error } = await supabase
		.from("messages")
		.update({
			content: trimmed,
			edited_at: new Date().toISOString(),
		})
		.eq("id", messageId)
		.select()
		.single();

	if (error) throw error;
	return {
		...data,
		media_urls: data.media_urls || [],
	} as Message;
}

export async function togglePinMessage(
	messageId: string,
	isPinned: boolean,
	userId: string,
): Promise<void> {
	const { error } = await supabase
		.from("messages")
		.update({
			is_pinned: isPinned,
			pinned_by: isPinned ? userId : null,
		})
		.eq("id", messageId);

	if (error) throw error;
}

export async function unsendMessage(messageId: string): Promise<Message> {
	const { data, error } = await supabase
		.from("messages")
		.update({
			content: null,
			media_urls: [],
			shared_post_id: null,
			is_pinned: false,
			pinned_by: null,
			unsent_at: new Date().toISOString(),
		})
		.eq("id", messageId)
		.select()
		.single();

	if (error) throw error;
	return {
		...data,
		media_urls: [],
	} as Message;
}

export async function sendSystemMessage(
	conversationId: string,
	senderId: string,
	content: string,
): Promise<Message> {
	return sendMessage(conversationId, senderId, {
		content,
		messageType: "system",
	});
}

export async function addGroupMember(
	conversationId: string,
	targetUserId: string,
): Promise<ConversationParticipant> {
	const { data, error } = await supabase
		.from("conversation_participants")
		.insert({
			conversation_id: conversationId,
			user_id: targetUserId,
			role: "member",
		})
		.select(
			`
			conversation_id,
			user_id,
			role,
			last_read_at,
			is_pinned,
			nickname,
			created_at,
			profiles:user_id (
				id,
				username,
				display_name,
				avatar_url,
				role,
				guild,
				show_active_status,
				last_seen_at
			)
		`,
		)
		.single();

	if (error) throw error;
	return {
		conversation_id: data.conversation_id,
		user_id: data.user_id,
		role: data.role,
		last_read_at: data.last_read_at,
		is_pinned: Boolean(data.is_pinned),
		nickname: data.nickname ?? null,
		created_at: data.created_at,
		profile: data.profiles as unknown as Profile,
	};
}

export async function removeGroupMember(
	conversationId: string,
	targetUserId: string,
): Promise<void> {
	const { error } = await supabase
		.from("conversation_participants")
		.delete()
		.eq("conversation_id", conversationId)
		.eq("user_id", targetUserId);

	if (error) throw error;
}
