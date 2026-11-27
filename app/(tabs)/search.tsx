import { searchUsers } from "@auth/api";
import { useAuthStore } from "@auth/store";
import type { Profile } from "@auth/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image as ExpoImage } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
	CheckCircle2,
	Clock,
	Code2,
	FileText,
	Image as ImageIcon,
	Search,
	Shield,
	Users,
	X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MobileTopBar, NetworkErrorCard } from "@/components/ui";
import { GuildBadge } from "@/features/guilds/components/GuildBadge";
import {
	normalizePostMedia,
	searchPosts,
	votePost,
} from "@/features/posts/api";
import { PostCard } from "@/features/posts/components/PostCard";
import type { Post } from "@/features/posts/types";
import { ActiveDot } from "@/features/presence";
import { toast } from "@/lib/toast";

type SearchFilterTab = "all" | "posts" | "users";

const RECENT_SEARCHES_KEY = "impulse_recent_searches_v1";
const MAX_RECENT_SEARCHES = 8;

const QUICK_TOPICS = [
	"#SIRBOOGS",
	"#ITE",
	"#PROGRAMMING",
	"#PAKOPYA",
	"#IMISSHER",
];

type SearchRow =
	| {
			type: "header";
			id: string;
			title: string;
			count: number;
			icon: "users" | "posts";
	  }
	| { type: "user"; id: string; user: Profile }
	| { type: "post"; id: string; post: Post };

