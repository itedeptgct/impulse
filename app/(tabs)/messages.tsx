import { useAuthStore } from "@auth/store";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pin, Plus, Search, Settings, Trash2, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	FlatList,
	Pressable,
	RefreshControl,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	MobileAlertSheet,
	MobileSheet,
	MobileTopBar,
	NetworkErrorCard,
} from "@/components/ui";
import {
	deleteOrLeaveConversation,
	fetchConversations,
	togglePinConversation,
} from "@/features/messages/api";
import { ConversationRow } from "@/features/messages/components/ConversationRow";
import { ConversationSettingsSheet } from "@/features/messages/components/ConversationSettingsSheet";
import { InboxEmptyState } from "@/features/messages/components/InboxEmptyState";
import { useMessagesStore } from "@/features/messages/store";
import type { DirectConversationSummary } from "@/features/messages/types";
import { formatConversationTitle } from "@/features/messages/utils";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function MessagesScreen() {
	const insets = useSafeAreaInsets();
	const userId = useAuthStore((s) => s.user?.id);

	const conversations = useMessagesStore((s) => s.conversations);
	const setConversations = useMessagesStore((s) => s.setConversations);
	const togglePinConversationLocally = useMessagesStore(
		(s) => s.togglePinConversationLocally,
	);
	const removeConversationLocally = useMessagesStore(
		(s) => s.removeConversationLocally,
	);

	const [searchQuery, setSearchQuery] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isRetrying, setIsRetrying] = useState(false);
	const [selectedConversationId, setSelectedConversationId] = useState<
		string | null
	>(null);
	const [actionsOpen, setActionsOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const selectedConversation = useMemo(
		() =>
			conversations.find((c) => c.id === selectedConversationId) ?? null,
		[conversations, selectedConversationId],
	);

	const loadInbox = useCallback(async () => {
		if (!userId) {
			setIsLoading(false);
			setIsRefreshing(false);
			return;
		}
		try {
			const data = await fetchConversations(userId);
			setConversations(data);
			setError(null);
		} catch (err: unknown) {
			const e = err as Error;
			setError(
				e?.message ||
					"Unable to load your conversations. Check your connection.",
			);
		} finally {
			setIsLoading(false);
			setIsRefreshing(false);
		}
	}, [userId, setConversations]);

	useFocusEffect(
		useCallback(() => {
			void loadInbox();
		}, [loadInbox]),
	);

	useEffect(() => {
		if (!isSupabaseConfigured || !userId) return;

		const inboxChannel = supabase
			.channel(`user:${userId}:inbox`)
			.on("broadcast", { event: "new_message" }, () => {
				void loadInbox();
			})
			.on(
				"postgres_changes",
				{ event: "INSERT", schema: "public", table: "messages" },
				() => {
					void loadInbox();
				},
			)
			.on(
				"postgres_changes",
				{ event: "UPDATE", schema: "public", table: "messages" },
				() => {
					void loadInbox();
				},
			)
			.subscribe();

		return () => {
			void supabase.removeChannel(inboxChannel);
		};
	}, [userId, loadInbox]);

	const handleRefresh = useCallback(() => {
		setIsRefreshing(true);
		void loadInbox();
	}, [loadInbox]);

	const handleRetry = useCallback(async () => {
		setIsRetrying(true);
		try {
			await loadInbox();
		} finally {
			setIsRetrying(false);
		}
	}, [loadInbox]);

	const filteredConversations = useMemo(() => {
		const trimmed = searchQuery.trim().toLowerCase();
		if (!trimmed) return conversations;

		return conversations.filter((conv) => {
			const title = formatConversationTitle(conv).toLowerCase();
			const username =
				conv.other_participant?.username?.toLowerCase() ?? "";
			const snippet = conv.last_message?.content?.toLowerCase() ?? "";
			return (
				title.includes(trimmed) ||
				username.includes(trimmed) ||
				snippet.includes(trimmed)
			);
		});
	}, [conversations, searchQuery]);

	const handleOpenConversation = useCallback((conversationId: string) => {
		router.push(`/messages/${conversationId}` as never);
	}, []);

	const handleOpenNewMessage = useCallback(() => {
		router.push("/messages/new" as never);
	}, []);

	const handleLongPressConversation = useCallback(
		(conv: DirectConversationSummary) => {
			setSelectedConversationId(conv.id);
			setActionsOpen(true);
		},
		[],
	);

	const handleTogglePin = useCallback(async () => {
		if (!selectedConversation || !userId) return;
		const nextPinned = !selectedConversation.is_pinned;
		setActionsOpen(false);
		togglePinConversationLocally(selectedConversation.id, nextPinned);
		try {
			await togglePinConversation(
				selectedConversation.id,
				userId,
				nextPinned,
			);
		} catch (err: unknown) {
			togglePinConversationLocally(selectedConversation.id, !nextPinned);
			const e = err as Error;
			Alert.alert("Error", e?.message || "Failed to update pin status.");
		}
	}, [selectedConversation, userId, togglePinConversationLocally]);

	const handleOpenSettings = useCallback(() => {
		setActionsOpen(false);
		setSettingsOpen(true);
	}, []);

	const handleRequestDelete = useCallback(() => {
		setActionsOpen(false);
		setDeleteConfirmOpen(true);
	}, []);

	const handleConfirmDelete = useCallback(async () => {
		if (!selectedConversation || isDeleting) return;
		setIsDeleting(true);
		try {
			await deleteOrLeaveConversation(selectedConversation.id);
			removeConversationLocally(selectedConversation.id);
			setDeleteConfirmOpen(false);
			setSelectedConversationId(null);
		} catch (err: unknown) {
			const e = err as Error;
			Alert.alert(
				"Error",
				e?.message || "Failed to delete conversation.",
			);
		} finally {
			setIsDeleting(false);
		}
	}, [selectedConversation, isDeleting, removeConversationLocally]);

	const renderItem = useCallback(
		({ item }: { item: DirectConversationSummary }) => (
			<ConversationRow
				conversation={item}
				currentUserId={userId ?? ""}
				onPress={handleOpenConversation}
				onLongPress={handleLongPressConversation}
			/>
		),
		[userId, handleOpenConversation, handleLongPressConversation],
	);

	return (
		<View className="flex-1 bg-background">
			<StatusBar style="dark" />
			<MobileTopBar sector="MESSAGES" dotColor="#00FF66" />

			<View className="border-b-2 border-border bg-card px-4 py-3 shadow-neo-sm">
				<View className="flex-row items-center gap-2.5">
					<View className="flex-1 flex-row items-center border-2 border-border bg-surface px-3 py-2 shadow-neo-sm">
						<Search size={15} color="#000000" strokeWidth={2.5} />
						<TextInput
							value={searchQuery}
							onChangeText={setSearchQuery}
							placeholder="Search chats or users..."
							placeholderTextColor="rgba(0, 0, 0, 0.4)"
							autoCapitalize="none"
							autoCorrect={false}
							className="flex-1 px-2 font-mono text-xs text-foreground"
						/>
						{searchQuery ? (
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Clear search"
								onPress={() => setSearchQuery("")}
								hitSlop={8}
								className="border border-border bg-card p-1">
								<X size={12} color="#000000" />
							</Pressable>
						) : null}
					</View>

					<Pressable
						accessibilityRole="button"
						accessibilityLabel="New conversation"
						onPress={handleOpenNewMessage}
						className="size-10 items-center justify-center border-2 border-border bg-neo-green shadow-neo-sm active:translate-x-px active:translate-y-px">
						<Plus size={18} color="#000000" strokeWidth={2.5} />
					</Pressable>
				</View>
			</View>

			{isLoading && conversations.length === 0 ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator size="large" color="#000000" />
					<Text className="mt-3 font-mono text-xs text-muted-foreground uppercase">
						SYNCING WIRE...
					</Text>
				</View>
			) : error && conversations.length === 0 ? (
				<View className="flex-1 items-center justify-center p-6">
					<NetworkErrorCard
						message={error}
						onRetry={handleRetry}
						isRetrying={isRetrying}
						className="w-full max-w-md"
					/>
				</View>
			) : (
				<FlatList
					data={filteredConversations}
					keyExtractor={(item) => item.id}
					renderItem={renderItem}
					refreshControl={
						<RefreshControl
							refreshing={isRefreshing}
							onRefresh={handleRefresh}
							tintColor="#000000"
						/>
					}
					contentContainerStyle={{
						flexGrow: 1,
						paddingBottom: insets.bottom + 24,
					}}
					ListEmptyComponent={
						<InboxEmptyState
							onNewMessage={handleOpenNewMessage}
							hasSearchQuery={searchQuery.trim().length > 0}
						/>
					}
				/>
			)}

			<MobileSheet
				open={actionsOpen}
				onOpenChange={setActionsOpen}
				title={
					selectedConversation
						? formatConversationTitle(selectedConversation)
						: "CONVERSATION"
				}
				subtitle={
					selectedConversation?.type === "group"
						? `${selectedConversation.participants.length} members`
						: "Direct conversation"
				}>
				<View className="gap-2.5 pb-4">
					<Pressable
						accessibilityRole="button"
						onPress={() => void handleTogglePin()}
						className="flex-row items-center gap-3 border-2 border-border bg-card px-4 py-3 shadow-neo-sm active:bg-secondary">
						<Pin size={18} color="#000000" strokeWidth={2.5} />
						<Text className="font-display text-sm text-foreground uppercase">
							{selectedConversation?.is_pinned
								? "Unpin Conversation"
								: "Pin Conversation"}
						</Text>
					</Pressable>

					<Pressable
						accessibilityRole="button"
						onPress={handleOpenSettings}
						className="flex-row items-center gap-3 border-2 border-border bg-card px-4 py-3 shadow-neo-sm active:bg-secondary">
						<Settings size={18} color="#000000" strokeWidth={2.5} />
						<Text className="font-display text-sm text-foreground uppercase">
							Conversation Settings
						</Text>
					</Pressable>

					<Pressable
						accessibilityRole="button"
						onPress={handleRequestDelete}
						className="flex-row items-center gap-3 border-2 border-border bg-card px-4 py-3 shadow-neo-sm active:bg-secondary">
						<Trash2 size={18} color="#ff2a00" strokeWidth={2.5} />
						<Text className="font-display text-sm text-destructive uppercase">
							{selectedConversation?.type === "group"
								? "Leave Group"
								: "Delete Conversation"}
						</Text>
					</Pressable>
				</View>
			</MobileSheet>

			<ConversationSettingsSheet
				open={settingsOpen}
				onOpenChange={setSettingsOpen}
				conversation={selectedConversation}
			/>

			<MobileAlertSheet
				open={deleteConfirmOpen}
				onOpenChange={setDeleteConfirmOpen}
				type="warning"
				title={
					selectedConversation?.type === "group"
						? "LEAVE GROUP?"
						: "DELETE CONVERSATION?"
				}
				description={
					selectedConversation?.type === "group"
						? "You will be removed from this group conversation."
						: "This will remove the conversation from your inbox."
				}
				actions={[
					{
						label: "Cancel",
						variant: "outline",
						onPress: () => setDeleteConfirmOpen(false),
					},
					{
						label:
							selectedConversation?.type === "group"
								? "Leave"
								: "Delete",
						variant: "destructive",
						loading: isDeleting,
						onPress: handleConfirmDelete,
					},
				]}
			/>
		</View>
	);
}
