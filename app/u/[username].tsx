import { fetchProfileByUsername, fetchUserVerification } from "@auth/api";
import { EditProfileModal } from "@auth/components/EditProfileModal";
import { useAuthStore } from "@auth/store";
import type { Profile } from "@auth/types";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
	ArrowLeft,
	BookOpen,
	CheckCircle2,
	Flame,
	PenSquare,
	Shield,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	RefreshControl,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NeoBadge, NeoButton, NeoCard } from "@/components/ui";
import { getGuildInfo } from "@/features/guilds/constants";
import { fetchUserPosts, votePost } from "@/features/posts/api";
import { PostCard } from "@/features/posts/components/PostCard";
import type { Post } from "@/features/posts/types";

export default function UserProfileScreen() {
	const insets = useSafeAreaInsets();
	const { username } = useLocalSearchParams<{ username: string }>();
	const currentUser = useAuthStore((state) => state.user);
	const currentProfile = useAuthStore((state) => state.profile);

	const [targetProfile, setTargetProfile] = useState<Profile | null>(null);
	const [verificationStatus, setVerificationStatus] = useState<
		"pending" | "approved" | "rejected" | null
	>(null);
	const [posts, setPosts] = useState<Post[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [nextOffset, setNextOffset] = useState<number | null>(null);

	const loadData = useCallback(async () => {
		if (!username) return;
		try {
			const prof = await fetchProfileByUsername(username);
			setTargetProfile(prof);
			if (prof?.id) {
				const isSelf = Boolean(
					(currentUser?.id && prof.id === currentUser.id) ||
					(currentProfile?.username &&
						currentProfile.username.toLowerCase() ===
							username.toLowerCase()),
				);
				const viewerId = isSelf ? prof.id : currentUser?.id;
				const viewerGuild = isSelf
					? (currentProfile?.guild ?? prof.guild)
					: currentProfile?.guild;
				const isAdmin = currentProfile?.role === "admin";

				const [userPostsResult, verification] = await Promise.all([
					fetchUserPosts(
						prof.id,
						viewerId,
						viewerGuild,
						isAdmin,
						20,
						0,
					),
					fetchUserVerification(prof.id),
				]);
				setPosts(userPostsResult.items);
				setHasMore(userPostsResult.hasMore);
				setNextOffset(userPostsResult.nextOffset);
				setVerificationStatus(verification?.status ?? null);
			} else {
				setPosts([]);
				setHasMore(false);
				setNextOffset(null);
				setVerificationStatus(null);
			}
		} finally {
			setIsLoading(false);
			setIsRefreshing(false);
		}
	}, [
		username,
		currentUser?.id,
		currentProfile?.username,
		currentProfile?.guild,
		currentProfile?.role,
	]);

	const loadMore = useCallback(async () => {
		if (
			!targetProfile?.id ||
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
			const isSelf = Boolean(
				(currentUser?.id && targetProfile.id === currentUser.id) ||
				(currentProfile?.username &&
					currentProfile.username.toLowerCase() ===
						username.toLowerCase()),
			);
			const viewerId = isSelf ? targetProfile.id : currentUser?.id;
			const viewerGuild = isSelf
				? (currentProfile?.guild ?? targetProfile.guild)
				: currentProfile?.guild;
			const isAdmin = currentProfile?.role === "admin";

			const result = await fetchUserPosts(
				targetProfile.id,
				viewerId,
				viewerGuild,
				isAdmin,
				20,
				nextOffset,
			);
			setPosts((prev) => {
				const existingIds = new Set(prev.map((p) => p.id));
				const newUnique = result.items.filter(
					(p) => !existingIds.has(p.id),
				);
				return [...prev, ...newUnique];
			});
			setHasMore(result.hasMore);
			setNextOffset(result.nextOffset);
		} finally {
			setIsLoadingMore(false);
		}
	}, [
		targetProfile?.id,
		targetProfile?.guild,
		username,
		currentUser?.id,
		currentProfile?.username,
		currentProfile?.guild,
		currentProfile?.role,
		isLoading,
		isLoadingMore,
		isRefreshing,
		hasMore,
		nextOffset,
	]);

	useEffect(() => {
		if (!username) return;
		void loadData();
	}, [loadData, username]);

	const onRefresh = useCallback(() => {
		setIsRefreshing(true);
		void loadData();
	}, [loadData]);

	const patchPost = useCallback((postId: string, patch: Partial<Post>) => {
		setPosts((prev) =>
			prev.map((p) => (p.id === postId ? { ...p, ...patch } : p)),
		);
	}, []);

	const handleVote = useCallback(
		async (post: Post, targetVote: 1 | -1) => {
			const currentUserId = currentUser?.id;
			if (!currentUserId) return;
			const currentVote = post.user_vote || 0;
			const nextVote = currentVote === targetVote ? 0 : targetVote;

			let newUp = post.upvotes_count;
			let newDown = post.downvotes_count;

			if (currentVote === 1) newUp = Math.max(0, newUp - 1);
			if (currentVote === -1) newDown = Math.max(0, newDown - 1);

			if (nextVote === 1) newUp += 1;
			if (nextVote === -1) newDown += 1;

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
		[currentUser?.id, patchPost],
	);

	const handleOpenComments = useCallback((post: Post) => {
		router.push(`/post/${post.id}` as any);
	}, []);

	const handlePostUpdated = useCallback((updated: Post) => {
		setPosts((prev) =>
			prev.map((it) => (it.id === updated.id ? updated : it)),
		);
	}, []);

	const handlePostDeleted = useCallback((deletedId: string) => {
		setPosts((prev) => prev.filter((it) => it.id !== deletedId));
	}, []);

	const renderItem = useCallback(
		({ item }: { item: Post }) => (
			<View className="mx-4 mb-4">
				<PostCard
					post={item}
					onVote={handleVote}
					onOpenComments={handleOpenComments}
					onPostUpdated={handlePostUpdated}
					onPostDeleted={handlePostDeleted}
				/>
			</View>
		),
		[handleVote, handleOpenComments, handlePostUpdated, handlePostDeleted],
	);

	const isOwnProfile =
		currentUser?.id && targetProfile?.id
			? currentUser.id === targetProfile.id
			: currentProfile?.username?.toLowerCase() ===
				username?.toLowerCase();

	const displayName =
		targetProfile?.display_name ||
		targetProfile?.username ||
		username ||
		"Student";

	const initials = displayName.slice(0, 2).toUpperCase();
	const totalUpvotes = posts.reduce((acc, p) => acc + p.upvotes_count, 0);
	const guildData = getGuildInfo(targetProfile?.guild);
	const trunGuildName =
		guildData?.name === "Octagram"
			? "OCTA"
			: guildData?.name === "Chameleon"
				? "CHAM"
				: guildData?.name === "Blue Jays"
					? "BLJY"
					: "N/A";

	return (
		<View className="flex-1 bg-background text-foreground">
			<StatusBar style="dark" />

			<FlatList
				data={posts}
				keyExtractor={(item) => item.id}
				renderItem={renderItem}
				ListHeaderComponent={
					<View className="mx-auto w-full max-w-3xl px-4 sm:px-6">
						<View className="mb-3 flex-row items-center justify-between">
							<NeoButton
								variant="outline"
								size="sm"
								className="size-9 px-0"
								onPress={() => {
									if (router.canGoBack()) {
										router.back();
									} else {
										router.replace("/(tabs)");
									}
								}}>
								<ArrowLeft
									size={16}
									color="#000000"
									strokeWidth={2.5}
								/>
							</NeoButton>
							<Text className="font-bold text-xs tracking-wider text-muted-foreground uppercase">
								/u/{username}
							</Text>
							<View className="w-9" />
						</View>

						{isLoading ? (
							<View className="items-center justify-center py-20">
								<ActivityIndicator
									color="#000000"
									size="large"
								/>
							</View>
						) : (
							<>
								<NeoCard
									variant="default"
									className="mb-4 p-4 shadow-neo">
									<View className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
										<View className="flex-row items-start gap-3">
											{targetProfile?.avatar_url?.startsWith(
												"http",
											) ? (
												<Image
													source={{
														uri: targetProfile.avatar_url,
													}}
													style={{
														width: 64,
														height: 64,
														borderWidth: 2,
														borderColor: "#000000",
													}}
													contentFit="cover"
												/>
											) : (
												<View className="size-16 items-center justify-center rounded-none border-2 border-border bg-muted shadow-neo-sm">
													<Text className="font-bold text-2xl text-foreground">
														{initials}
													</Text>
												</View>
											)}

											<View className="flex-1">
												<View className="flex-row flex-wrap items-center gap-2">
													<Text className="font-display text-lg tracking-tight text-foreground sm:text-xl">
														{displayName}
													</Text>
													{verificationStatus ===
														"approved" && (
														<NeoBadge
															variant="primary"
															size="sm"
															startContent={
																<CheckCircle2
																	size={11}
																	color="#faf9f5"
																	strokeWidth={
																		2.5
																	}
																/>
															}>
															VERIFIED
														</NeoBadge>
													)}
												</View>

												<Text className="mt-0.5 font-mono text-xs text-muted-foreground">
													@
													{targetProfile?.username ||
														username}
												</Text>

												{(targetProfile?.course ||
													targetProfile?.year_level ||
													targetProfile?.major) && (
													<View className="mt-1.5 flex-row items-center gap-1.5 self-start rounded-none border-2 border-border bg-secondary px-2 py-0.5 shadow-neo-sm">
														<BookOpen
															size={11}
															color="#000000"
															strokeWidth={2.2}
														/>
														<Text
															className="font-bold text-[10px] text-foreground uppercase"
															numberOfLines={1}
															ellipsizeMode="tail">
															{[
																targetProfile.course,
																targetProfile.year_level
																	? `YEAR ${targetProfile.year_level}`
																	: null,
																!targetProfile.course &&
																!targetProfile.year_level
																	? targetProfile.major
																	: null,
															]
																.filter(Boolean)
																.join(" • ")}
														</Text>
													</View>
												)}

												{targetProfile?.bio ? (
													<Text className="mt-2 font-sans text-xs leading-relaxed text-muted-foreground sm:text-sm">
														{targetProfile.bio}
													</Text>
												) : (
													<Text className="mt-1.5 font-mono text-xs text-muted-foreground italic">
														No biography provided
														yet.
													</Text>
												)}
											</View>
										</View>

										<View className="self-start sm:self-auto">
											{isOwnProfile ? (
												<NeoButton
													size="sm"
													variant="outline"
													startContent={
														<PenSquare
															size={13}
															color="#000000"
															strokeWidth={2.2}
														/>
													}
													onPress={() =>
														setIsEditModalOpen(true)
													}>
													EDIT PROFILE
												</NeoButton>
											) : null}
										</View>
									</View>
								</NeoCard>

								<View className="mb-4 flex-row gap-2.5">
									<NeoCard
										variant="default"
										className="flex-1 items-center justify-center p-3 shadow-neo-sm">
										<View className="flex-row items-center gap-1.5">
											<PenSquare
												size={12}
												color="#000000"
												strokeWidth={2.2}
											/>
											<Text className="font-bold text-[10px] tracking-wider text-muted-foreground uppercase">
												POSTS
											</Text>
										</View>
										<Text className="mt-1 font-display text-2xl tracking-tight text-foreground">
											{posts.length}
										</Text>
									</NeoCard>

									<NeoCard
										variant="default"
										className="flex-1 items-center justify-center p-3 shadow-neo-sm">
										<View className="flex-row items-center gap-1.5">
											<Flame
												size={12}
												color="#ff2a00"
												strokeWidth={2.2}
											/>
											<Text className="font-bold text-[10px] tracking-wider text-muted-foreground uppercase">
												KARMA
											</Text>
										</View>
										<Text className="mt-1 font-display text-2xl tracking-tight text-destructive">
											{totalUpvotes}
										</Text>
									</NeoCard>

									<NeoCard
										variant="default"
										className="flex-1 items-center justify-center p-3 shadow-neo-sm">
										<View className="flex-row items-center gap-1.5">
											<Shield
												size={12}
												color="#000000"
												strokeWidth={2.2}
											/>
											<Text className="font-bold text-[10px] tracking-wider text-muted-foreground uppercase">
												HOUSE
											</Text>
										</View>
										<Text
											className="mt-1 font-display text-2xl tracking-tight text-foreground uppercase sm:text-sm"
											numberOfLines={1}>
											{trunGuildName}
										</Text>
									</NeoCard>
								</View>

								<View className="mb-4">
									<View className="mb-2.5 flex-row items-center justify-between border-b-2 border-border pb-2">
										<View className="flex-row items-center gap-2">
											<Text className="font-bold text-xs tracking-wider text-muted-foreground uppercase">
												POST ARCHIVE
											</Text>
											<NeoBadge
												variant="default"
												size="sm">
												{posts.length}
											</NeoBadge>
										</View>
									</View>
								</View>
							</>
						)}
					</View>
				}
				ListEmptyComponent={
					<View className="mx-auto w-full max-w-3xl px-4 sm:px-6">
						<NeoCard
							variant="default"
							className="items-center justify-center p-6 text-center shadow-neo">
							<Flame
								size={24}
								color="#000000"
								strokeWidth={2.2}
							/>
							<Text className="mt-2 font-display text-sm text-foreground uppercase">
								NO POSTS YET
							</Text>
							<Text className="mt-1 font-mono text-xs text-muted-foreground">
								This student hasn't published any posts yet.
							</Text>
						</NeoCard>
					</View>
				}
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
					flexGrow: 1,
					paddingTop: Math.max(insets.top, 12) + 4,
					paddingBottom: Math.max(insets.bottom, 12) + 16,
					maxWidth: 768,
					width: "100%",
					alignSelf: "center",
				}}
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={onRefresh}
						tintColor="#000000"
					/>
				}
				showsVerticalScrollIndicator={false}
			/>

			<EditProfileModal
				open={isEditModalOpen}
				onOpenChange={setIsEditModalOpen}
				onProfileUpdated={(updated) => {
					setTargetProfile(updated);
					void loadData();
				}}
			/>
		</View>
	);
}