export default function SearchScreen() {
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams<{ q?: string | string[] }>();
	const incomingQuery = Array.isArray(params.q) ? params.q[0] : params.q;
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);

	const userId = user?.id;
	const userGuild = profile?.guild;
	const isAdmin = profile?.role === "admin";

	const [query, setQuery] = useState("");
	const [activeTab, setActiveTab] = useState<SearchFilterTab>("all");
	const [postResults, setPostResults] = useState<Post[]>([]);
	const [userResults, setUserResults] = useState<Profile[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [hasSearched, setHasSearched] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isRetrying, setIsRetrying] = useState(false);
	const [recentSearches, setRecentSearches] = useState<string[]>([]);
	const [filterHasCode, setFilterHasCode] = useState(false);
	const [filterHasMedia, setFilterHasMedia] = useState(false);
	const [filterMyHouse, setFilterMyHouse] = useState(false);

	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const searchSeqRef = useRef(0);

	useEffect(() => {
		let cancelled = false;
		void AsyncStorage.getItem(RECENT_SEARCHES_KEY)
			.then((raw) => {
				if (cancelled || !raw) return;
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) {
					setRecentSearches(
						parsed
							.filter((x): x is string => typeof x === "string")
							.slice(0, MAX_RECENT_SEARCHES),
					);
				}
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, []);

	const saveRecentSearch = useCallback((term: string) => {
		const trimmed = term.trim();
		if (trimmed.length < 2) return;
		setRecentSearches((prev) => {
			const next = [
				trimmed,
				...prev.filter(
					(item) => item.toLowerCase() !== trimmed.toLowerCase(),
				),
			].slice(0, MAX_RECENT_SEARCHES);
			void AsyncStorage.setItem(
				RECENT_SEARCHES_KEY,
				JSON.stringify(next),
			).catch(() => {});
			return next;
		});
	}, []);

	const removeRecentSearch = useCallback((term: string) => {
		setRecentSearches((prev) => {
			const next = prev.filter((item) => item !== term);
			void AsyncStorage.setItem(
				RECENT_SEARCHES_KEY,
				JSON.stringify(next),
			).catch(() => {});
			return next;
		});
	}, []);

	const clearRecentSearches = useCallback(() => {
		setRecentSearches([]);
		void AsyncStorage.removeItem(RECENT_SEARCHES_KEY).catch(() => {});
	}, []);

	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
			searchSeqRef.current += 1;
		};
	}, []);

	const executeSearch = useCallback(
		async (searchTerm: string, targetTab: SearchFilterTab = activeTab) => {
			const trimmed = searchTerm.trim();
			if (!trimmed) {
				searchSeqRef.current += 1;
				setPostResults([]);
				setUserResults([]);
				setIsSearching(false);
				setHasSearched(false);
				setError(null);
				return;
			}

			const seq = ++searchSeqRef.current;
			setIsSearching(true);
			setHasSearched(true);
			setError(null);

			const shouldFetchPosts =
				targetTab === "all" || targetTab === "posts";
			const shouldFetchUsers =
				targetTab === "all" || targetTab === "users";

			try {
				const [posts, users] = await Promise.all([
					shouldFetchPosts
						? searchPosts(trimmed, userId, userGuild, isAdmin)
						: Promise.resolve([]),
					shouldFetchUsers
						? searchUsers(trimmed)
						: Promise.resolve([]),
				]);

				if (seq !== searchSeqRef.current) {
					return;
				}

				if (shouldFetchPosts) setPostResults(posts);
				if (shouldFetchUsers) setUserResults(users);
				saveRecentSearch(trimmed);
			} catch (err: unknown) {
				if (seq === searchSeqRef.current) {
					const e = err as Error;
					setError(
						e?.message ||
							"Unable to reach the server. Check your connection and try again.",
					);
					setPostResults([]);
					setUserResults([]);
				}
			} finally {
				if (seq === searchSeqRef.current) {
					setIsSearching(false);
				}
			}
		},
		[activeTab, userId, userGuild, isAdmin, saveRecentSearch],
	);

	const handleRetry = useCallback(async () => {
		if (!query.trim()) return;
		setIsRetrying(true);
		try {
			await executeSearch(query, activeTab);
		} finally {
			setIsRetrying(false);
		}
	}, [query, activeTab, executeSearch]);

	const executeSearchRef = useRef(executeSearch);
	useEffect(() => {
		executeSearchRef.current = executeSearch;
	}, [executeSearch]);

	useEffect(() => {
		const trimmed = incomingQuery?.trim();
		if (!trimmed) return;
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
			debounceTimerRef.current = null;
		}
		const targetTab: SearchFilterTab = trimmed.startsWith("#")
			? "posts"
			: "all";
		queueMicrotask(() => {
			setQuery(trimmed);
			setActiveTab(targetTab);
			void executeSearchRef.current(trimmed, targetTab);
			router.setParams({ q: undefined } as any);
		});
	}, [incomingQuery]);

	const handleQueryChange = (text: string) => {
		setQuery(text);
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}
		if (!text.trim()) {
			searchSeqRef.current += 1;
			setPostResults([]);
			setUserResults([]);
			setHasSearched(false);
			setIsSearching(false);
			setError(null);
			return;
		}
		debounceTimerRef.current = setTimeout(() => {
			void executeSearch(text, activeTab);
		}, 250);
	};

	const handleTabChange = (newTab: SearchFilterTab) => {
		setActiveTab(newTab);
		if (query.trim()) {
			const needsPosts =
				(newTab === "all" || newTab === "posts") &&
				postResults.length === 0;
			const needsUsers =
				(newTab === "all" || newTab === "users") &&
				userResults.length === 0;
			if (needsPosts || needsUsers) {
				void executeSearch(query, newTab);
			}
		}
	};

	const handleClear = () => {
		setQuery("");
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}
		searchSeqRef.current += 1;
		setPostResults([]);
		setUserResults([]);
		setHasSearched(false);
		setIsSearching(false);
		setError(null);
	};

	const patchPostResult = useCallback(
		(postId: string, patch: Partial<Post>) => {
			setPostResults((prev) =>
				prev.map((p) => (p.id === postId ? { ...p, ...patch } : p)),
			);
		},
		[],
	);

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

			patchPostResult(post.id, {
				upvotes_count: newUp,
				downvotes_count: newDown,
				user_vote: nextVote,
			});

			try {
				const res = await votePost(post.id, currentUserId, targetVote);
				patchPostResult(post.id, {
					upvotes_count: res.upvotes_count,
					downvotes_count: res.downvotes_count,
					user_vote: res.user_vote,
				});
			} catch {
				patchPostResult(post.id, {
					upvotes_count: post.upvotes_count,
					downvotes_count: post.downvotes_count,
					user_vote: currentVote,
				});
				toast.error("Failed to update vote. Please try again.");
			}
		},
		[user?.id, patchPostResult],
	);

	const handleOpenComments = useCallback((targetPost: Post) => {
		router.push(`/post/${targetPost.id}` as any);
	}, []);

	const handlePostUpdated = useCallback((updated: Post) => {
		setPostResults((prev) =>
			prev.map((it) => (it.id === updated.id ? updated : it)),
		);
	}, []);

	const handlePostDeleted = useCallback((deletedId: string) => {
		setPostResults((prev) => prev.filter((it) => it.id !== deletedId));
	}, []);

	const filteredPostResults = useMemo(() => {
		return postResults.filter((p) => {
			if (filterHasCode && !p.code_snippet?.trim()) return false;
			if (filterHasMedia && normalizePostMedia(p).length === 0)
				return false;
			if (filterMyHouse && userGuild) {
				const postGuild = p.guild || p.author?.guild;
				if (postGuild !== userGuild) return false;
			}
			return true;
		});
	}, [postResults, filterHasCode, filterHasMedia, filterMyHouse, userGuild]);

	const showPosts = activeTab === "all" || activeTab === "posts";
	const showUsers = activeTab === "all" || activeTab === "users";
	const hasTabResults =
		activeTab === "all"
			? filteredPostResults.length > 0 || userResults.length > 0
			: activeTab === "posts"
				? filteredPostResults.length > 0
				: userResults.length > 0;

	const renderItem = useCallback(
		({ item }: { item: SearchRow }) => {
			if (item.type === "header") {
				return (
					<View className="mt-2 mb-3 flex-row items-center gap-2">
						{item.icon === "users" ? (
							<Users
								size={14}
								color="#000000"
								strokeWidth={2.2}
							/>
						) : (
							<FileText
								size={14}
								color="#000000"
								strokeWidth={2.2}
							/>
						)}
						<Text className="font-bold text-xs tracking-wider text-muted-foreground uppercase">
							{item.title} ({item.count})
						</Text>
					</View>
				);
			}
			if (item.type === "user") {
				const usr = item.user;
				const uName = usr.display_name || usr.username || "User";
				const uInitials = (uName || "S").slice(0, 2).toUpperCase();

				return (
					<View className="mb-2.5">
						<Pressable
							onPress={() => {
								if (usr.username) {
									router.push(`/u/${usr.username}` as any);
								}
							}}
							className="flex-row items-center justify-between rounded-none border-2 border-border bg-card p-3 shadow-neo-sm active:translate-x-px active:translate-y-px">
							<View className="flex-1 flex-row items-center gap-3">
								<View className="relative">
									<View className="size-11 items-center justify-center overflow-hidden rounded-none border-2 border-border bg-secondary shadow-neo-sm">
										{usr.avatar_url &&
										usr.avatar_url.startsWith("http") ? (
											<ExpoImage
												source={{
													uri: usr.avatar_url,
												}}
												style={{
													width: "100%",
													height: "100%",
												}}
												contentFit="cover"
											/>
										) : (
											<Text className="font-bold text-xs text-foreground">
												{uInitials}
											</Text>
										)}
									</View>
									<ActiveDot
										userId={usr.id}
										targetShowActiveStatus={
											usr.show_active_status
										}
										size="md"
										className="absolute -right-1 -bottom-1"
									/>
								</View>

								<View className="flex-1">
									<View className="flex-row items-center gap-1.5">
										<Text
											className="font-bold text-sm text-foreground uppercase"
											numberOfLines={1}>
											{uName}
										</Text>
										<CheckCircle2
											size={12}
											color="#000000"
											strokeWidth={2.5}
										/>
									</View>
									<Text className="font-mono text-xs text-muted-foreground">
										@{usr.username || "someone"}
									</Text>
									{(usr.course || usr.year_level) && (
										<View className="mt-1 flex-row items-center gap-1">
											<Text className="font-bold text-[10px] text-foreground uppercase">
												{[
													usr.course,
													usr.year_level
														? `Year ${usr.year_level}`
														: null,
												]
													.filter(Boolean)
													.join(" • ")}
											</Text>
										</View>
									)}
								</View>
							</View>

							{usr.guild ? (
								<GuildBadge guildId={usr.guild} size="sm" />
							) : null}
						</Pressable>
					</View>
				);
			}

			return (
				<View className="mb-4">
					<PostCard
						post={item.post}
						onVote={handleVote}
						onOpenComments={handleOpenComments}
						onPostUpdated={handlePostUpdated}
						onPostDeleted={handlePostDeleted}
					/>
				</View>
			);
		},
		[handleVote, handleOpenComments, handlePostUpdated, handlePostDeleted],
	);

	const keyExtractor = useCallback((item: SearchRow) => item.id, []);

	const searchRows = useMemo<SearchRow[]>(() => {
		const rows: SearchRow[] = [];
		if (showUsers && userResults.length > 0) {
			if (activeTab === "all") {
				rows.push({
					type: "header",
					id: "header-users",
					title: "USERS",
					count: userResults.length,
					icon: "users",
				});
			}
			for (let i = 0; i < userResults.length; i++) {
				const usr = userResults[i];
				rows.push({
					type: "user",
					id: usr.id || usr.username || `user-${i}`,
					user: usr,
				});
			}
		}
		if (showPosts && filteredPostResults.length > 0) {
			if (activeTab === "all") {
				rows.push({
					type: "header",
					id: "header-posts",
					title: "POSTS",
					count: filteredPostResults.length,
					icon: "posts",
				});
			}
			for (const p of filteredPostResults) {
				rows.push({
					type: "post",
					id: p.id,
					post: p,
				});
			}
		}
		return rows;
	}, [showUsers, userResults, showPosts, filteredPostResults, activeTab]);

	return (
		<View
			style={{ flex: 1, backgroundColor: "#faf9f5" }}
			className="flex-1 bg-background text-foreground">
			<StatusBar style="dark" />

			<MobileTopBar
				sector="SEARCH"
				dotColor="#FF2A00"
				showBackButton={true}
			/>

			<View className="border-b-2 border-border bg-card px-4 pt-3 pb-3.5 shadow-neo-sm">
				<View className="mt-2 flex-row items-center rounded-none border-2 border-border bg-surface px-3 py-2 shadow-neo-sm focus-within:border-border">
					<Search size={16} color="#000000" strokeWidth={2.5} />
					<TextInput
						value={query}
						onChangeText={handleQueryChange}
						placeholder="Search by keywords, #tag, or @handle..."
						placeholderTextColor="rgba(0, 0, 0, 0.4)"
						autoCapitalize="none"
						autoCorrect={false}
						returnKeyType="search"
						onSubmitEditing={() => executeSearch(query)}
						className="flex-1 px-2.5 font-mono text-xs text-foreground"
					/>
					{query ? (
						<Pressable
							onPress={handleClear}
							hitSlop={8}
							className="rounded-none border border-border bg-card p-1">
							<X size={13} color="#000000" />
						</Pressable>
					) : null}
				</View>

				<View className="mt-3 flex-row gap-2">
					{(["all", "posts", "users"] as SearchFilterTab[]).map(
						(tab) => {
							const isSelected = activeTab === tab;
							const label =
								tab === "all"
									? "ALL RESULTS"
									: tab === "posts"
										? `POSTS (${filteredPostResults.length})`
										: `USERS (${userResults.length})`;

							return (
								<Pressable
									key={tab}
									onPress={() => handleTabChange(tab)}
									className={`min-h-9 flex-1 items-center justify-center rounded-none border-2 border-border py-1.5 shadow-neo-sm active:translate-x-px active:translate-y-px ${
										isSelected
											? "bg-primary"
											: "bg-secondary"
									}`}>
									<Text
										className={`font-bold text-[10px] uppercase ${
											isSelected
												? "text-primary-foreground"
												: "text-foreground"
										}`}>
										{label}
									</Text>
								</Pressable>
							);
						},
					)}
				</View>

				{activeTab !== "users" ? (
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						className="mt-2.5"
						contentContainerStyle={{ gap: 8 }}>
						<Pressable
							accessibilityRole="button"
							accessibilityState={{ selected: filterHasCode }}
							onPress={() => setFilterHasCode((prev) => !prev)}
							className={`flex-row items-center gap-1.5 border-2 border-border px-2.5 py-1 shadow-neo-xs ${
								filterHasCode ? "bg-neo-green" : "bg-surface"
							}`}>
							<Code2
								size={12}
								color="#000000"
								strokeWidth={2.5}
							/>
							<Text className="font-bold text-2xs tracking-wider text-foreground uppercase">
								HAS CODE
							</Text>
						</Pressable>

						<Pressable
							accessibilityRole="button"
							accessibilityState={{ selected: filterHasMedia }}
							onPress={() => setFilterHasMedia((prev) => !prev)}
							className={`flex-row items-center gap-1.5 border-2 border-border px-2.5 py-1 shadow-neo-xs ${
								filterHasMedia ? "bg-neo-yellow" : "bg-surface"
							}`}>
							<ImageIcon
								size={12}
								color="#000000"
								strokeWidth={2.5}
							/>
							<Text className="font-bold text-2xs tracking-wider text-foreground uppercase">
								HAS MEDIA
							</Text>
						</Pressable>

						{userGuild ? (
							<Pressable
								accessibilityRole="button"
								accessibilityState={{
									selected: filterMyHouse,
								}}
								onPress={() =>
									setFilterMyHouse((prev) => !prev)
								}
								className={`flex-row items-center gap-1.5 border-2 border-border px-2.5 py-1 shadow-neo-xs ${
									filterMyHouse ? "bg-neo-cyan" : "bg-surface"
								}`}>
								<Shield
									size={12}
									color="#000000"
									strokeWidth={2.5}
								/>
								<Text className="font-bold text-2xs tracking-wider text-foreground uppercase">
									MY HOUSE
								</Text>
							</Pressable>
						) : null}
					</ScrollView>
				) : null}
			</View>

			{isSearching ? (
				<View
					style={{ flex: 1 }}
					className="flex-1 items-center justify-center">
					<ActivityIndicator size="large" color="#000000" />
					<Text className="mt-3 font-mono text-xs text-muted-foreground uppercase">
						SCANNING DATABASE...
					</Text>
				</View>
			) : error ? (
				<View
					style={{ flex: 1 }}
					className="flex-1 items-center justify-center p-6">
					<NetworkErrorCard
						message={error}
						onRetry={handleRetry}
						isRetrying={isRetrying}
						className="w-full max-w-md"
					/>
				</View>
			) : !hasSearched ? (
				<ScrollView
					style={{ flex: 1 }}
					contentContainerStyle={{
						flexGrow: 1,
						padding: 16,
						paddingBottom: insets.bottom + 32,
					}}
					keyboardShouldPersistTaps="handled">
					{recentSearches.length > 0 ? (
						<View className="mt-2 mb-4 rounded-none border-2 border-border bg-surface p-4 shadow-neo-sm">
							<View className="mb-2.5 flex-row items-center justify-between">
								<View className="flex-row items-center gap-1.5">
									<Clock
										size={12}
										color="#000000"
										strokeWidth={2.5}
									/>
									<Text className="font-bold text-[10px] tracking-wider text-foreground uppercase">
										// RECENT_SEARCHES
									</Text>
								</View>
								<Pressable
									accessibilityRole="button"
									accessibilityLabel="Clear recent searches"
									onPress={clearRecentSearches}
									hitSlop={8}>
									<Text className="font-bold text-3xs tracking-wider text-destructive uppercase">
										CLEAR ALL
									</Text>
								</Pressable>
							</View>
							<View className="flex-row flex-wrap gap-2">
								{recentSearches.map((term) => (
									<View
										key={term}
										className="flex-row items-center border-2 border-border bg-card shadow-neo-xs">
										<Pressable
											onPress={() =>
												handleQueryChange(term)
											}
											className="px-2.5 py-1.5 active:bg-neo-green">
											<Text className="font-mono text-xs text-foreground">
												{term}
											</Text>
										</Pressable>
										<Pressable
											accessibilityRole="button"
											accessibilityLabel={`Remove ${term} from recent searches`}
											onPress={() =>
												removeRecentSearch(term)
											}
											className="border-l border-border px-1.5 py-1.5 active:bg-secondary">
											<X
												size={11}
												color="#000000"
												strokeWidth={2.5}
											/>
										</Pressable>
									</View>
								))}
							</View>
						</View>
					) : null}

					<View className="mt-2 rounded-none border-2 border-border bg-surface p-4 shadow-neo-sm">
						<Text className="mb-1.5 font-bold text-[10px] tracking-wider text-foreground uppercase">
							// QUICK_FREQUENCY_TAGS
						</Text>
						<Text className="mb-3 font-mono text-xs leading-relaxed text-muted-foreground">
							Tap an indexed tag or enter an operator handle to
							query public posts and house ledgers.
						</Text>
						<View className="flex-row flex-wrap gap-2">
							{QUICK_TOPICS.map((topic) => (
								<Pressable
									key={topic}
									onPress={() => handleQueryChange(topic)}
									className="border-2 border-border bg-secondary px-3 py-1.5 shadow-neo-xs active:translate-x-px active:translate-y-px">
									<Text className="font-bold text-xs text-foreground uppercase">
										{topic}
									</Text>
								</Pressable>
							))}
						</View>
					</View>
				</ScrollView>
			) : !hasTabResults ? (
				<View
					style={{ flex: 1 }}
					className="flex-1 items-center justify-center p-6">
					<View className="size-14 items-center justify-center rounded-none border-2 border-border bg-card shadow-neo-sm">
						<Search size={24} color="#000000" />
					</View>
					<Text className="mt-4 text-center font-display text-base text-foreground uppercase">
						{activeTab === "posts"
							? `NO POSTS MATCHING "${query}"`
							: activeTab === "users"
								? `NO USERS MATCHING "${query}"`
								: `NO RESULTS MATCHING "${query}"`}
					</Text>
					<Text className="mt-1 text-center font-mono text-xs leading-relaxed text-muted-foreground">
						{activeTab === "posts"
							? "No matching posts found in your house or public feed."
							: activeTab === "users"
								? "No profiles found matching this name, handle, or house."
								: "Check your keyword or try searching by popular topics like algorithms, mobile, or react."}
					</Text>
				</View>
			) : (
				<FlatList
					style={{ flex: 1 }}
					className="flex-1"
					data={searchRows}
					keyExtractor={keyExtractor}
					renderItem={renderItem}
					contentContainerStyle={{
						flexGrow: 1,
						padding: 16,
						paddingBottom: insets.bottom + 32,
					}}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
				/>
			)}
		</View>
	);
}
