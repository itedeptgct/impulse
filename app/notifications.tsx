import { useAuthStore } from "@auth/store";
import { formatRelativeTime } from "@lib/date";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import {
	AtSign,
	Bell,
	BellOff,
	CheckCheck,
	MessageCircle,
	MessageSquare,
	Settings,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Platform,
	Pressable,
	RefreshControl,
	Text,
	View,
} from "react-native";

import { MobileTopBar, NeoButton } from "@/components/ui";
import { NotificationPreferencesModal } from "@/features/notifications/components/NotificationPreferencesModal";
import {
	useMarkAllNotificationsRead,
	useMarkNotificationRead,
	useNotifications,
} from "@/features/notifications/hooks";
import { resolveNotificationRoute } from "@/features/notifications/push-routing";
import type {
	NotificationItem,
	NotificationType,
} from "@/features/notifications/types";

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

function NotificationTypeBadge({ type }: { type: NotificationType }) {
	switch (type) {
		case "comment":
			return (
				<View className="flex-row items-center gap-1 border border-border bg-neo-green px-1.5 py-0.5">
					<MessageSquare
						size={10}
						color="#000000"
						strokeWidth={2.5}
					/>
					<Text className="font-bold text-[10px] text-foreground uppercase">
						COMMENT
					</Text>
				</View>
			);
		case "reply":
			return (
				<View className="flex-row items-center gap-1 border border-border bg-neo-cyan px-1.5 py-0.5">
					<MessageSquare
						size={10}
						color="#000000"
						strokeWidth={2.5}
					/>
					<Text className="font-bold text-[10px] text-foreground uppercase">
						REPLY
					</Text>
				</View>
			);
		case "mention":
			return (
				<View className="flex-row items-center gap-1 border border-border bg-neo-magenta px-1.5 py-0.5">
					<AtSign size={10} color="#FFFFFF" strokeWidth={2.5} />
					<Text className="font-bold text-[10px] text-white uppercase">
						MENTION
					</Text>
				</View>
			);
		case "message":
			return (
				<View className="flex-row items-center gap-1 border border-border bg-primary px-1.5 py-0.5">
					<MessageCircle
						size={10}
						color="#FAF9F5"
						strokeWidth={2.5}
					/>
					<Text className="font-bold text-[10px] text-primary-foreground uppercase">
						MESSAGE
					</Text>
				</View>
			);
	}
}

