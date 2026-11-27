import { useAuthStore } from "@auth/store";
import { Image as ExpoImage } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
	ArrowDown,
	ArrowLeft,
	Edit3,
	Pin,
	Reply,
	Search,
	Settings,
	Trash2,
	Users,
	X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MobileSheet, NeoButton, NetworkErrorCard } from "@/components/ui";
import {
	applyReactionToggle,
	editMessage,
	fetchConversations,
	fetchMessages,
	markConversationRead,
	sendBatchImageMessage,
	sendMessage,
	toggleMessageReaction,
	togglePinMessage,
	unsendMessage,
	uploadChatMediaFromUri,
} from "@/features/messages/api";
import {
	ChatComposer,
	type ChatReplyTarget,
	type SelectedChatImage,
} from "@/features/messages/components/ChatComposer";
import { ConversationSettingsSheet } from "@/features/messages/components/ConversationSettingsSheet";
import { MessageBubble } from "@/features/messages/components/MessageBubble";
import { useMessagesStore } from "@/features/messages/store";
import type { OptimisticMessage } from "@/features/messages/types";
import {
	formatConversationTitle,
	generateOptimisticMessageId,
} from "@/features/messages/utils";
import { PostMediaLightboxModal } from "@/features/posts/components/PostMediaLightboxModal";
import { ActiveDot, usePresenceStore } from "@/features/presence";
import {
	validateBatchFileSizes,
	validateUploadFileSize,
} from "@/lib/media-validation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

const EMPTY_MESSAGES: OptimisticMessage[] = [];

