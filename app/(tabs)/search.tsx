import { searchUsers } from "@auth/api";
import { useAuthStore } from "@auth/store";
import type { Profile } from "@auth/types";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
	CheckCircle2,
	FileText,
	Hash,
	Search,
	Users,
	X,
} from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GuildBadge } from "@/features/guilds/components/GuildBadge";
import { searchPosts, votePost } from "@/features/posts/api";
import { PostCard } from "@/features/posts/components/PostCard";
import type { Post } from "@/features/posts/types";

type SearchFilterTab = "all" | "posts" | "users";

const QUICK_TAGS = [
	"react",
	"algorithms",
	"webdev",
	"security",
	"ui",
	"python",
	"mobile",
	"database",
];

export default function SearchScreen() {
	const insets = useSafeAreaInsets();
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);

	const userId = user?.id;
	const userGuild = profile?.guild;

	const [query, setQuery] = useState("");
	const [activeTab, setActiveTab] = useState<SearchFilterTab>("all");
	const [postResults, setPostResults] = useState<Post[]>([]);
	const [userResults, setUserResults] = useState<Profile[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [hasSearched, setHasSearched] = useState(false);

	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const executeSearch = useCallback(
		async (searchTerm: string) => {
			const trimmed = searchTerm.trim();
			if (!trimmed) {
				setPostResults([]);
				setUserResults([]);
				setIsSearching(false);
				setHasSearched(false);
				return;
			}

			setIsSearching(true);
			setHasSearched(true);

			try {
				const [posts, users] = await Promise.all([
					searchPosts(trimmed, userId, userGuild),
					searchUsers(trimmed),
				]);
				setPostResults(posts);
				setUserResults(users);
			} catch {
				setPostResults([]);
				setUserResults([]);
			} finally {
				setIsSearching(false);
			}
		},
		[userId, userGuild],
	);

	const handleQueryChange = (text: string) => {
		setQuery(text);
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}
		debounceTimerRef.current = setTimeout(() => {
			void executeSearch(text);
		}, 250);
	};

	const handleClear = () => {
		setQuery("");
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}
		setPostResults([]);
		setUserResults([]);
		setHasSearched(false);
		setIsSearching(false);
	};

	const handleTagPress = (tag: string) => {
		setQuery(tag);
		void executeSearch(tag);
	};

	const handleVote = async (post: Post, targetVote: 1 | -1) => {
		if (!user?.id) return;
		const currentVote = post.user_vote || 0;
		const nextVote = currentVote === targetVote ? 0 : targetVote;

		let newUp = post.upvotes_count;
		let newDown = post.downvotes_count;

		if (currentVote === 1) newUp = Math.max(0, newUp - 1);
		if (currentVote === -1) newDown = Math.max(0, newDown - 1);

		if (nextVote === 1) newUp += 1;
		if (nextVote === -1) newDown += 1;

		setPostResults((prev) =>
			prev.map((p) =>
				p.id === post.id
					? {
							...p,
							upvotes_count: newUp,
							downvotes_count: newDown,
							user_vote: nextVote,
						}
					: p,
			),
		);

		await votePost(post.id, user.id, targetVote);
	};

	const showPosts = activeTab === "all" || activeTab === "posts";
	const showUsers = activeTab === "all" || activeTab === "users";
	const hasTabResults =
		activeTab === "all"
			? postResults.length > 0 || userResults.length > 0
			: activeTab === "posts"
				? postResults.length > 0
				: userResults.length > 0;

	return (
		<View
			style={{ flex: 1, backgroundColor: "#0a0a0c" }}
			className="flex-1 bg-background text-foreground">
			<StatusBar style="light" />

			{/* Search Screen Header */}
			<View
				style={{ paddingTop: Math.max(insets.top, 16) + 4 }}
				className="border-b-2 border-border bg-card px-4 pb-4 shadow-neo-sm">
				<Text className="font-display text-xl tracking-tight text-foreground uppercase">
					CAMPUS DISCOVERY
				</Text>
				<Text className="mt-0.5 font-mono text-xs text-muted-foreground uppercase">
					SEARCH TRANSMISSIONS, TOPICS, AND STUDENTS
				</Text>

				{/* Search Input Bar */}
				<View className="mt-3 flex-row items-center rounded-sm border-2 border-border bg-secondary px-3 py-2 shadow-neo-sm focus-within:border-primary">
					<Search size={16} color="#91e6b1" strokeWidth={2.5} />
					<TextInput
						value={query}
						onChangeText={handleQueryChange}
						placeholder="Search by keywords, #tag, or @handle..."
						placeholderTextColor="#6c7284"
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
							className="rounded-xs bg-card p-1">
							<X size={13} color="#9aa1b2" />
						</Pressable>
					) : null}
				</View>

				{/* Filter Tab Switchers */}
				<View className="mt-3 flex-row gap-2">
					{(["all", "posts", "users"] as SearchFilterTab[]).map(
						(tab) => {
							const isSelected = activeTab === tab;
							const label =
								tab === "all"
									? "ALL RESULTS"
									: tab === "posts"
										? `POSTS (${postResults.length})`
										: `STUDENTS (${userResults.length})`;

							return (
								<Pressable
									key={tab}
									onPress={() => setActiveTab(tab)}
									className={`flex-1 items-center justify-center rounded-sm border-2 py-1.5 shadow-neo-sm active:translate-x-px active:translate-y-px ${
										isSelected
											? "border-primary bg-primary"
											: "border-border bg-secondary"
									}`}>
									<Text
										className={`font-bold font-mono text-[10px] uppercase ${
											isSelected
												? "text-black"
												: "text-foreground"
										}`}>
										{label}
									</Text>
								</Pressable>
							);
						},
					)}
				</View>
			</View>

			{/* Search Content Body */}
			{isSearching ? (
				<View
					style={{ flex: 1 }}
					className="flex-1 items-center justify-center">
					<ActivityIndicator size="large" color="#91e6b1" />
					<Text className="mt-3 font-mono text-xs text-muted-foreground uppercase">
						SCANNING DATABASE...
					</Text>
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
					{/* Quick Topic Tags */}
					<View className="rounded-sm border-2 border-border bg-card p-4 shadow-neo-sm">
						<View className="mb-3 flex-row items-center gap-2">
							<Hash size={14} color="#91e6b1" strokeWidth={2.2} />
							<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
								POPULAR TOPIC CHANNELS
							</Text>
						</View>
						<View className="flex-row flex-wrap gap-2">
							{QUICK_TAGS.map((tag) => (
								<Pressable
									key={tag}
									onPress={() => handleTagPress(tag)}
									className="rounded-sm border border-border bg-secondary px-3 py-1.5 active:translate-x-px active:translate-y-px active:border-primary">
									<Text className="font-mono text-xs text-primary">
										#{tag}
									</Text>
								</Pressable>
							))}
						</View>
					</View>

					{/* Discovery Hints Card */}
					<View className="mt-4 rounded-sm border-2 border-border bg-card p-4 shadow-neo-sm">
						<Text className="font-mono text-xs leading-relaxed text-muted-foreground">
							Search across public campus transmissions and your
							house feed. Enter student names, handles, or
							technical topics to find collaborators.
						</Text>
					</View>
				</ScrollView>
			) : !hasTabResults ? (
				<View
					style={{ flex: 1 }}
					className="flex-1 items-center justify-center p-6">
					<View className="size-14 items-center justify-center rounded-sm border-2 border-border bg-card shadow-neo-sm">
						<Search size={24} color="#6c7284" />
					</View>
					<Text className="mt-4 text-center font-display text-base text-foreground uppercase">
						{activeTab === "posts"
							? `NO TRANSMISSIONS MATCHING "${query}"`
							: activeTab === "users"
								? `NO STUDENTS MATCHING "${query}"`
								: `NO RESULTS MATCHING "${query}"`}
					</Text>
					<Text className="mt-1 text-center font-mono text-xs leading-relaxed text-muted-foreground">
						{activeTab === "posts"
							? "No matching transmissions found in your house or public feed."
							: activeTab === "users"
								? "No student profiles found matching this name, handle, or house."
								: "Check your keyword or try searching by popular topics like algorithms, mobile, or react."}
					</Text>
				</View>
			) : (
				<ScrollView
					style={{ flex: 1 }}
					className="flex-1"
					contentContainerStyle={{
						flexGrow: 1,
						padding: 16,
						paddingBottom: insets.bottom + 32,
					}}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled">
					{/* User Results Section */}
					{showUsers && userResults.length > 0 && (
						<View className="mb-5">
							<View className="mb-3 flex-row items-center gap-2">
								<Users
									size={14}
									color="#91e6b1"
									strokeWidth={2.2}
								/>
								<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
									STUDENTS ({userResults.length})
								</Text>
							</View>

							<View className="gap-2.5">
								{userResults.map((usr, index) => {
									const uName =
										usr.display_name ||
										usr.username ||
										"Student";
									const uInitials = (uName || "S")
										.slice(0, 2)
										.toUpperCase();

									return (
										<Pressable
											key={
												usr.id ||
												usr.username ||
												`student-${index}`
											}
											onPress={() => {
												if (usr.username) {
													router.push(
														`/(tabs)/u/${usr.username}`,
													);
												}
											}}
											className="flex-row items-center justify-between rounded-sm border-2 border-border bg-card p-3 shadow-neo-sm active:translate-x-px active:translate-y-px active:border-primary">
											<View className="flex-1 flex-row items-center gap-3">
												{/* Student Avatar */}
												<View className="size-11 items-center justify-center overflow-hidden rounded-sm border-2 border-border bg-secondary shadow-neo-sm">
													{usr.avatar_url &&
													usr.avatar_url.startsWith(
														"http",
													) ? (
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
														<Text className="font-bold font-mono text-xs text-foreground">
															{uInitials}
														</Text>
													)}
												</View>

												{/* Names & Degrees */}
												<View className="flex-1">
													<View className="flex-row items-center gap-1.5">
														<Text
															className="font-display text-sm text-foreground"
															numberOfLines={1}>
															{uName}
														</Text>
														<CheckCircle2
															size={12}
															color="#91e6b1"
															strokeWidth={2.5}
														/>
													</View>
													<Text className="font-mono text-xs text-muted-foreground">
														@
														{usr.username ||
															"student"}
													</Text>
													{(usr.course ||
														usr.year_level) && (
														<View className="mt-1 flex-row items-center gap-1">
															<Text className="font-mono text-[10px] text-primary">
																{[
																	usr.course,
																	usr.year_level
																		? `Year ${usr.year_level}`
																		: null,
																]
																	.filter(
																		Boolean,
																	)
																	.join(
																		" • ",
																	)}
															</Text>
														</View>
													)}
												</View>
											</View>

											{/* House Badge */}
											{usr.guild ? (
												<GuildBadge
													guildId={usr.guild}
													size="sm"
												/>
											) : null}
										</Pressable>
									);
								})}
							</View>
						</View>
					)}

					{/* Posts Results Section */}
					{showPosts && postResults.length > 0 && (
						<View>
							<View className="mb-3 flex-row items-center gap-2">
								<FileText
									size={14}
									color="#91e6b1"
									strokeWidth={2.2}
								/>
								<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
									TRANSMISSIONS ({postResults.length})
								</Text>
							</View>

							<View>
								{postResults.map((p) => (
									<PostCard
										key={p.id}
										post={p}
										onVote={handleVote}
										onOpenComments={(targetPost) => {
											router.push(
												`/post/${targetPost.id}` as any,
											);
										}}
									/>
								))}
							</View>
						</View>
					)}
				</ScrollView>
			)}
		</View>
	);
}
