import { useAuthStore } from "@auth/store";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Flame, Plus } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Platform,
	Pressable,
	RefreshControl,
	Text,
	View,
} from "react-native";

import { MobileTopBar } from "@/components/ui";
import type { GuildId } from "@/features/guilds/types";
import { fetchFeedPosts, votePost } from "@/features/posts/api";
import { PostCard } from "@/features/posts/components/PostCard";
import { useComposerStore } from "@/features/posts/store";
import type { FeedGuildFilter, FeedSort, Post } from "@/features/posts/types";

const SORT_TABS: { key: FeedSort; label: string }[] = [
	{ key: "hot", label: "HOT (🔥)" },
	{ key: "new", label: "NEW (⚡)" },
	{ key: "top", label: "TOP (★)" },
];

const HOUSE_META: Record<GuildId, { label: string; dotClass: string }> = {
	octagram: { label: "OCTOGRAM", dotClass: "bg-neo-green" },
	chameleon: { label: "CHAMELEON", dotClass: "bg-neo-magenta" },
	blue_jays: { label: "BLUE JAYS", dotClass: "bg-neo-cyan" },
};

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

export default function FeedScreen() {
	const params = useLocalSearchParams<{ guild?: string }>();
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);
	const refreshUserData = useAuthStore((state) => state.refreshUserData);
	const openComposer = useComposerStore((state) => state.openComposer);

	const [posts, setPosts] = useState<Post[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [selectedGuild, setSelectedGuild] = useState<FeedGuildFilter>("all");
	const [selectedSort, setSelectedSort] = useState<FeedSort>("hot");
	const [hasMore, setHasMore] = useState(true);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [nextOffset, setNextOffset] = useState<number | null>(null);

	const PAGE_SIZE = 20;

	const currentHouse: GuildId | null = profile?.guild || null;
	const houseMeta = currentHouse ? HOUSE_META[currentHouse] : null;
	const activeFilter: FeedGuildFilter =
		selectedGuild === "all" || !currentHouse ? "all" : currentHouse;

	useEffect(() => {
		if (!params.guild) return;
		queueMicrotask(() => {
			setSelectedGuild(
				params.guild === "all" || !currentHouse ? "all" : currentHouse,
			);
		});
	}, [params.guild, currentHouse]);

	const loadData = useCallback(async () => {
		if (!user?.id) return;
		try {
			const activeGuild = profile?.guild ?? undefined;
			const targetHouse = activeGuild ?? currentHouse ?? undefined;
			const resolvedFilter: FeedGuildFilter =
				selectedGuild === "all" || !targetHouse ? "all" : targetHouse;
			const isAdmin = profile?.role === "admin";
			const feedResult = await fetchFeedPosts(
				resolvedFilter,
				selectedSort,
				user.id,
				activeGuild,
				isAdmin,
				PAGE_SIZE,
				0,
			);
			const visiblePosts =
				resolvedFilter === "all"
					? feedResult.items.filter(
							(post) =>
								!(
									post.visibility === "house" &&
									post.author_id === user.id
								),
						)
					: feedResult.items;
			setPosts(visiblePosts);
			setHasMore(feedResult.hasMore);
			setNextOffset(feedResult.nextOffset);
		} finally {
			setIsLoading(false);
			setIsRefreshing(false);
		}
	}, [
		user?.id,
		selectedGuild,
		currentHouse,
		selectedSort,
		profile?.guild,
		profile?.role,
	]);

	const loadMore = useCallback(async () => {
		if (
			!user?.id ||
			isLoading ||
			isLoadingMore ||
			isRefreshing ||
			!hasMore ||
			nextOffset === null
		) {
			return;
		}

		setIsLoadingMore(true);
		try {
			const activeGuild = profile?.guild ?? undefined;
			const targetHouse = activeGuild ?? currentHouse ?? undefined;
			const resolvedFilter: FeedGuildFilter =
				selectedGuild === "all" || !targetHouse ? "all" : targetHouse;
			const isAdmin = profile?.role === "admin";
			const feedResult = await fetchFeedPosts(
				resolvedFilter,
				selectedSort,
				user.id,
				activeGuild,
				isAdmin,
				PAGE_SIZE,
				nextOffset,
			);
			const visibleItems =
				resolvedFilter === "all"
					? feedResult.items.filter(
							(post) =>
								!(
									post.visibility === "house" &&
									post.author_id === user.id
								),
						)
					: feedResult.items;

			setPosts((prev) => {
				const existingIds = new Set(prev.map((p) => p.id));
				const newUnique = visibleItems.filter(
					(p) => !existingIds.has(p.id),
				);
				return [...prev, ...newUnique];
			});
			setHasMore(feedResult.hasMore);
			setNextOffset(feedResult.nextOffset);
		} finally {
			setIsLoadingMore(false);
		}
	}, [
		user?.id,
		isLoading,
		isLoadingMore,
		isRefreshing,
		hasMore,
		nextOffset,
		profile?.guild,
		profile?.role,
		currentHouse,
		selectedGuild,
		selectedSort,
	]);

	useEffect(() => {
		void loadData();
	}, [loadData]);

	const patchPost = useCallback((postId: string, patch: Partial<Post>) => {
		setPosts((prev) =>
			prev.map((p) => (p.id === postId ? { ...p, ...patch } : p)),
		);
	}, []);

	const handleVote = useCallback(
		async (post: Post, targetVote: 1 | -1) => {
			const currentUserId = user?.id;
			if (!currentUserId) return;

			const currentVote = post.user_vote || 0;
			const nextVote = currentVote === targetVote ? 0 : targetVote;
			const newUp =
				Math.max(0, post.upvotes_count - (currentVote === 1 ? 1 : 0)) +
				(nextVote === 1 ? 1 : 0);
			const newDown =
				Math.max(
					0,
					post.downvotes_count - (currentVote === -1 ? 1 : 0),
				) + (nextVote === -1 ? 1 : 0);

			patchPost(post.id, {
				upvotes_count: newUp,
				downvotes_count: newDown,
				user_vote: nextVote,
			});

			try {
				const res = await votePost(post.id, currentUserId, targetVote);
				patchPost(post.id, {
					upvotes_count: res.upvotes_count,
					downvotes_count: res.downvotes_count,
					user_vote: res.user_vote,
				});
			} catch {
				patchPost(post.id, {
					upvotes_count: post.upvotes_count,
					downvotes_count: post.downvotes_count,
					user_vote: currentVote,
				});
			}
		},
		[user?.id, patchPost],
	);

	const handleOpenComments = useCallback((post: Post) => {
		router.push(`/post/${post.id}` as any);
	}, []);

	const handlePostUpdated = useCallback((updated: Post) => {
		setPosts((prev) =>
			prev.map((p) => (p.id === updated.id ? updated : p)),
		);
	}, []);

	const handlePostDeleted = useCallback((deletedId: string) => {
		setPosts((prev) => prev.filter((p) => p.id !== deletedId));
	}, []);

	const renderItem = useCallback(
		({ item }: { item: Post }) => (
			<PostCard
				post={item}
				onVote={handleVote}
				onOpenComments={handleOpenComments}
				onPostUpdated={handlePostUpdated}
				onPostDeleted={handlePostDeleted}
			/>
		),
		[handleVote, handleOpenComments, handlePostUpdated, handlePostDeleted],
	);

	const renderHeader = () => {
		const isPublicSelected = activeFilter === "all";
		const isHouseSelected = Boolean(
			currentHouse && activeFilter === currentHouse,
		);

		return (
			<View className="mb-3 border-b border-border/25 pt-1 pb-3">
				<View className="mb-2.5 flex-row gap-2">
					<Pressable
						accessibilityRole="tab"
						accessibilityState={{ selected: isPublicSelected }}
						onPress={() => {
							triggerHaptic();
							setSelectedGuild("all");
						}}
						className={`min-h-9 flex-1 items-center justify-center border-2 border-border px-3 py-1.5 shadow-neo-sm active:translate-x-px active:translate-y-px ${
							isPublicSelected ? "bg-primary" : "bg-surface"
						}`}>
						<Text
							className={`font-bold text-xs uppercase ${
								isPublicSelected
									? "text-primary-foreground"
									: "text-foreground"
							}`}>
							[PUBLIC]
						</Text>
					</Pressable>

					<Pressable
						accessibilityRole="tab"
						accessibilityState={{ selected: isHouseSelected }}
						onPress={() => {
							triggerHaptic();
							if (!currentHouse) {
								router.push("/(tabs)/guilds");
								return;
							}
							setSelectedGuild(currentHouse);
						}}
						className={`min-h-9 flex-1 flex-row items-center justify-center gap-1.5 border-2 border-border px-3 py-1.5 shadow-neo-sm active:translate-x-px active:translate-y-px ${
							isHouseSelected ? "bg-primary" : "bg-surface"
						}`}>
						{houseMeta ? (
							<View className={`size-2 ${houseMeta.dotClass}`} />
						) : null}
						<Text
							className={`font-bold text-xs uppercase ${
								isHouseSelected
									? "text-primary-foreground"
									: "text-foreground"
							}`}>
							{houseMeta ? `[${houseMeta.label}]` : "[NO HOUSE]"}
						</Text>
					</Pressable>
				</View>

				<View className="flex-row border-2 border-border bg-surface shadow-neo-sm">
					{SORT_TABS.map((tab, idx) => {
						const active = selectedSort === tab.key;
						return (
							<Pressable
								key={tab.key}
								accessibilityRole="tab"
								accessibilityState={{ selected: active }}
								onPress={() => {
									triggerHaptic();
									setSelectedSort(tab.key);
								}}
								className={`min-h-9 flex-1 items-center justify-center py-2 ${
									idx < SORT_TABS.length - 1
										? "border-r-2 border-border"
										: ""
								} ${active ? "bg-primary" : "bg-surface"}`}>
								<Text
									className={`font-bold text-xs uppercase ${
										active
											? "text-primary-foreground"
											: "text-foreground"
									}`}>
									{tab.label}
								</Text>
							</Pressable>
						);
					})}
				</View>
			</View>
		);
	};

	const renderEmpty = () => {
		if (isLoading) {
			return (
				<View className="gap-4 py-4">
					{[1, 2].map((item) => (
						<View key={item} className="border-2 border-border">
							<View className="flex-row items-center justify-between border-b-2 border-border bg-secondary px-3 py-2">
								<View className="h-3.5 w-36 bg-foreground/15" />
								<View className="h-3.5 w-16 bg-foreground/15" />
							</View>
							<View className="bg-surface p-4">
								<View className="mb-2 h-6 w-4/5 bg-foreground/15" />
								<View className="mb-4 h-6 w-3/5 bg-foreground/15" />
								<View className="mb-1.5 h-3.5 w-full bg-foreground/10" />
								<View className="mb-4 h-3.5 w-5/6 bg-foreground/10" />
								<View className="h-24 w-full border border-border/30 bg-primary/90 p-3">
									<Text className="font-mono text-2xs text-neo-green uppercase">
										&gt; LOADING...
									</Text>
								</View>
							</View>
						</View>
					))}
				</View>
			);
		}

		return (
			<View className="my-6 items-center justify-center border-2 border-border bg-surface p-8 shadow-neo">
				<View className="size-12 items-center justify-center border-2 border-border bg-secondary shadow-neo-xs">
					<Flame size={24} color="#000000" strokeWidth={2.5} />
				</View>
				<Text className="mt-4 font-display text-lg tracking-tight text-foreground uppercase">
					NO POSTS YET
				</Text>
				<Text className="mt-1.5 text-center font-mono text-xs leading-relaxed text-foreground/70">
					yo, its ur chance to say "first" like a yt comment HAHAHAHA
				</Text>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Create first post"
					onPress={() => {
						triggerHaptic();
						openComposer();
					}}
					className="mt-5 flex-row items-center gap-1.5 border-2 border-border bg-neo-green px-4 py-2.5 shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5">
					<Plus size={14} color="#000000" strokeWidth={3} />
					<Text className="font-bold text-xs text-foreground uppercase">
						[ CREATE FIRST POST ]
					</Text>
				</Pressable>
			</View>
		);
	};

	return (
		<View className="flex-1 bg-background">
			<StatusBar style="dark" />
			<MobileTopBar sector="FEED" dotColor="#00FF66" />

			<FlatList
				data={posts}
				keyExtractor={(item) => item.id}
				renderItem={renderItem}
				ListHeaderComponent={renderHeader}
				ListEmptyComponent={renderEmpty}
				ListFooterComponent={
					isLoadingMore ? (
						<View className="py-4">
							<ActivityIndicator color="#000000" />
						</View>
					) : null
				}
				onEndReached={loadMore}
				onEndReachedThreshold={0.5}
				contentContainerStyle={{
					paddingTop: 12,
					paddingBottom: 92,
					paddingHorizontal: 16,
					maxWidth: 672,
					width: "100%",
					alignSelf: "center",
				}}
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={async () => {
							setIsRefreshing(true);
							try {
								await Promise.all([
									refreshUserData(),
									loadData(),
								]);
							} finally {
								setIsRefreshing(false);
							}
						}}
						tintColor="#000000"
					/>
				}
				showsVerticalScrollIndicator={false}
			/>

			<View className="absolute right-4 bottom-4 z-20">
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Create new post"
					onPress={() => {
						triggerHaptic();
						openComposer();
					}}
					className="flex-row items-center gap-1.5 border-2 border-border bg-neo-green px-4 py-3 shadow-neo active:translate-x-0.5 active:translate-y-0.5 active:shadow-neo-xs">
					<Plus size={16} color="#000000" strokeWidth={3} />
					<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
						[NEW POST]
					</Text>
				</Pressable>
			</View>
		</View>
	);
}