export default function ChatThreadScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const conversationId = Array.isArray(id) ? id[0] : id;

	const insets = useSafeAreaInsets();
	const userId = useAuthStore((s) => s.user?.id);
	const profile = useAuthStore((s) => s.profile);

	const conversations = useMessagesStore((s) => s.conversations);
	const setConversations = useMessagesStore((s) => s.setConversations);
	const messages = useMessagesStore(
		(s) =>
			(conversationId ? s.activeMessages[conversationId] : undefined) ??
			EMPTY_MESSAGES,
	);
	const setMessages = useMessagesStore((s) => s.setMessages);
	const addOptimisticMessage = useMessagesStore(
		(s) => s.addOptimisticMessage,
	);
	const resolveOptimisticMessage = useMessagesStore(
		(s) => s.resolveOptimisticMessage,
	);
	const receiveRealtimeMessage = useMessagesStore(
		(s) => s.receiveRealtimeMessage,
	);
	const handleRealtimeMessageUpdate = useMessagesStore(
		(s) => s.handleRealtimeMessageUpdate,
	);
	const updateMessageInThread = useMessagesStore(
		(s) => s.updateMessageInThread,
	);
	const updateParticipantLastReadLocally = useMessagesStore(
		(s) => s.updateParticipantLastReadLocally,
	);
	const markReadLocally = useMessagesStore((s) => s.markReadLocally);

	const isUserOnline = usePresenceStore((s) => s.isUserOnline);
	const getLastSeenText = usePresenceStore((s) => s.getLastSeenText);

	const flatListRef = useRef<FlatList<OptimisticMessage>>(null);
	const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

	const [isLoading, setIsLoading] = useState(
		Boolean(conversationId && userId),
	);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [searchVisible, setSearchVisible] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [selectedMessage, setSelectedMessage] =
		useState<OptimisticMessage | null>(null);
	const [messageActionsOpen, setMessageActionsOpen] = useState(false);
	const [editSheetOpen, setEditSheetOpen] = useState(false);
	const [editDraft, setEditDraft] = useState("");
	const [isSavingEdit, setIsSavingEdit] = useState(false);
	const [lightboxState, setLightboxState] = useState<{
		urls: string[];
		index: number;
	} | null>(null);
	const [replyingTo, setReplyingTo] = useState<ChatReplyTarget | null>(null);
	const [typingUsers, setTypingUsers] = useState<
		Record<string, { name: string; expiresAt: number }>
	>({});
	const [isScrolledUp, setIsScrolledUp] = useState(false);
	const [unreadWhileScrolled, setUnreadWhileScrolled] = useState(0);

	const isScrolledUpRef = useRef(false);
	const lastTypingBroadcastRef = useRef(0);

	const QUICK_REACTIONS = ["👍", "❤️", "🔥", "😂", "😮", "👀"];

	const messageById = useMemo(() => {
		const map = new Map<string, OptimisticMessage>();
		for (const m of messages) {
			map.set(m.id, m);
		}
		return map;
	}, [messages]);

	const activeTypingNames = useMemo(
		() => Object.values(typingUsers).map((u) => u.name),
		[typingUsers],
	);

	useEffect(() => {
		if (Object.keys(typingUsers).length === 0) return;
		const timer = setInterval(() => {
			const now = Date.now();
			setTypingUsers((prev) => {
				let changed = false;
				const next: Record<
					string,
					{ name: string; expiresAt: number }
				> = {};
				for (const [uid, info] of Object.entries(prev)) {
					if (info.expiresAt > now) {
						next[uid] = info;
					} else {
						changed = true;
					}
				}
				return changed ? next : prev;
			});
		}, 1000);
		return () => clearInterval(timer);
	}, [typingUsers]);

	const conversation = useMemo(
		() => conversations.find((c) => c.id === conversationId) ?? null,
		[conversations, conversationId],
	);

	const loadThread = useCallback(async () => {
		if (!conversationId || !userId) return;
		try {
			const [allConvs, loaded] = await Promise.all([
				fetchConversations(userId),
				fetchMessages(conversationId, 30),
			]);
			setConversations(allConvs);
			setMessages(
				conversationId,
				loaded.map((m) => ({ ...m, status: "sent" })),
			);
			setHasMore(loaded.length >= 30);
			setError(null);
			markReadLocally(conversationId);
			void markConversationRead(conversationId, userId);
			void channelRef.current?.send({
				type: "broadcast",
				event: "read_receipt",
				payload: {
					user_id: userId,
					last_read_at: new Date().toISOString(),
				},
			});
		} catch (err: unknown) {
			const e = err as Error;
			setError(e?.message || "Failed to load conversation.");
		} finally {
			setIsLoading(false);
		}
	}, [
		conversationId,
		userId,
		setConversations,
		setMessages,
		markReadLocally,
	]);

	useEffect(() => {
		if (!conversationId || !userId) return;
		let cancelled = false;
		const run = async () => {
			if (!cancelled) {
				await loadThread();
			}
		};
		void run();
		return () => {
			cancelled = true;
		};
	}, [conversationId, userId, loadThread]);

	useEffect(() => {
		if (!isSupabaseConfigured || !conversationId || !userId) return;

		const channel = supabase
			.channel(`conversation:${conversationId}`)
			.on("broadcast", { event: "new_message" }, ({ payload }) => {
				const newMsg = payload?.message as
					| OptimisticMessage
					| undefined;
				if (!newMsg?.id) return;
				receiveRealtimeMessage(newMsg, userId);
				if (newMsg.sender_id !== userId) {
					if (isScrolledUpRef.current) {
						setUnreadWhileScrolled((c) => c + 1);
					}
					setTypingUsers((prev) => {
						if (!(newMsg.sender_id in prev)) return prev;
						const { [newMsg.sender_id]: _removed, ...rest } = prev;
						return rest;
					});
					const nowIso = new Date().toISOString();
					markReadLocally(conversationId);
					void markConversationRead(conversationId, userId);
					void channel.send({
						type: "broadcast",
						event: "read_receipt",
						payload: {
							user_id: userId,
							last_read_at: nowIso,
						},
					});
				}
			})
			.on("broadcast", { event: "typing" }, ({ payload }) => {
				const typingUserId = payload?.user_id as string | undefined;
				const displayName = payload?.display_name as string | undefined;
				if (!typingUserId || typingUserId === userId) return;
				setTypingUsers((prev) => ({
					...prev,
					[typingUserId]: {
						name: displayName || "Someone",
						expiresAt: Date.now() + 3500,
					},
				}));
			})
			.on("broadcast", { event: "message_reaction" }, ({ payload }) => {
				const messageId = payload?.message_id as string | undefined;
				const reactions = payload?.reactions as
					| Record<string, string[]>
					| undefined;
				if (!messageId || !reactions) return;
				updateMessageInThread(conversationId, messageId, (m) => ({
					...m,
					reactions,
				}));
			})
			.on("broadcast", { event: "message_updated" }, ({ payload }) => {
				const updatedMsg = payload?.message as
					| OptimisticMessage
					| undefined;
				if (!updatedMsg?.id) return;
				handleRealtimeMessageUpdate(updatedMsg);
			})
			.on("broadcast", { event: "read_receipt" }, ({ payload }) => {
				if (payload?.user_id && payload?.last_read_at) {
					updateParticipantLastReadLocally(
						conversationId,
						payload.user_id as string,
						payload.last_read_at as string,
					);
				}
			})
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "messages",
					filter: `conversation_id=eq.${conversationId}`,
				},
				(payload) => {
					const newRow = payload.new as OptimisticMessage;
					if (!newRow?.id) return;
					receiveRealtimeMessage(newRow, userId);
					if (newRow.sender_id !== userId) {
						const nowIso = new Date().toISOString();
						markReadLocally(conversationId);
						void markConversationRead(conversationId, userId);
						void channel.send({
							type: "broadcast",
							event: "read_receipt",
							payload: {
								user_id: userId,
								last_read_at: nowIso,
							},
						});
					}
				},
			)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "messages",
					filter: `conversation_id=eq.${conversationId}`,
				},
				(payload) => {
					const updatedRow = payload.new as OptimisticMessage;
					if (!updatedRow?.id) return;
					handleRealtimeMessageUpdate(updatedRow);
				},
			)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "conversation_participants",
					filter: `conversation_id=eq.${conversationId}`,
				},
				(payload) => {
					const updatedParticipant = payload.new as {
						user_id?: string;
						last_read_at?: string;
					};
					if (
						updatedParticipant?.user_id &&
						updatedParticipant?.last_read_at
					) {
						updateParticipantLastReadLocally(
							conversationId,
							updatedParticipant.user_id,
							updatedParticipant.last_read_at,
						);
					}
				},
			)
			.subscribe((status) => {
				if (status === "SUBSCRIBED") {
					void channel.send({
						type: "broadcast",
						event: "read_receipt",
						payload: {
							user_id: userId,
							last_read_at: new Date().toISOString(),
						},
					});
				}
			});

		channelRef.current = channel;

		return () => {
			channelRef.current = null;
			void supabase.removeChannel(channel);
		};
	}, [
		conversationId,
		userId,
		receiveRealtimeMessage,
		handleRealtimeMessageUpdate,
		updateMessageInThread,
		updateParticipantLastReadLocally,
		markReadLocally,
	]);

	const handleLoadMore = async () => {
		if (
			!conversationId ||
			isLoadingMore ||
			!hasMore ||
			messages.length === 0
		) {
			return;
		}
		const oldest = messages[messages.length - 1];
		if (!oldest?.created_at) return;

		setIsLoadingMore(true);
		try {
			const older = await fetchMessages(
				conversationId,
				30,
				oldest.created_at,
			);
			if (older.length < 30) {
				setHasMore(false);
			}
			if (older.length > 0) {
				const existingIds = new Set(messages.map((m) => m.id));
				const uniqueOlder = older
					.filter((m) => !existingIds.has(m.id))
					.map((m) => ({ ...m, status: "sent" as const }));
				setMessages(conversationId, [...messages, ...uniqueOlder]);
			}
		} finally {
			setIsLoadingMore(false);
		}
	};

	const dispatchMessage = async (
		tempId: string,
		content?: string,
		mediaUrls?: string[],
		sharedPostId?: string,
		replyToId?: string | null,
	) => {
		if (!conversationId || !userId) return;
		try {
			const confirmed = await sendMessage(conversationId, userId, {
				content,
				mediaUrls,
				sharedPostId,
				replyToId,
			});
			const confirmedWithReply =
				replyToId && !confirmed.reply_to_id
					? { ...confirmed, reply_to_id: replyToId }
					: confirmed;
			resolveOptimisticMessage(
				conversationId,
				tempId,
				"sent",
				confirmedWithReply,
			);
			void channelRef.current?.send({
				type: "broadcast",
				event: "new_message",
				payload: { message: confirmedWithReply },
			});
		} catch (err: unknown) {
			const e = err as Error;
			resolveOptimisticMessage(
				conversationId,
				tempId,
				"failed",
				undefined,
				e?.message || "Failed to send",
			);
		}
	};

	const handleBroadcastTyping = useCallback(() => {
		if (!userId || !channelRef.current) return;
		const now = Date.now();
		if (now - lastTypingBroadcastRef.current < 1500) return;
		lastTypingBroadcastRef.current = now;
		const myName = profile?.display_name || profile?.username || "Operator";
		void channelRef.current.send({
			type: "broadcast",
			event: "typing",
			payload: {
				user_id: userId,
				display_name: myName,
			},
		});
	}, [userId, profile?.display_name, profile?.username]);

	const handleSelectReply = useCallback(
		(msg: OptimisticMessage) => {
			const senderName = conversation?.participants
				? conversation.participants.find(
						(p) => p.user_id === msg.sender_id,
					)?.nickname ||
					msg.sender?.display_name ||
					msg.sender?.username ||
					"User"
				: msg.sender?.display_name || msg.sender?.username || "User";
			const preview =
				msg.content?.trim() ||
				((msg.media_urls?.length ?? 0) > 0 ? "[Photo]" : "Message");
			setReplyingTo({
				id: msg.id,
				senderName,
				preview,
			});
			setMessageActionsOpen(false);
		},
		[conversation],
	);

	const handleToggleReaction = useCallback(
		async (msg: OptimisticMessage, emoji: string) => {
			if (!conversationId || !userId) return;
			const previous = msg.reactions ?? {};
			const optimistic = applyReactionToggle(previous, emoji, userId);
			updateMessageInThread(conversationId, msg.id, (m) => ({
				...m,
				reactions: optimistic,
			}));
			setMessageActionsOpen(false);
			try {
				const confirmed = await toggleMessageReaction(
					msg.id,
					emoji,
					userId,
					previous,
				);
				void channelRef.current?.send({
					type: "broadcast",
					event: "message_reaction",
					payload: {
						message_id: msg.id,
						reactions: confirmed,
					},
				});
			} catch (err: unknown) {
				updateMessageInThread(conversationId, msg.id, (m) => ({
					...m,
					reactions: previous,
				}));
				const e = err as Error;
				toast.error(e?.message || "Failed to update reaction.");
			}
		},
		[conversationId, userId, updateMessageInThread],
	);

	const handleJumpToLatest = useCallback(() => {
		flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
		isScrolledUpRef.current = false;
		setIsScrolledUp(false);
		setUnreadWhileScrolled(0);
	}, []);

	const handleSend = async (payload: {
		content?: string;
		localImageUri?: string;
		localImageFileSize?: number | null;
		localImages?: SelectedChatImage[];
		replyToId?: string | null;
	}) => {
		if (!conversationId || !userId) return;

		if (payload.localImages && payload.localImages.length > 0) {
			const validation = validateBatchFileSizes(payload.localImages);
			if (!validation.valid) {
				toast.error(
					validation.error || "File exceeds the 10 MB size limit.",
					"FILE TOO LARGE",
				);
				return;
			}

			const tempId = generateOptimisticMessageId();
			const optimistic: OptimisticMessage = {
				id: tempId,
				tempId,
				conversation_id: conversationId,
				sender_id: userId,
				content: payload.content ?? null,
				media_urls: payload.localImages.map((img) => img.uri),
				attachments: payload.localImages.map((img) => ({
					url: img.uri,
					type: "image" as const,
					width: img.width,
					height: img.height,
					size: img.fileSize ?? undefined,
				})),
				shared_post_id: null,
				created_at: new Date().toISOString(),
				sender: profile ?? undefined,
				status: "sending",
			};

			addOptimisticMessage(conversationId, optimistic);

			try {
				const confirmed = await sendBatchImageMessage(
					conversationId,
					userId,
					payload.localImages,
					payload.content,
				);
				resolveOptimisticMessage(
					conversationId,
					tempId,
					"sent",
					confirmed,
				);
				void channelRef.current?.send({
					type: "broadcast",
					event: "new_message",
					payload: { message: confirmed },
				});
			} catch (err: unknown) {
				const e = err as Error;
				resolveOptimisticMessage(
					conversationId,
					tempId,
					"failed",
					undefined,
					e?.message || "Media upload failed",
				);
			}
			return;
		}

		if (payload.localImageUri) {
			const validation = validateUploadFileSize(
				payload.localImageFileSize,
			);
			if (!validation.valid) {
				toast.error(
					validation.error || "File exceeds the 10 MB size limit.",
					"FILE TOO LARGE",
				);
				return;
			}
		}

		const tempId = generateOptimisticMessageId();
		const optimistic: OptimisticMessage = {
			id: tempId,
			tempId,
			conversation_id: conversationId,
			sender_id: userId,
			content: payload.content ?? null,
			media_urls: payload.localImageUri ? [payload.localImageUri] : [],
			shared_post_id: null,
			reply_to_id: payload.replyToId ?? null,
			created_at: new Date().toISOString(),
			sender: profile ?? undefined,
			status: "sending",
		};

		addOptimisticMessage(conversationId, optimistic);

		let uploadedUrls: string[] = [];
		if (payload.localImageUri) {
			try {
				const remoteUrl = await uploadChatMediaFromUri(
					userId,
					payload.localImageUri,
				);
				uploadedUrls = [remoteUrl];
			} catch (err: unknown) {
				const e = err as Error;
				resolveOptimisticMessage(
					conversationId,
					tempId,
					"failed",
					undefined,
					e?.message || "Media upload failed",
				);
				return;
			}
		}

		await dispatchMessage(
			tempId,
			payload.content,
			uploadedUrls,
			undefined,
			payload.replyToId,
		);
	};

	const handleRetry = async (failedMsg: OptimisticMessage) => {
		if (!conversationId || !userId) return;
		const tempId = failedMsg.tempId ?? failedMsg.id;
		resolveOptimisticMessage(conversationId, tempId, "sending");

		const firstMedia = failedMsg.media_urls?.[0];
		const isLocalMedia =
			firstMedia &&
			!firstMedia.startsWith("http://") &&
			!firstMedia.startsWith("https://");

		let uploadedUrls = failedMsg.media_urls ?? [];
		if (isLocalMedia) {
			try {
				const remoteUrl = await uploadChatMediaFromUri(
					userId,
					firstMedia,
				);
				uploadedUrls = [remoteUrl];
			} catch {
				resolveOptimisticMessage(conversationId, tempId, "failed");
				return;
			}
		}

		await dispatchMessage(
			tempId,
			failedMsg.content ?? undefined,
			uploadedUrls,
			failedMsg.shared_post_id ?? undefined,
		);
	};

	const handleGoBack = () => {
		if (router.canGoBack()) {
			router.back();
		} else {
			router.replace("/(tabs)/messages" as never);
		}
	};

	const pinnedMessages = useMemo(
		() => messages.filter((m) => m.is_pinned && !m.unsent_at),
		[messages],
	);

	const displayedMessages = useMemo(() => {
		const trimmed = searchQuery.trim().toLowerCase();
		if (!trimmed) return messages;
		return messages.filter(
			(m) =>
				!m.unsent_at &&
				(m.content?.toLowerCase().includes(trimmed) ?? false),
		);
	}, [messages, searchQuery]);

	const handleLongPressMessage = useCallback((msg: OptimisticMessage) => {
		setSelectedMessage(msg);
		setMessageActionsOpen(true);
	}, []);

	const handleOpenEdit = useCallback(() => {
		if (!selectedMessage) return;
		setEditDraft(selectedMessage.content ?? "");
		setMessageActionsOpen(false);
		setEditSheetOpen(true);
	}, [selectedMessage]);

	const handleSaveEdit = useCallback(async () => {
		if (!selectedMessage || !conversationId || isSavingEdit) return;
		const trimmed = editDraft.trim();
		if (!trimmed) return;
		setIsSavingEdit(true);
		try {
			const updated = await editMessage(selectedMessage.id, trimmed);
			updateMessageInThread(conversationId, selectedMessage.id, (m) => ({
				...m,
				content: updated.content,
				edited_at: updated.edited_at,
			}));
			void channelRef.current?.send({
				type: "broadcast",
				event: "message_updated",
				payload: { message: updated },
			});
			setEditSheetOpen(false);
			setSelectedMessage(null);
			toast.success("Saved");
		} catch (err: unknown) {
			const e = err as Error;
			toast.error(e?.message || "Failed to edit message.");
		} finally {
			setIsSavingEdit(false);
		}
	}, [
		selectedMessage,
		conversationId,
		editDraft,
		isSavingEdit,
		updateMessageInThread,
	]);

	const handleTogglePinMessage = useCallback(
		async (targetId?: string) => {
			const msg =
				(targetId
					? messages.find((m) => m.id === targetId)
					: selectedMessage) ?? null;
			if (!msg || !conversationId || !userId) return;
			const nextPinned = !msg.is_pinned;
			setMessageActionsOpen(false);
			updateMessageInThread(conversationId, msg.id, (m) => ({
				...m,
				is_pinned: nextPinned,
				pinned_by: nextPinned ? userId : null,
			}));
			try {
				await togglePinMessage(msg.id, nextPinned, userId);
				void channelRef.current?.send({
					type: "broadcast",
					event: "message_updated",
					payload: {
						message: {
							...msg,
							is_pinned: nextPinned,
							pinned_by: nextPinned ? userId : null,
						},
					},
				});
			} catch (err: unknown) {
				updateMessageInThread(conversationId, msg.id, (m) => ({
					...m,
					is_pinned: !nextPinned,
					pinned_by: !nextPinned ? userId : null,
				}));
				const e = err as Error;
				toast.error(e?.message || "Failed to update pinned message.");
			}
		},
		[
			messages,
			selectedMessage,
			conversationId,
			userId,
			updateMessageInThread,
		],
	);

	const handleUnsendMessage = useCallback(async () => {
		if (!selectedMessage || !conversationId) return;
		setMessageActionsOpen(false);
		const nowIso = new Date().toISOString();
		updateMessageInThread(conversationId, selectedMessage.id, (m) => ({
			...m,
			content: null,
			media_urls: [],
			attachments: [],
			shared_post_id: null,
			shared_post: undefined,
			is_pinned: false,
			pinned_by: null,
			unsent_at: nowIso,
		}));
		try {
			const updated = await unsendMessage(selectedMessage.id);
			void channelRef.current?.send({
				type: "broadcast",
				event: "message_updated",
				payload: { message: updated },
			});
			toast.success("Message unsent");
		} catch (err: unknown) {
			const e = err as Error;
			toast.error(e?.message || "Failed to unsend message.");
			void loadThread();
		}
	}, [selectedMessage, conversationId, updateMessageInThread, loadThread]);

	const handleJumpToMessage = useCallback(
		(messageId: string) => {
			setSearchQuery("");
			setSearchVisible(false);
			const idx = messages.findIndex((m) => m.id === messageId);
			if (idx >= 0) {
				flatListRef.current?.scrollToIndex({
					index: idx,
					animated: true,
				});
			}
		},
		[messages],
	);

	const handleMediaPress = useCallback((urls: string[], index: number) => {
		setLightboxState({ urls, index });
	}, []);

	const isGroup = conversation?.type === "group";
	const title = conversation
		? formatConversationTitle(conversation)
		: "CONVERSATION";
	const other = conversation?.other_participant;
	const otherOnline =
		!isGroup && other
			? isUserOnline(other.id, other.show_active_status)
			: false;
	const otherLastSeen =
		!isGroup && other && !otherOnline
			? getLastSeenText(other.last_seen_at, other.show_active_status)
			: null;

	const presenceSubtitle = isGroup
		? `${conversation?.participants.length ?? 0} USERS`
		: otherOnline
			? "● ACTIVE NOW"
			: otherLastSeen || "OFFLINE";

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			className="flex-1 bg-background">
			<StatusBar style="dark" />

			<View
				style={{ paddingTop: Math.max(insets.top, 12) + 4 }}
				className="flex-row items-center gap-3 border-b-2 border-border bg-card px-4 pb-3 shadow-neo-sm">
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Go back"
					onPress={handleGoBack}
					hitSlop={8}
					className="size-9 items-center justify-center border-2 border-border bg-secondary shadow-neo-xs active:translate-x-px active:translate-y-px">
					<ArrowLeft size={18} color="#000000" strokeWidth={2.5} />
				</Pressable>

				<Pressable
					accessibilityRole="button"
					disabled={isGroup || !other?.username}
					onPress={() => {
						if (!isGroup && other?.username) {
							router.push(`/u/${other.username}` as never);
						}
					}}
					className="min-w-0 flex-1 flex-row items-center gap-2.5">
					<View className="relative shrink-0">
						<View
							className={`size-9 items-center justify-center overflow-hidden border-2 border-border ${
								isGroup ? "bg-neo-green" : "bg-secondary"
							}`}>
							{isGroup ? (
								conversation?.avatar_url?.startsWith("http") ? (
									<ExpoImage
										source={{
											uri: conversation.avatar_url,
										}}
										style={{
											width: "100%",
											height: "100%",
										}}
										contentFit="cover"
									/>
								) : (
									<Users
										size={16}
										color="#000000"
										strokeWidth={2.5}
									/>
								)
							) : other?.avatar_url?.startsWith("http") ? (
								<ExpoImage
									source={{ uri: other.avatar_url }}
									style={{ width: "100%", height: "100%" }}
									contentFit="cover"
								/>
							) : (
								<Text className="font-bold text-xs text-foreground">
									{title.slice(0, 2).toUpperCase()}
								</Text>
							)}
						</View>
						{!isGroup && other ? (
							<ActiveDot
								userId={other.id}
								targetShowActiveStatus={
									other.show_active_status
								}
								className="absolute -right-0.5 -bottom-0.5"
							/>
						) : null}
					</View>

					<View className="min-w-0 flex-1">
						<Text
							numberOfLines={1}
							className="font-display text-base tracking-tight text-foreground uppercase">
							{title}
						</Text>
						<Text
							numberOfLines={1}
							className={`font-mono text-2xs uppercase ${
								otherOnline
									? "text-neo-green-dark"
									: "text-muted-foreground"
							}`}>
							{presenceSubtitle}
						</Text>
					</View>
				</Pressable>

				<View className="flex-row items-center gap-2">
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Search messages"
						onPress={() => {
							setSearchVisible((prev) => !prev);
							if (searchVisible) setSearchQuery("");
						}}
						hitSlop={8}
						className={`size-9 items-center justify-center border-2 border-border shadow-neo-xs active:translate-x-px active:translate-y-px ${
							searchVisible ? "bg-neo-green" : "bg-secondary"
						}`}>
						<Search size={16} color="#000000" strokeWidth={2.5} />
					</Pressable>

					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Conversation settings"
						onPress={() => setSettingsOpen(true)}
						hitSlop={8}
						className="size-9 items-center justify-center border-2 border-border bg-secondary shadow-neo-xs active:translate-x-px active:translate-y-px">
						<Settings size={16} color="#000000" strokeWidth={2.5} />
					</Pressable>
				</View>
			</View>

			{searchVisible ? (
				<View className="flex-row items-center gap-2 border-b-2 border-border bg-card px-4 py-2">
					<Search size={14} color="#000000" strokeWidth={2.5} />
					<TextInput
						value={searchQuery}
						onChangeText={setSearchQuery}
						placeholder="Search messages in this chat..."
						placeholderTextColor="rgba(0, 0, 0, 0.4)"
						autoFocus
						autoCapitalize="none"
						autoCorrect={false}
						className="flex-1 font-mono text-xs text-foreground"
					/>
					{searchQuery ? (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Clear search"
							onPress={() => setSearchQuery("")}
							hitSlop={8}
							className="border border-border bg-secondary p-1">
							<X size={12} color="#000000" />
						</Pressable>
					) : null}
				</View>
			) : null}

			{isLoading && messages.length === 0 ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator size="large" color="#000000" />
				</View>
			) : error && messages.length === 0 ? (
				<View className="flex-1 items-center justify-center p-6">
					<NetworkErrorCard
						message={error}
						onRetry={loadThread}
						className="w-full max-w-md"
					/>
				</View>
			) : (
				<View className="relative flex-1">
					<FlatList
						ref={flatListRef}
						inverted
						data={displayedMessages}
						keyExtractor={(item) => item.tempId ?? item.id}
						onEndReached={handleLoadMore}
						onEndReachedThreshold={0.3}
						onScrollToIndexFailed={() => {}}
						scrollEventThrottle={100}
						onScroll={(e) => {
							const offsetY = e.nativeEvent.contentOffset.y;
							const scrolledUp = offsetY > 220;
							if (scrolledUp !== isScrolledUpRef.current) {
								isScrolledUpRef.current = scrolledUp;
								setIsScrolledUp(scrolledUp);
							}
							if (offsetY < 60 && unreadWhileScrolled > 0) {
								setUnreadWhileScrolled(0);
							}
						}}
						contentContainerStyle={{
							paddingHorizontal: 14,
							paddingVertical: 14,
							flexGrow: 1,
							justifyContent: "flex-end",
						}}
						ListFooterComponent={
							isLoadingMore ? (
								<View className="py-3">
									<ActivityIndicator
										size="small"
										color="#000000"
									/>
								</View>
							) : null
						}
						ListEmptyComponent={
							<View className="flex-1 items-center justify-center py-12">
								<Text className="font-mono text-xs text-muted-foreground uppercase">
									{searchQuery.trim().length > 0
										? "NO MATCHING MESSAGES."
										: "SECURE WIRE ESTABLISHED. SAY HELLO."}
								</Text>
							</View>
						}
						renderItem={({ item, index }) => {
							const prevMsg = displayedMessages[index + 1];
							const replyTarget = item.reply_to_id
								? (messageById.get(item.reply_to_id) ?? null)
								: null;
							return (
								<MessageBubble
									message={item}
									isOwnMessage={item.sender_id === userId}
									currentUserId={userId}
									conversationType={
										conversation?.type ?? "direct"
									}
									participants={conversation?.participants}
									previousSenderId={prevMsg?.sender_id}
									replyToMessage={replyTarget}
									onRetry={handleRetry}
									onLongPress={handleLongPressMessage}
									onSwipeReply={handleSelectReply}
									onJumpToReply={handleJumpToMessage}
									onToggleReaction={(m, emoji) =>
										void handleToggleReaction(m, emoji)
									}
									onMediaPress={handleMediaPress}
								/>
							);
						}}
					/>

					{isScrolledUp ? (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Jump to latest messages"
							onPress={handleJumpToLatest}
							className="absolute right-4 bottom-4 flex-row items-center gap-1.5 border-2 border-border bg-neo-yellow px-3 py-2 shadow-neo-sm active:translate-x-px active:translate-y-px">
							<ArrowDown
								size={15}
								color="#000000"
								strokeWidth={2.5}
							/>
							{unreadWhileScrolled > 0 ? (
								<View className="border border-border bg-destructive px-1.5 py-0.5">
									<Text className="font-bold text-3xs text-primary-foreground tabular-nums">
										{unreadWhileScrolled > 99
											? "99+"
											: unreadWhileScrolled}
									</Text>
								</View>
							) : (
								<Text className="font-bold text-2xs tracking-wider text-foreground uppercase">
									LATEST
								</Text>
							)}
						</Pressable>
					) : null}
				</View>
			)}

			{activeTypingNames.length > 0 ? (
				<View className="border-t border-border/20 bg-card px-4 py-1.5">
					<Text
						numberOfLines={1}
						className="font-mono text-2xs text-muted-foreground uppercase">
						{activeTypingNames.length === 1
							? `${activeTypingNames[0]} IS TYPING...`
							: `${activeTypingNames.length} PEOPLE ARE TYPING...`}
					</Text>
				</View>
			) : null}

			<ChatComposer
				conversationId={conversationId}
				onSend={handleSend}
				replyingTo={replyingTo}
				onCancelReply={() => setReplyingTo(null)}
				onTyping={handleBroadcastTyping}
				isGroup={isGroup}
				disabled={!userId}
			/>

			<ConversationSettingsSheet
				open={settingsOpen}
				onOpenChange={setSettingsOpen}
				conversation={conversation}
				pinnedMessages={pinnedMessages}
				onUnpinMessage={(msgId) => void handleTogglePinMessage(msgId)}
				onJumpToMessage={handleJumpToMessage}
				onBroadcastMessage={(msg) => {
					void channelRef.current?.send({
						type: "broadcast",
						event: "new_message",
						payload: { message: msg },
					});
				}}
			/>

			<MobileSheet
				open={messageActionsOpen}
				onOpenChange={setMessageActionsOpen}
				title="MESSAGE ACTIONS">
				<View className="gap-2.5 pb-4">
					{selectedMessage ? (
						<View className="mb-1 flex-row items-center justify-between gap-1.5 border-2 border-border bg-surface p-2 shadow-neo-xs">
							{QUICK_REACTIONS.map((emoji) => {
								const reacted = Boolean(
									userId &&
									selectedMessage.reactions?.[
										emoji
									]?.includes(userId),
								);
								return (
									<Pressable
										key={emoji}
										accessibilityRole="button"
										accessibilityLabel={`React with ${emoji}`}
										onPress={() =>
											void handleToggleReaction(
												selectedMessage,
												emoji,
											)
										}
										className={`size-10 items-center justify-center border border-border ${
											reacted
												? "bg-neo-yellow"
												: "bg-card active:bg-secondary"
										}`}>
										<Text className="text-lg">{emoji}</Text>
									</Pressable>
								);
							})}
						</View>
					) : null}

					{selectedMessage ? (
						<Pressable
							accessibilityRole="button"
							onPress={() => handleSelectReply(selectedMessage)}
							className="flex-row items-center gap-3 border-2 border-border bg-card px-4 py-3 shadow-neo-sm active:bg-secondary">
							<Reply
								size={18}
								color="#000000"
								strokeWidth={2.5}
							/>
							<Text className="font-display text-sm text-foreground uppercase">
								Reply
							</Text>
						</Pressable>
					) : null}

					{selectedMessage?.sender_id === userId &&
					Boolean(selectedMessage?.content) ? (
						<Pressable
							accessibilityRole="button"
							onPress={handleOpenEdit}
							className="flex-row items-center gap-3 border-2 border-border bg-card px-4 py-3 shadow-neo-sm active:bg-secondary">
							<Edit3
								size={18}
								color="#000000"
								strokeWidth={2.5}
							/>
							<Text className="font-display text-sm text-foreground uppercase">
								Edit Message
							</Text>
						</Pressable>
					) : null}

					<Pressable
						accessibilityRole="button"
						onPress={() => void handleTogglePinMessage()}
						className="flex-row items-center gap-3 border-2 border-border bg-card px-4 py-3 shadow-neo-sm active:bg-secondary">
						<Pin size={18} color="#000000" strokeWidth={2.5} />
						<Text className="font-display text-sm text-foreground uppercase">
							{selectedMessage?.is_pinned
								? "Unpin Message"
								: "Pin Message"}
						</Text>
					</Pressable>

					{selectedMessage?.sender_id === userId ? (
						<Pressable
							accessibilityRole="button"
							onPress={() => void handleUnsendMessage()}
							className="flex-row items-center gap-3 border-2 border-border bg-card px-4 py-3 shadow-neo-sm active:bg-secondary">
							<Trash2
								size={18}
								color="#ff2a00"
								strokeWidth={2.5}
							/>
							<Text className="font-display text-sm text-destructive uppercase">
								Unsend Message
							</Text>
						</Pressable>
					) : null}
				</View>
			</MobileSheet>

			<MobileSheet
				open={editSheetOpen}
				onOpenChange={setEditSheetOpen}
				title="EDIT MESSAGE">
				<View className="gap-3 pb-4">
					<TextInput
						value={editDraft}
						onChangeText={setEditDraft}
						multiline
						autoFocus
						placeholder="Update message..."
						placeholderTextColor="rgba(0, 0, 0, 0.4)"
						className="min-h-24 border-2 border-border bg-surface p-3 font-mono text-sm text-foreground"
					/>
					<View className="flex-row justify-end gap-2">
						<NeoButton
							variant="outline"
							size="sm"
							onPress={() => setEditSheetOpen(false)}>
							<Text className="font-display text-xs text-foreground uppercase">
								Cancel
							</Text>
						</NeoButton>
						<NeoButton
							variant="primary"
							size="sm"
							loading={isSavingEdit}
							disabled={!editDraft.trim()}
							onPress={() => void handleSaveEdit()}>
							<Text className="font-display text-xs text-foreground uppercase">
								Save
							</Text>
						</NeoButton>
					</View>
				</View>
			</MobileSheet>

			<PostMediaLightboxModal
				visible={Boolean(lightboxState)}
				mediaUrls={lightboxState?.urls ?? []}
				initialIndex={lightboxState?.index ?? 0}
				onClose={() => setLightboxState(null)}
			/>
		</KeyboardAvoidingView>
	);
}
