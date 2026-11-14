import { create } from "zustand";

import type {
	ConversationParticipant,
	DirectConversationSummary,
	Message,
	OptimisticMessage,
	OptimisticMessageStatus,
} from "./types";
import { sortConversationsByLatest } from "./utils";

interface MessagesState {
	conversations: DirectConversationSummary[];
	activeMessages: Record<string, OptimisticMessage[]>;
	isLoadingConversations: boolean;
	isLoadingMessages: boolean;
	error: string | null;

	// Actions
	setConversations: (conversations: DirectConversationSummary[]) => void;
	upsertConversation: (conversation: DirectConversationSummary) => void;
	setMessages: (
		conversationId: string,
		messages: OptimisticMessage[],
	) => void;
	addOptimisticMessage: (
		conversationId: string,
		message: OptimisticMessage,
	) => void;
	resolveOptimisticMessage: (
		conversationId: string,
		tempId: string,
		status: OptimisticMessageStatus,
		confirmedMessage?: Message,
		errorMessage?: string,
	) => void;
	receiveRealtimeMessage: (message: Message, currentUserId: string) => void;
	handleRealtimeMessageUpdate: (message: Message) => void;
	updateMessageInThread: (
		conversationId: string,
		messageId: string,
		updater: (msg: OptimisticMessage) => OptimisticMessage,
	) => void;
	togglePinConversationLocally: (
		conversationId: string,
		isPinned: boolean,
	) => void;
	removeConversationLocally: (conversationId: string) => void;
	updateParticipantNicknameLocally: (
		conversationId: string,
		targetUserId: string,
		nickname: string | null,
	) => void;
	updateConversationTitleLocally: (
		conversationId: string,
		title: string | null,
	) => void;
	updateParticipantLastReadLocally: (
		conversationId: string,
		targetUserId: string,
		lastReadAt: string,
	) => void;
	addParticipantLocally: (
		conversationId: string,
		participant: ConversationParticipant,
	) => void;
	removeParticipantLocally: (
		conversationId: string,
		targetUserId: string,
	) => void;
	markReadLocally: (conversationId: string) => void;
	getTotalUnreadCount: () => number;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
	conversations: [],
	activeMessages: {},
	isLoadingConversations: false,
	isLoadingMessages: false,
	error: null,

	setConversations: (conversations) => {
		set({ conversations: sortConversationsByLatest(conversations) });
	},

	upsertConversation: (conversation) => {
		set((state) => {
			const existingIndex = state.conversations.findIndex(
				(c) => c.id === conversation.id,
			);
			let updated: DirectConversationSummary[];
			if (existingIndex >= 0) {
				updated = [...state.conversations];
				updated[existingIndex] = conversation;
			} else {
				updated = [conversation, ...state.conversations];
			}
			return { conversations: sortConversationsByLatest(updated) };
		});
	},

	setMessages: (conversationId, messages) => {
		set((state) => ({
			activeMessages: {
				...state.activeMessages,
				[conversationId]: messages,
			},
		}));
	},

	addOptimisticMessage: (conversationId, message) => {
		set((state) => {
			const existing = state.activeMessages[conversationId] || [];
			return {
				activeMessages: {
					...state.activeMessages,
					[conversationId]: [message, ...existing],
				},
			};
		});
	},

	resolveOptimisticMessage: (
		conversationId,
		tempId,
		status,
		confirmedMessage,
		errorMessage,
	) => {
		set((state) => {
			const existing = state.activeMessages[conversationId] || [];
			const updated = existing.map((msg) => {
				if (msg.tempId === tempId || msg.id === tempId) {
					if (confirmedMessage) {
						return { ...confirmedMessage, status: "sent" as const };
					}
					return {
						...msg,
						status,
						errorMessage,
					};
				}
				return msg;
			});

			return {
				activeMessages: {
					...state.activeMessages,
					[conversationId]: updated,
				},
			};
		});
	},

	receiveRealtimeMessage: (message, currentUserId) => {
		set((state) => {
			const conversationId = message.conversation_id;
			const existingMsgs = state.activeMessages[conversationId] || [];

			// Avoid duplicate message injection
			const alreadyExists = existingMsgs.some(
				(m) =>
					m.id === message.id ||
					(m.status === "sending" &&
						m.content === message.content &&
						m.sender_id === message.sender_id),
			);

			const updatedMsgs = alreadyExists
				? existingMsgs.map((m) =>
						m.id === message.id
							? { ...message, status: "sent" as const }
							: m,
					)
				: [{ ...message, status: "sent" as const }, ...existingMsgs];

			// Update conversation snippet and unread counter in inbox
			const isFromOther = message.sender_id !== currentUserId;
			const updatedConvs = state.conversations.map((c) => {
				if (c.id === conversationId) {
					return {
						...c,
						last_message: message,
						updated_at: message.created_at,
						unread_count: isFromOther
							? c.unread_count + 1
							: c.unread_count,
					};
				}
				return c;
			});

			return {
				activeMessages: {
					...state.activeMessages,
					[conversationId]: updatedMsgs,
				},
				conversations: sortConversationsByLatest(updatedConvs),
			};
		});
	},