export default function NotificationsScreen() {
	const user = useAuthStore((state) => state.user);
	const userId = user?.id;

	const [isPrefsOpen, setIsPrefsOpen] = useState(false);

	const {
		data,
		isLoading,
		isError,
		isRefetching,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
		refetch,
	} = useNotifications(userId);

	const markRead = useMarkNotificationRead(userId);
	const markAllRead = useMarkAllNotificationsRead(userId);

	const notifications = useMemo(
		() => data?.pages.flatMap((page) => page) ?? [],
		[data],
	);

	const hasUnread = useMemo(
		() => notifications.some((item) => !item.read_at),
		[notifications],
	);

	const handlePressNotification = useCallback(
		(item: NotificationItem) => {
			triggerHaptic();
			if (!item.read_at) {
				markRead.mutate(item.id);
			}

			const actorUsername =
				item.actor?.username ??
				(typeof item.data?.actor_username === "string"
					? item.data.actor_username
					: undefined);

			const route = resolveNotificationRoute({
				type: item.type,
				postId: item.post_id ?? undefined,
				commentId: item.comment_id ?? undefined,
				conversationId: item.conversation_id ?? undefined,
				username: actorUsername,
			});

			if (route) {
				router.push(route as any);
			}
		},
		[markRead],
	);

	const handlePressActor = useCallback((username?: string | null) => {
		if (!username) return;
		triggerHaptic();
		router.push(`/u/${username}` as any);
	}, []);

	const handleMarkAllRead = useCallback(() => {
		if (!hasUnread || markAllRead.isPending) return;
		triggerHaptic();
		markAllRead.mutate();
	}, [hasUnread, markAllRead]);

	const handleEndReached = useCallback(() => {
		if (hasNextPage && !isFetchingNextPage) {
			void fetchNextPage();
		}
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	const renderItem = useCallback(
		({ item }: { item: NotificationItem }) => {
			const isUnread = !item.read_at;
			const actorName =
				item.actor?.display_name || item.actor?.username || "Operator";
			const initials = actorName.slice(0, 2).toUpperCase();
			const actorUsername =
				item.actor?.username ??
				(typeof item.data?.actor_username === "string"
					? item.data.actor_username
					: null);

			return (
				<Pressable
					accessibilityRole="button"
					onPress={() => handlePressNotification(item)}
					className={`mx-4 mb-3 flex-row items-start gap-3 border-2 border-border p-3.5 shadow-neo-sm active:translate-x-px active:translate-y-px ${
						isUnread ? "bg-card" : "bg-surface"
					}`}>
					{/* Unread Indicator Strip */}
					{isUnread && (
						<View className="mt-1.5 size-2.5 shrink-0 border border-border bg-primary" />
					)}

					{/* Actor Avatar */}
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={
							actorUsername
								? `View @${actorUsername} profile`
								: "Operator avatar"
						}
						disabled={!actorUsername}
						hitSlop={6}
						onPress={(e) => {
							e.stopPropagation();
							handlePressActor(actorUsername);
						}}
						className="size-10 shrink-0 items-center justify-center overflow-hidden border-2 border-border bg-secondary">
						{item.actor?.avatar_url?.startsWith("http") ? (
							<ExpoImage
								source={{ uri: item.actor.avatar_url }}
								style={{ width: "100%", height: "100%" }}
								contentFit="cover"
							/>
						) : (
							<Text className="font-bold text-xs text-foreground">
								{initials}
							</Text>
						)}
					</Pressable>

					{/* Content */}
					<View className="min-w-0 flex-1">
						<View className="flex-row items-center justify-between gap-2">
							<NotificationTypeBadge type={item.type} />
							<Text className="font-mono text-[10px] text-muted-foreground">
								{formatRelativeTime(item.created_at)}
							</Text>
						</View>

						<Text
							numberOfLines={2}
							className="mt-1.5 font-bold text-sm leading-snug text-foreground">
							{item.title}
						</Text>

						{Boolean(item.body) && (
							<Text
								numberOfLines={3}
								className="mt-1 font-mono text-xs leading-relaxed text-muted-foreground">
								{item.body}
							</Text>
						)}
					</View>
				</Pressable>
			);
		},
		[handlePressActor, handlePressNotification],
	);

	return (
		<View className="flex-1 bg-background">
			<MobileTopBar sector="NOTIFICATIONS" showBackButton />

			{/* Action Header Bar */}
			<View className="flex-row items-center justify-between border-b-2 border-border bg-surface px-4 py-2.5">
				<View className="flex-row items-center gap-2">
					<Bell size={15} color="#000000" strokeWidth={2.5} />
					<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
						Activity Feed
					</Text>
				</View>

				<View className="flex-row items-center gap-2">
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Mark all notifications as read"
						disabled={!hasUnread || markAllRead.isPending}
						onPress={handleMarkAllRead}
						className={`flex-row items-center gap-1.5 border-2 border-border px-2.5 py-1.5 shadow-neo-xs active:translate-x-px active:translate-y-px ${
							hasUnread
								? "bg-neo-green"
								: "bg-background opacity-50"
						}`}>
						<CheckCheck
							size={13}
							color="#000000"
							strokeWidth={2.5}
						/>
						<Text className="font-bold text-[11px] text-foreground uppercase">
							Mark all as read
						</Text>
					</Pressable>

					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Notification preferences"
						hitSlop={6}
						onPress={() => {
							triggerHaptic();
							setIsPrefsOpen(true);
						}}
						className="size-8 items-center justify-center border-2 border-border bg-background shadow-neo-xs active:translate-x-px active:translate-y-px">
						<Settings size={15} color="#000000" strokeWidth={2.5} />
					</Pressable>
				</View>
			</View>

			{!userId ? (
				<View className="flex-1 items-center justify-center px-6">
					<View className="w-full max-w-sm items-center border-2 border-border bg-card p-6 shadow-neo-sm">
						<BellOff size={28} color="#000000" strokeWidth={2} />
						<Text className="mt-3 text-center font-display text-lg text-foreground uppercase">
							Sign in required
						</Text>
						<Text className="mt-1 text-center font-mono text-xs text-muted-foreground">
							Sign in to view your notifications and manage alert
							preferences.
						</Text>
					</View>
				</View>
			) : isLoading ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator size="large" color="#000000" />
					<Text className="mt-3 font-mono text-xs text-muted-foreground">
						Loading notifications...
					</Text>
				</View>
			) : isError ? (
				<View className="flex-1 items-center justify-center px-6">
					<View className="w-full max-w-sm items-center border-2 border-border bg-card p-6 shadow-neo-sm">
						<Text className="text-center font-display text-lg text-foreground uppercase">
							Signal Interrupted
						</Text>
						<Text className="mt-1 text-center font-mono text-xs text-muted-foreground">
							Could not load your notifications right now.
						</Text>
						<View className="mt-4">
							<NeoButton
								variant="primary"
								size="sm"
								onPress={() => refetch()}>
								Retry
							</NeoButton>
						</View>
					</View>
				</View>
			) : (
				<FlatList
					data={notifications}
					keyExtractor={(item) => item.id}
					renderItem={renderItem}
					contentContainerStyle={
						notifications.length === 0
							? { flexGrow: 1, justifyContent: "center" }
							: { paddingTop: 16, paddingBottom: 32 }
					}
					refreshControl={
						<RefreshControl
							refreshing={isRefetching}
							onRefresh={() => refetch()}
							tintColor="#000000"
						/>
					}
					onEndReached={handleEndReached}
					onEndReachedThreshold={0.4}
					ListEmptyComponent={
						<View className="mx-6 items-center border-2 border-dashed border-border/40 bg-card p-8">
							<Bell size={28} color="#000000" strokeWidth={1.8} />
							<Text className="mt-3 text-center font-display text-lg tracking-tight text-foreground uppercase">
								ALL CAUGHT UP
							</Text>
							<Text className="mt-1 text-center font-mono text-xs text-muted-foreground">
								No notifications yet. Replies, mentions, and
								messages will show up here.
							</Text>
						</View>
					}
					ListFooterComponent={
						isFetchingNextPage ? (
							<View className="items-center py-4">
								<ActivityIndicator
									size="small"
									color="#000000"
								/>
							</View>
						) : null
					}
				/>
			)}

			<NotificationPreferencesModal
				open={isPrefsOpen}
				onOpenChange={setIsPrefsOpen}
				userId={userId}
			/>
		</View>
	);
}
