import { fetchProfileByUsername } from "@auth/api";
import { EditProfileModal } from "@auth/components/EditProfileModal";
import { useAuthStore } from "@auth/store";
import type { Profile } from "@auth/types";
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
	RefreshControl,
	ScrollView,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NeoBadge, NeoButton, NeoCard } from "@/components/ui";
import { GuildBadge } from "@/features/guilds/components/GuildBadge";
import { getGuildInfo } from "@/features/guilds/constants";
import { fetchUserPosts, votePost } from "@/features/posts/api";
import { PostCard } from "@/features/posts/components/PostCard";
import { PostCommentsModal } from "@/features/posts/components/PostCommentsModal";
import type { Post } from "@/features/posts/types";

export default function UserProfileScreen() {
	const insets = useSafeAreaInsets();
	const { username } = useLocalSearchParams<{ username: string }>();
	const currentUser = useAuthStore((state) => state.user);
	const currentProfile = useAuthStore((state) => state.profile);

	const [targetProfile, setTargetProfile] = useState<Profile | null>(null);
	const [posts, setPosts] = useState<Post[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [activeCommentPost, setActiveCommentPost] = useState<Post | null>(
		null,
	);
	const [isCommentsOpen, setIsCommentsOpen] = useState(false);

	const loadData = useCallback(async () => {
		if (!username) return;
		try {
			const prof = await fetchProfileByUsername(username);
			setTargetProfile(prof);
			if (prof?.id) {
				const userPosts = await fetchUserPosts(prof.id);
				setPosts(userPosts);
			} else {
				setPosts([]);
			}
		} finally {
			setIsLoading(false);
			setIsRefreshing(false);
		}
	}, [username]);

	useEffect(() => {
		let isMounted = true;
		if (!username) return;
		void (async () => {
			const prof = await fetchProfileByUsername(username);
			if (!isMounted) return;
			setTargetProfile(prof);
			if (prof?.id) {
				const userPosts = await fetchUserPosts(prof.id);
				if (isMounted) setPosts(userPosts);
			} else {
				if (isMounted) setPosts([]);
			}
			if (isMounted) setIsLoading(false);
		})();
		return () => {
			isMounted = false;
		};
	}, [username]);

	const onRefresh = () => {
		setIsRefreshing(true);
		void loadData();
	};

	const handleVote = async (post: Post, targetVote: 1 | -1) => {
		if (!currentUser?.id) return;
		const currentVote = post.user_vote || 0;
		const nextVote = currentVote === targetVote ? 0 : targetVote;

		let newUp = post.upvotes_count;
		let newDown = post.downvotes_count;

		if (currentVote === 1) newUp = Math.max(0, newUp - 1);
		if (currentVote === -1) newDown = Math.max(0, newDown - 1);

		if (nextVote === 1) newUp += 1;
		if (nextVote === -1) newDown += 1;

		setPosts((prev) =>
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

		await votePost(post.id, currentUser.id, targetVote);
	};

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

	return (
		<View className="flex-1 bg-background text-foreground">
			<StatusBar style="light" />

			<ScrollView
				contentContainerStyle={{
					flexGrow: 1,
					paddingTop: Math.max(insets.top, 16) + 8,
					paddingBottom: Math.max(insets.bottom, 16) + 32,
				}}
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={onRefresh}
						tintColor="#91e6b1"
					/>
				}
				showsVerticalScrollIndicator={false}>
				<View className="mx-auto w-full max-w-3xl px-4 sm:px-6">
					{/* Top Navigation */}
					<View className="mb-4 flex-row items-center justify-between">
						<NeoButton
							variant="outline"
							size="sm"
							className="size-9 px-0"
							onPress={() => router.back()}>
							<ArrowLeft
								size={16}
								color="#ffffff"
								strokeWidth={2.5}
							/>
						</NeoButton>
						<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
							USER INTEL // /u/{username}
						</Text>
						<View className="w-9" />
					</View>

					{isLoading ? (
						<View className="items-center justify-center py-20">
							<ActivityIndicator color="#91e6b1" size="large" />
						</View>
					) : (
						<>
							{/* Identity Bento Hero Card */}
							<NeoCard
								variant="default"
								className="mb-5 p-5 shadow-neo">
								<View className="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
									<View className="flex-row items-start gap-4">
										{/* Avatar */}
										<View className="size-16 items-center justify-center rounded-sm border-2 border-border bg-secondary shadow-neo-sm">
											<Text className="font-mono text-2xl text-primary">
												{initials}
											</Text>
										</View>

										{/* Identity Info */}
										<View className="flex-1">
											<View className="flex-row flex-wrap items-center gap-2">
												<Text className="font-display text-lg tracking-tight text-foreground sm:text-xl">
													{displayName}
												</Text>
												<NeoBadge
													variant="primary"
													size="sm"
													startContent={
														<CheckCircle2
															size={11}
															color="#91e6b1"
															strokeWidth={2.5}
														/>
													}>
													VERIFIED
												</NeoBadge>
												{targetProfile?.guild && (
													<GuildBadge
														guildId={
															targetProfile.guild
														}
														size="sm"
													/>
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
												<View className="mt-2 flex-row items-center gap-1.5 self-start rounded-sm border-2 border-border bg-secondary px-2 py-0.5 shadow-neo-sm">
													<BookOpen
														size={11}
														color="#91e6b1"
														strokeWidth={2.2}
													/>
													<Text className="font-mono text-[10px] text-primary uppercase">
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
												<Text className="mt-2.5 font-sans text-xs leading-relaxed text-muted-foreground sm:text-sm">
													{targetProfile.bio}
												</Text>
											) : (
												<Text className="mt-2 font-mono text-xs text-muted-foreground italic">
													No biography provided yet.
												</Text>
											)}
										</View>
									</View>

									{/* Action Button */}
									<View className="self-start sm:self-auto">
										{isOwnProfile ? (
											<NeoButton
												size="sm"
												variant="outline"
												startContent={
													<PenSquare
														size={13}
														color="#ffffff"
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

							{/* Activity Bento Grid */}
							<View className="mb-6 flex-row gap-3">
								<NeoCard
									variant="default"
									className="flex-1 items-center justify-center p-3.5 shadow-neo-sm">
									<View className="flex-row items-center gap-1.5">
										<PenSquare
											size={12}
											color="#91e6b1"
											strokeWidth={2.2}
										/>
										<Text className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
											POSTS
										</Text>
									</View>
									<Text className="mt-1 font-display text-2xl tracking-tight text-foreground">
										{posts.length}
									</Text>
								</NeoCard>

								<NeoCard
									variant="default"
									className="flex-1 items-center justify-center p-3.5 shadow-neo-sm">
									<View className="flex-row items-center gap-1.5">
										<Flame
											size={12}
											color="#91e6b1"
											strokeWidth={2.2}
										/>
										<Text className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
											KARMA
										</Text>
									</View>
									<Text className="mt-1 font-display text-2xl tracking-tight text-primary">
										{totalUpvotes}
									</Text>
								</NeoCard>

								<NeoCard
									variant="default"
									className="flex-1 items-center justify-center p-3.5 shadow-neo-sm">
									<View className="flex-row items-center gap-1.5">
										<Shield
											size={12}
											color="#38bdf8"
											strokeWidth={2.2}
										/>
										<Text className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
											HOUSE
										</Text>
									</View>
									<Text
										className="mt-1 font-display text-xs tracking-tight text-foreground uppercase sm:text-sm"
										numberOfLines={1}>
										{guildData?.name || "Unaffiliated"}
									</Text>
								</NeoCard>
							</View>

							{/* Published Transmissions Stream */}
							<View className="mb-6">
								<View className="mb-3.5 flex-row items-center justify-between border-b-2 border-border pb-2.5">
									<View className="flex-row items-center gap-2">
										<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
											TRANSMISSION ARCHIVE
										</Text>
										<NeoBadge variant="default" size="sm">
											{posts.length}
										</NeoBadge>
									</View>
								</View>

								{posts.length === 0 ? (
									<NeoCard
										variant="default"
										className="items-center justify-center p-8 text-center shadow-neo">
										<Flame
											size={24}
											color="#91e6b1"
											strokeWidth={2.2}
										/>
										<Text className="mt-2 font-display text-sm text-foreground uppercase">
											NO TRANSMISSIONS YET
										</Text>
										<Text className="mt-1 font-mono text-xs text-muted-foreground">
											This student hasn't published any
											discussions or code snippets yet.
										</Text>
									</NeoCard>
								) : (
									<View className="gap-4">
										{posts.map((post) => (
											<PostCard
												key={post.id}
												post={post}
												onVote={handleVote}
												onOpenComments={(p) => {
													setActiveCommentPost(p);
													setIsCommentsOpen(true);
												}}
											/>
										))}
									</View>
								)}
							</View>
						</>
					)}
				</View>
			</ScrollView>

			<EditProfileModal
				open={isEditModalOpen}
				onOpenChange={setIsEditModalOpen}
				onProfileUpdated={(updated) => {
					setTargetProfile(updated);
				}}
			/>

			<PostCommentsModal
				post={activeCommentPost}
				open={isCommentsOpen}
				onOpenChange={setIsCommentsOpen}
				onCommentAdded={(postId) => {
					setPosts((prev) =>
						prev.map((p) =>
							p.id === postId
								? { ...p, comments_count: p.comments_count + 1 }
								: p,
						),
					);
				}}
			/>
		</View>
	);
}