	markReadLocally: (conversationId) => {
		set((state) => ({
			conversations: state.conversations.map((c) =>
				c.id === conversationId ? { ...c, unread_count: 0 } : c,
			),
		}));
	},

	handleRealtimeMessageUpdate: (message) => {
		set((state) => {
			const conversationId = message.conversation_id;
			const existingMsgs = state.activeMessages[conversationId] || [];
			const updatedMsgs = existingMsgs.map((m) =>
				m.id === message.id
					? {
							...m,
							content: message.content,
							media_urls: message.media_urls || [],
							shared_post_id: message.shared_post_id,
							edited_at: message.edited_at ?? null,
							is_pinned: Boolean(message.is_pinned),
							pinned_by: message.pinned_by ?? null,
							unsent_at: message.unsent_at ?? null,
							...(message.unsent_at
								? { shared_post: undefined }
								: {}),
						}
					: m,
			);

			const updatedConvs = state.conversations.map((c) => {
				if (
					c.id === conversationId &&
					c.last_message?.id === message.id
				) {
					return {
						...c,
						last_message: {
							...c.last_message,
							content: message.content,
							media_urls: message.media_urls || [],
							shared_post_id: message.shared_post_id,
							edited_at: message.edited_at ?? null,
							is_pinned: Boolean(message.is_pinned),
							pinned_by: message.pinned_by ?? null,
							unsent_at: message.unsent_at ?? null,
						},
					};
				}
				return c;
			});

			return {
				activeMessages: {
					...state.activeMessages,
					[conversationId]: updatedMsgs,
				},
				conversations: updatedConvs,
			};
		});
	},

	updateMessageInThread: (conversationId, messageId, updater) => {
		set((state) => {
			const existingMsgs = state.activeMessages[conversationId] || [];
			let updatedTarget: OptimisticMessage | null = null;
			const updatedMsgs = existingMsgs.map((m) => {
				if (m.id === messageId) {
					updatedTarget = updater(m);
					return updatedTarget;
				}
				return m;
			});

			const updatedConvs = state.conversations.map((c) => {
				if (
					c.id === conversationId &&
					c.last_message?.id === messageId &&
					updatedTarget
				) {
					return {
						...c,
						last_message: updatedTarget,
					};
				}
				return c;
			});

			return {
				activeMessages: {
					...state.activeMessages,
					[conversationId]: updatedMsgs,
				},
				conversations: updatedConvs,
			};
		});
	},

	togglePinConversationLocally: (conversationId, isPinned) => {
		set((state) => ({
			conversations: sortConversationsByLatest(
				state.conversations.map((c) =>
					c.id === conversationId ? { ...c, is_pinned: isPinned } : c,
				),
			),
		}));
	},

	removeConversationLocally: (conversationId) => {
		set((state) => {
			const { [conversationId]: _removed, ...restMessages } =
				state.activeMessages;
			return {
				conversations: state.conversations.filter(
					(c) => c.id !== conversationId,
				),
				activeMessages: restMessages,
			};
		});
	},

	updateParticipantNicknameLocally: (
		conversationId,
		targetUserId,
		nickname,
	) => {
		set((state) => ({
			conversations: state.conversations.map((c) => {
				if (c.id !== conversationId) return c;
				return {
					...c,
					participants: c.participants.map((p) =>
						p.user_id === targetUserId ? { ...p, nickname } : p,
					),
				};
			}),
		}));
	},

	updateConversationTitleLocally: (conversationId, title) => {
		set((state) => ({
			conversations: state.conversations.map((c) =>
				c.id === conversationId ? { ...c, title } : c,
			),
		}));
	},

	updateParticipantLastReadLocally: (
		conversationId,
		targetUserId,
		lastReadAt,
	) => {
		set((state) => ({
			conversations: state.conversations.map((c) => {
				if (c.id !== conversationId) return c;
				return {
					...c,
					participants: c.participants.map((p) =>
						p.user_id === targetUserId
							? { ...p, last_read_at: lastReadAt }
							: p,
					),
				};
			}),
		}));
	},

	addParticipantLocally: (conversationId, participant) => {
		set((state) => ({
			conversations: state.conversations.map((c) => {
				if (c.id !== conversationId) return c;
				if (
					c.participants.some(
						(p) => p.user_id === participant.user_id,
					)
				) {
					return c;
				}
				return {
					...c,
					participants: [...c.participants, participant],
				};
			}),
		}));
	},

	removeParticipantLocally: (conversationId, targetUserId) => {
		set((state) => ({
			conversations: state.conversations.map((c) => {
				if (c.id !== conversationId) return c;
				return {
					...c,
					participants: c.participants.filter(
						(p) => p.user_id !== targetUserId,
					),
				};
			}),
		}));
	},

	getTotalUnreadCount: () => {
		const state = get();
		return state.conversations.reduce(
			(sum, conv) => sum + (conv.unread_count || 0),
			0,
		);
	},
}));
