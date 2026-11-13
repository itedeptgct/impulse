import { useAuthStore } from "@auth/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Calendar, Plus, Radio } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Platform,
	Pressable,
	RefreshControl,
	ScrollView,
	Text,
	View,
} from "react-native";

import { MobileTopBar, NetworkErrorCard } from "@/components/ui";
import { canCreateDispatch } from "@/features/auth/permissions";
import { DispatchCard } from "@/features/dispatch/components/DispatchCard";
import { DispatchComposerModal } from "@/features/dispatch/components/DispatchComposerModal";
import {
	type DispatchFilterType,
	filterDispatches,
} from "@/features/dispatch/utils/filter";
import { fetchFeedPosts, votePost } from "@/features/posts/api";
import type { Post } from "@/features/posts/types";

const STORAGE_POSTS_KEY = "impulse_posts_cache_v2";

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

export default function DispatchScreen() {
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);
	const refreshUserData = useAuthStore((state) => state.refreshUserData);

	const [posts, setPosts] = useState<Post[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [selectedFilter, setSelectedFilter] =
		useState<DispatchFilterType>("all");
	const [eventsOnly, setEventsOnly] = useState(false);
	const [isComposerOpen, setIsComposerOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isRetrying, setIsRetrying] = useState(false);

	const userId = user?.id;
	const userRole = profile?.role;
	const userGuild = profile?.guild ?? null;
	const canAuthor =
		canCreateDispatch(userRole, userGuild, null) ||
		(userGuild ? canCreateDispatch(userRole, userGuild, userGuild) : false);

	const loadData = useCallback(async () => {
		if (!userId) return;
		try {
			const isAdmin = userRole === "admin";
			const feedResult = await fetchFeedPosts(
				"all",
				"new",
				userId,
				userGuild,
				isAdmin,
				50,
				0,
			);

			let cachedPosts: Post[] = [];
			try {
				const raw = await AsyncStorage.getItem(STORAGE_POSTS_KEY);
				if (raw) {
					cachedPosts = JSON.parse(raw);
				}
			} catch {}

			const cachedMap = new Map<string, Post>();
			for (const cp of cachedPosts) {
				cachedMap.set(cp.id, cp);
			}

			const merged = [
				...cachedPosts,
				...feedResult.items.map((remote) => {
					const local = cachedMap.get(remote.id);
					return {
						...remote,
						post_type: remote.post_type || local?.post_type,
						event_date: remote.event_date || local?.event_date,
						event_location:
							remote.event_location || local?.event_location,
					};
				}),
			];
			const seenIds = new Set<string>();
			const dispatches: Post[] = [];

			for (const p of merged) {
				if (p.post_type === "dispatch" && !seenIds.has(p.id)) {
					seenIds.add(p.id);
					dispatches.push(p);
				}
			}

			// Sort dispatches by created_at descending
			dispatches.sort(
				(a, b) =>
					new Date(b.created_at).getTime() -
					new Date(a.created_at).getTime(),
			);

			setPosts(dispatches);
			setError(null);
		} catch (err: unknown) {
			const e = err as Error;
			setError(
				e?.message ||
					"Unable to reach the server. Check your connection and try again.",
			);
		} finally {
			setIsLoading(false);
			setIsRefreshing(false);
		}
	}, [userId, userGuild, userRole]);

	const handleRetry = useCallback(async () => {
		triggerHaptic();
		setIsRetrying(true);
		try {
			await loadData();
		} finally {
			setIsRetrying(false);
		}
	}, [loadData]);

	useEffect(() => {
		let cancelled = false;
		queueMicrotask(() => {
			if (!cancelled) void loadData();
		});
		return () => {
			cancelled = true;
		};
	}, [loadData]);

	const handleVote = useCallback(
		async (post: Post, vote: 1 | -1) => {
			if (!user?.id) return;
			triggerHaptic();

			const currentVote = post.user_vote ?? 0;
			const nextVote = currentVote === vote ? 0 : vote;

			let upDiff = 0;
			let downDiff = 0;

			if (currentVote === 1) upDiff -= 1;
			if (currentVote === -1) downDiff -= 1;

			if (nextVote === 1) upDiff += 1;
			if (nextVote === -1) downDiff += 1;

			setPosts((prev) =>
				prev.map((p) => {
					if (p.id !== post.id) return p;
					return {
						...p,
						user_vote: nextVote,
						upvotes_count: Math.max(0, p.upvotes_count + upDiff),
						downvotes_count: Math.max(
							0,
							p.downvotes_count + downDiff,
						),
					};
				}),
			);

			try {
				await votePost(post.id, user.id, vote);
			} catch {
				// Revert on error
				setPosts((prev) =>
					prev.map((p) => (p.id === post.id ? post : p)),
				);
			}
		},
		[user],
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

	const handlePostCreated = useCallback((newDispatch: Post) => {
		setPosts((prev) => [newDispatch, ...prev]);
	}, []);

	// Map selected filter to standard filter options
	const mappedFilter:
		| "all"
		| "global"
		| "octagram"
		| "chameleon"
		| "blue_jays" =
		selectedFilter === "my_house" ? (userGuild ?? "all") : selectedFilter;

	const filteredPosts = filterDispatches(posts, mappedFilter, eventsOnly);

	// Get empty state title and subtitle
	const getEmptyState = () => {
		if (eventsOnly) {
			return {
				title: "NO UPCOMING CAMPUS EVENTS SCHEDULED",
				subtitle:
					"Upcoming scheduled assemblies, hackathons, and campus wires will appear here.",
			};
		}

		switch (selectedFilter) {
			case "global":
				return {
					title: "NO CAMPUS-WIDE ANNOUNCEMENTS ACTIVE",
					subtitle:
						"Official broadcasts issued across all campus houses will be transmitted here.",
				};
			case "octagram":
				return {
					title: "NO ACTIVE DISPATCHES FOR OCTOGRAM",
					subtitle:
						"Official broadcasts and notices from Octagram house leadership will appear here.",
				};
			case "chameleon":
				return {
					title: "NO ACTIVE DISPATCHES FOR CHAMELEON",
					subtitle:
						"Official broadcasts and notices from Chameleon house leadership will appear here.",
				};
			case "blue_jays":
				return {
					title: "NO ACTIVE DISPATCHES FOR BLUE JAYS",
					subtitle:
						"Official broadcasts and notices from Blue Jays house leadership will appear here.",
				};
			case "my_house":
				if (userGuild === "octagram") {
					return {
						title: "NO ACTIVE DISPATCHES FOR OCTOGRAM",
						subtitle:
							"Official broadcasts for your house will appear here.",
					};
				}
				if (userGuild === "chameleon") {
					return {
						title: "NO ACTIVE DISPATCHES FOR CHAMELEON",
						subtitle:
							"Official broadcasts for your house will appear here.",
					};
				}
				if (userGuild === "blue_jays") {
					return {
						title: "NO ACTIVE DISPATCHES FOR BLUE JAYS",
						subtitle:
							"Official broadcasts for your house will appear here.",
					};
				}
				return {
					title: "NO ACTIVE DISPATCHES POSTED YET",
					subtitle:
						"Official broadcasts for your house will appear here.",
				};
			case "all":
			default:
				return {
					title: "NO ACTIVE DISPATCHES POSTED YET",
					subtitle:
						"Official campus dispatches, announcements, and house wires will appear on this channel.",
				};
		}
	};

	const renderEmpty = () => {
		if (isLoading) return null;

		if (error) {
			return (
				<View className="py-4">
					<NetworkErrorCard
						message={error}
						onRetry={handleRetry}
						isRetrying={isRetrying}
					/>
				</View>
			);
		}

		const emptyState = getEmptyState();

		return (
			<View className="my-8 items-center border-2 border-border bg-surface p-6 text-center shadow-neo">
				<View className="bg-neo-yellow mb-3.5 size-12 items-center justify-center border-2 border-border shadow-neo-xs">
					{eventsOnly ? (
						<Calendar size={22} color="#000000" strokeWidth={2.4} />
					) : (
						<Radio size={22} color="#000000" strokeWidth={2.4} />
					)}
				</View>
				<Text className="mb-2 text-center font-display text-base tracking-tight text-foreground uppercase">
					{emptyState.title}
				</Text>
				<Text className="mb-4 text-center font-mono text-xs leading-relaxed text-foreground/70">
					{emptyState.subtitle}
				</Text>

				{canAuthor && (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Issue official dispatch"
						onPress={() => {
							triggerHaptic();
							setIsComposerOpen(true);
						}}
						className="bg-neo-yellow flex-row items-center gap-1.5 border-2 border-border px-4 py-2.5 shadow-neo-xs active:translate-x-px active:translate-y-px">
						<Plus size={14} color="#000000" strokeWidth={2.8} />
						<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
							ISSUE FIRST DISPATCH
						</Text>
					</Pressable>
				)}
			</View>
		);
	};

	const renderHeader = () => {
		return (
			<View className="mb-4 border-b border-border/25 pb-3">
				{/* Filter Chips Horizontal Scroller */}
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ gap: 8 }}
					className="py-1">
					{/* ALL */}
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Filter all dispatches"
						onPress={() => {
							triggerHaptic();
							setSelectedFilter("all");
						}}
						className={`border-2 border-border px-3 py-1.5 shadow-neo-xs active:translate-x-px active:translate-y-px ${
							selectedFilter === "all"
								? "bg-primary"
								: "bg-surface"
						}`}>
						<Text
							className={`font-bold text-xs tracking-wider uppercase ${
								selectedFilter === "all"
									? "text-primary-foreground"
									: "text-foreground"
							}`}>
							ALL
						</Text>
					</Pressable>

					{/* GLOBAL */}
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Filter global dispatches"
						onPress={() => {
							triggerHaptic();
							setSelectedFilter("global");
						}}
						className={`border-2 border-border px-3 py-1.5 shadow-neo-xs active:translate-x-px active:translate-y-px ${
							selectedFilter === "global"
								? "bg-primary"
								: "bg-surface"
						}`}>
						<Text
							className={`font-bold text-xs tracking-wider uppercase ${
								selectedFilter === "global"
									? "text-primary-foreground"
									: "text-foreground"
							}`}>
							GLOBAL
						</Text>
					</Pressable>

					{/* MY HOUSE (if aligned) */}
					{userGuild && (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Filter my house dispatches"
							onPress={() => {
								triggerHaptic();
								setSelectedFilter("my_house");
							}}
							className={`border-2 border-border px-3 py-1.5 shadow-neo-xs active:translate-x-px active:translate-y-px ${
								selectedFilter === "my_house"
									? "bg-primary"
									: "bg-surface"
							}`}>
							<Text
								className={`font-bold text-xs tracking-wider uppercase ${
									selectedFilter === "my_house"
										? "text-primary-foreground"
										: "text-foreground"
								}`}>
								MY HOUSE
							</Text>
						</Pressable>
					)}

					{/* OCTOGRAM */}
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Filter Octagram dispatches"
						onPress={() => {
							triggerHaptic();
							setSelectedFilter("octagram");
						}}
						className={`border-2 border-border px-3 py-1.5 shadow-neo-xs active:translate-x-px active:translate-y-px ${
							selectedFilter === "octagram"
								? "bg-primary"
								: "bg-surface"
						}`}>
						<Text
							className={`font-bold text-xs tracking-wider uppercase ${
								selectedFilter === "octagram"
									? "text-primary-foreground"
									: "text-foreground"
							}`}>
							OCTOGRAM
						</Text>
					</Pressable>

					{/* CHAMELEON */}
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Filter Chameleon dispatches"
						onPress={() => {
							triggerHaptic();
							setSelectedFilter("chameleon");
						}}
						className={`border-2 border-border px-3 py-1.5 shadow-neo-xs active:translate-x-px active:translate-y-px ${
							selectedFilter === "chameleon"
								? "bg-primary"
								: "bg-surface"
						}`}>
						<Text
							className={`font-bold text-xs tracking-wider uppercase ${
								selectedFilter === "chameleon"
									? "text-primary-foreground"
									: "text-foreground"
							}`}>
							CHAMELEON
						</Text>
					</Pressable>

					{/* BLUE JAYS */}
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Filter Blue Jays dispatches"
						onPress={() => {
							triggerHaptic();
							setSelectedFilter("blue_jays");
						}}
						className={`border-2 border-border px-3 py-1.5 shadow-neo-xs active:translate-x-px active:translate-y-px ${
							selectedFilter === "blue_jays"
								? "bg-primary"
								: "bg-surface"
						}`}>
						<Text
							className={`font-bold text-xs tracking-wider uppercase ${
								selectedFilter === "blue_jays"
									? "text-primary-foreground"
									: "text-foreground"
							}`}>
							BLUE JAYS
						</Text>
					</Pressable>

					{/* EVENTS ONLY Toggle Chip */}
					<Pressable
						accessibilityRole="button"
						accessibilityState={{ selected: eventsOnly }}
						accessibilityLabel="Toggle events only filter"
						onPress={() => {
							triggerHaptic();
							setEventsOnly((prev) => !prev);
						}}
						className={`flex-row items-center gap-1.5 border-2 border-border px-3 py-1.5 shadow-neo-xs active:translate-x-px active:translate-y-px ${
							eventsOnly ? "bg-neo-yellow" : "bg-surface"
						}`}>
						<Calendar size={13} color="#000000" strokeWidth={2.5} />
						<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
							EVENTS ONLY
						</Text>
					</Pressable>
				</ScrollView>

				{error && posts.length > 0 && (
					<View className="mt-3">
						<NetworkErrorCard
							compact
							message={error}
							onRetry={handleRetry}
							isRetrying={isRetrying}
						/>
					</View>
				)}
			</View>
		);
	};

	return (
		<View className="flex-1 bg-background">
			<StatusBar style="dark" />
			<MobileTopBar sector="DISPATCH" dotColor="#FFE600" />

			{isLoading ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator color="#000000" size="large" />
				</View>
			) : (
				<FlatList
					data={filteredPosts}
					keyExtractor={(item) => item.id}
					renderItem={({ item }) => (
						<DispatchCard
							post={item}
							onVote={handleVote}
							onOpenComments={handleOpenComments}
							onPostUpdated={handlePostUpdated}
							onPostDeleted={handlePostDeleted}
						/>
					)}
					ListHeaderComponent={renderHeader}
					ListEmptyComponent={renderEmpty}
					contentContainerStyle={{
						paddingTop: 12,
						paddingBottom: 96,
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
			)}

			{canAuthor && (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Create official dispatch"
					onPress={() => {
						triggerHaptic();
						setIsComposerOpen(true);
					}}
					className="bg-neo-yellow absolute right-4 bottom-6 z-20 flex-row items-center gap-1.5 border-2 border-border px-4 py-3 shadow-neo active:translate-x-0.5 active:translate-y-0.5">
					<Plus size={16} color="#000000" strokeWidth={3} />
					<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
						[DISPATCH]
					</Text>
				</Pressable>
			)}

			<DispatchComposerModal
				visible={isComposerOpen}
				onClose={() => setIsComposerOpen(false)}
				onCreated={handlePostCreated}
			/>
		</View>
	);
}
