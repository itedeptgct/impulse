import { useAuthStore } from "@auth/store";
import { Image as ExpoImage } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
	ArrowLeft,
	Edit3,
	Pin,
	Search,
	Settings,
	Trash2,
	Users,
	X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	Alert,
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
	editMessage,
	fetchConversations,
	fetchMessages,
	markConversationRead,
	sendMessage,
	togglePinMessage,
	unsendMessage,
	uploadChatMediaFromUri,
} from "@/features/messages/api";
import { ChatComposer } from "@/features/messages/components/ChatComposer";
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
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

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
	) => {
		if (!conversationId || !userId) return;
		try {
			const confirmed = await sendMessage(conversationId, userId, {
				content,
				mediaUrls,
				sharedPostId,
			});
			resolveOptimisticMessage(conversationId, tempId, "sent", confirmed);
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
				e?.message || "Failed to send",
			);
		}
	};

	const handleSend = async (payload: {
		content?: string;
		localImageUri?: string;
	}) => {
		if (!conversationId || !userId) return;

		const tempId = generateOptimisticMessageId();
		const optimistic: OptimisticMessage = {
			id: tempId,
			tempId,
			conversation_id: conversationId,
			sender_id: userId,
			content: payload.content ?? null,
			media_urls: payload.localImageUri ? [payload.localImageUri] : [],
			shared_post_id: null,
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

		await dispatchMessage(tempId, payload.content, uploadedUrls);
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
		} catch (err: unknown) {
			const e = err as Error;
			Alert.alert("Error", e?.message || "Failed to edit message.");
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
				Alert.alert(
					"Error",
					e?.message || "Failed to update pinned message.",
				);
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
		} catch (err: unknown) {
			const e = err as Error;
			Alert.alert("Error", e?.message || "Failed to unsend message.");
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
								<Users
									size={16}
									color="#000000"
									strokeWidth={2.5}
								/>
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
				<FlatList
					ref={flatListRef}
					inverted
					data={displayedMessages}
					keyExtractor={(item) => item.tempId ?? item.id}
					onEndReached={handleLoadMore}
					onEndReachedThreshold={0.3}
					onScrollToIndexFailed={() => {}}
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
						return (
							<MessageBubble
								message={item}
								isOwnMessage={item.sender_id === userId}
								conversationType={
									conversation?.type ?? "direct"
								}
								participants={conversation?.participants}
								previousSenderId={prevMsg?.sender_id}
								onRetry={handleRetry}
								onLongPress={handleLongPressMessage}
								onMediaPress={handleMediaPress}
							/>
						);
					}}
				/>
			)}

			<ChatComposer onSend={handleSend} disabled={!userId} />

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
