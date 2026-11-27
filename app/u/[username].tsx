import { fetchProfileByUsername, fetchUserVerification } from "@auth/api";
import { EditProfileModal } from "@auth/components/EditProfileModal";
import { ProfileSurfaceEffect } from "@auth/components/ProfileSurfaceEffect";
import { useAuthStore } from "@auth/store";
import type { Profile } from "@auth/types";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
	ArrowLeft,
	BookOpen,
	Calendar,
	CheckCircle2,
	Flame,
	PenSquare,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	RefreshControl,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getGuildInfo } from "@/features/guilds/constants";
import { fetchUserPosts, votePost } from "@/features/posts/api";
import { PostCard } from "@/features/posts/components/PostCard";
import type { Post } from "@/features/posts/types";
import { ActiveDot } from "@/features/presence";
import { toast } from "@/lib/toast";

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

	const currentUserId = currentUser?.id;
	const currentUsername = currentProfile?.username;
	const currentGuild = currentProfile?.guild;
	const currentRole = currentProfile?.role;
	const targetProfileId = targetProfile?.id;
	const targetProfileGuild = targetProfile?.guild;

	const loadData = useCallback(async () => {
		if (!username) return;
		try {
			const prof = await fetchProfileByUsername(username);
			setTargetProfile(prof);
			if (prof?.id) {
				const isSelf = Boolean(
					(currentUserId && prof.id === currentUserId) ||
					(currentUsername &&
						currentUsername.toLowerCase() ===
							username.toLowerCase()),
				);
				const viewerId = isSelf ? prof.id : currentUserId;
				const viewerGuild = isSelf
					? (currentGuild ?? prof.guild)
					: currentGuild;
				const isAdmin = currentRole === "admin";

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
	}, [username, currentUserId, currentUsername, currentGuild, currentRole]);

	const loadMore = useCallback(async () => {
		if (
			!targetProfileId ||
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
				(currentUserId && targetProfileId === currentUserId) ||
				(currentUsername &&
					currentUsername.toLowerCase() === username.toLowerCase()),
			);
			const viewerId = isSelf ? targetProfileId : currentUserId;
			const viewerGuild = isSelf
				? (currentGuild ?? targetProfileGuild)
				: currentGuild;
			const isAdmin = currentRole === "admin";

			const result = await fetchUserPosts(
				targetProfileId,
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
		targetProfileId,
		targetProfileGuild,
		username,
		currentUserId,
		currentUsername,
		currentGuild,
		currentRole,
		isLoading,
		isLoadingMore,
		isRefreshing,
		hasMore,
		nextOffset,
	]);

	useEffect(() => {
		if (!username) return;
		let cancelled = false;
		queueMicrotask(() => {
			if (!cancelled) void loadData();
		});
		return () => {
			cancelled = true;
		};
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
				if (username) {
					void fetchProfileByUsername(username).then((updated) => {
						if (updated) setTargetProfile(updated);
					});
				}
			} catch {
				patchPost(post.id, {
					upvotes_count: post.upvotes_count,
					downvotes_count: post.downvotes_count,
					user_vote: currentVote,
				});
				toast.error("Failed to update vote. Please try again.");
			}
		},
		[currentUser?.id, patchPost, username],
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
	const memberSinceDate = targetProfile?.created_at
		? new Date(targetProfile.created_at).toLocaleDateString("en-US", {
				month: "short",
				year: "numeric",
			})
		: "Recent";
	const guildData = getGuildInfo(targetProfile?.guild);
	const houseCode = guildData?.houseSymbol || "—";
	const academicLabel = [
		targetProfile?.course,
		targetProfile?.year_level ? `YEAR ${targetProfile.year_level}` : null,
		!targetProfile?.course && !targetProfile?.year_level
			? targetProfile?.major
			: null,
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<View className="flex-1 bg-background text-foreground">
			<StatusBar style="dark" />

			{/* Fixed Top Navigation Bar */}
			<View
				style={{ paddingTop: Math.max(insets.top, 8) }}
				className="z-20 border-b-2 border-border bg-background">
				<View className="mx-auto w-full max-w-3xl flex-row items-center justify-between px-4 py-2.5 sm:px-6">
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Go back"
						hitSlop={8}
						onPress={() => {
							if (router.canGoBack()) {
								router.back();
							} else {
								router.replace("/(tabs)");
							}
						}}
						className="size-9 items-center justify-center border-2 border-border bg-surface shadow-neo-xs active:translate-x-px active:translate-y-px">
						<ArrowLeft
							size={16}
							color="#000000"
							strokeWidth={2.5}
						/>
					</Pressable>

					<Text
						numberOfLines={1}
						className="mx-3 flex-1 text-center font-ndot-caps text-sm tracking-wider text-foreground uppercase">
						@{targetProfile?.username || username}
					</Text>

					<View className="size-9" />
				</View>
			</View>

			<FlatList
				data={posts}
				keyExtractor={(item) => item.id}
				renderItem={renderItem}
				ListHeaderComponent={
					<View className="mx-auto w-full max-w-3xl px-4 sm:px-6">
						{isLoading ? (
							<View className="items-center justify-center py-20">
								<ActivityIndicator
									color="#000000"
									size="large"
								/>
							</View>
						) : (
							<>
								{/* Unified Operator Dossier Card */}
								<View className="mb-6 bg-card shadow-neo">
									<View className="overflow-hidden border-2 border-border bg-card">
										{/* Animated Surface Effect Cover */}
										<View className="relative h-28 w-full bg-[#0A0A0A]">
											<ProfileSurfaceEffect
												guild={targetProfile?.guild}
												height={112}
											/>

											{/* Top Banner Stamps */}
											<View className="absolute inset-x-3 top-3 flex-row items-center justify-between gap-2">
												<View className="flex-row items-center gap-1.5 border border-white/30 bg-black/80 px-2 py-1">
													<Text className="font-bold text-2xs tracking-widest text-white uppercase">
														{guildData
															? `${guildData.houseSymbol} · ${guildData.name}`
															: "UNAFFILIATED"}
													</Text>
												</View>

												{verificationStatus ===
													"approved" && (
													<View className="flex-row items-center gap-1 border-2 border-border bg-neo-green px-2 py-0.5">
														<CheckCircle2
															size={11}
															color="#000000"
															strokeWidth={2.6}
														/>
														<Text className="font-bold text-2xs tracking-widest text-foreground uppercase">
															VERIFIED
														</Text>
													</View>
												)}
											</View>
										</View>

										{/* Avatar Seam & Identity */}
										<View className="border-t-2 border-border bg-card px-4 pb-4">
											<View className="flex-row items-end justify-between">
												<View className="relative -mt-9">
													{targetProfile?.avatar_url?.startsWith(
														"http",
													) ? (
														<Image
															source={{
																uri: targetProfile.avatar_url,
															}}
															style={{
																width: 72,
																height: 72,
																borderWidth: 2,
																borderColor:
																	"#000000",
																backgroundColor:
																	"#f4f4f0",
															}}
															contentFit="cover"
														/>
													) : (
														<View className="size-18 items-center justify-center border-2 border-border bg-surface">
															<Text className="font-display text-2xl text-foreground uppercase">
																{initials}
															</Text>
														</View>
													)}
													<ActiveDot
														userId={
															targetProfile?.id
														}
														targetShowActiveStatus={
															targetProfile?.show_active_status
														}
														size="md"
														className="absolute -right-1 -bottom-1"
													/>
												</View>

												{isOwnProfile ? (
													<Pressable
														accessibilityRole="button"
														accessibilityLabel="Edit profile"
														onPress={() =>
															setIsEditModalOpen(
																true,
															)
														}
														className="mt-2.5 flex-row items-center gap-1.5 border-2 border-border bg-surface px-3 py-1.5 active:bg-neo-green">
														<PenSquare
															size={13}
															color="#000000"
															strokeWidth={2.3}
														/>
														<Text className="font-bold text-2xs tracking-widest text-foreground uppercase">
															EDIT PROFILE
														</Text>
													</Pressable>
												) : null}
											</View>

											{/* Name & Handle */}
											<View className="mt-3">
												<Text className="font-ndot-caps text-2xl leading-none tracking-wide text-foreground uppercase">
													{displayName}
												</Text>
												<Text className="mt-1 font-mono text-xs text-muted-foreground">
													@
													{targetProfile?.username ||
														username}
												</Text>
											</View>

											{/* Bio */}
											{targetProfile?.bio ? (
												<Text className="mt-3 font-sans text-[13px] leading-relaxed text-foreground">
													{targetProfile.bio}
												</Text>
											) : (
												<Text className="mt-2.5 font-mono text-xs text-muted-foreground">
													No biography provided yet.
												</Text>
											)}

											{/* Academic & Joined Metadata */}
											<View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-1.5">
												{academicLabel ? (
													<View className="flex-row items-center gap-1.5">
														<BookOpen
															size={12}
															color="#000000"
															strokeWidth={2.2}
														/>
														<Text className="font-bold text-2xs tracking-wider text-foreground uppercase">
															{academicLabel}
														</Text>
													</View>
												) : null}
												<View className="flex-row items-center gap-1.5">
													<Calendar
														size={12}
														color="#4c4546"
														strokeWidth={2.2}
													/>
													<Text className="font-mono text-2xs tracking-wider text-muted-foreground uppercase">
														JOINED {memberSinceDate}
													</Text>
												</View>
											</View>
										</View>

										{/* Docked 3-Column Telemetry Strip */}
										<View className="flex-row border-t-2 border-border bg-surface">
											<View className="flex-1 items-center justify-center border-r-2 border-border py-3">
												<Text className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
													POSTS
												</Text>
												<Text className="mt-1 font-display text-2xl leading-none text-foreground tabular-nums">
													{posts.length}
												</Text>
											</View>

											<View className="flex-1 items-center justify-center border-r-2 border-border py-3">
												<Text className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
													KARMA
												</Text>
												<Text className="mt-1 font-display text-2xl leading-none text-destructive tabular-nums">
													{targetProfile?.karma ?? 0}
												</Text>
											</View>

											<View className="flex-1 items-center justify-center py-3">
												<Text className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
													HOUSE
												</Text>
												<Text
													numberOfLines={1}
													className="mt-1 font-display text-2xl leading-none text-foreground uppercase">
													{houseCode}
												</Text>
											</View>
										</View>
									</View>
								</View>

								{/* Archive Section Header */}
								<View className="mb-4 flex-row items-center justify-between border-b-2 border-border pb-2.5">
									<Text className="font-ndot-caps text-base tracking-wider text-foreground uppercase">
										POST ARCHIVE
									</Text>
									<View className="border-2 border-border bg-primary px-2 py-0.5">
										<Text className="font-mono text-2xs text-primary-foreground tabular-nums">
											{posts.length}
										</Text>
									</View>
								</View>
							</>
						)}
					</View>
				}
				ListEmptyComponent={
					isLoading ? null : (
						<View className="mx-auto w-full max-w-3xl px-4 sm:px-6">
							<View className="bg-card shadow-neo">
								<View className="items-center justify-center border-2 border-border bg-card p-8">
									<Flame
										size={24}
										color="#000000"
										strokeWidth={2.2}
									/>
									<Text className="mt-2.5 font-ndot-caps text-base text-foreground uppercase">
										NO POSTS YET
									</Text>
									<Text className="mt-1 text-center font-mono text-xs text-muted-foreground">
										This student hasn't published any posts
										yet.
									</Text>
								</View>
							</View>
						</View>
					)
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
					paddingTop: 16,
					paddingBottom: Math.max(insets.bottom, 12) + 20,
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
