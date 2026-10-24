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
	Share2,
} from "lucide-react-native";
import { Button, Text } from "panelui-native";
import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Clipboard,
	Pressable,
	RefreshControl,
	ScrollView,
	Share,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GuildBadge } from "@/features/guilds/components/GuildBadge";
import { fetchUserPosts, sharePost, votePost } from "@/features/posts/api";
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
	const [copiedToast, setCopiedToast] = useState<string | null>(null);

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
		setIsLoading(true);
		void loadData();
	}, [loadData]);

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

	const handleShare = async (post: Post) => {
		const text = `[Impulse] ${post.title} — Shared from IT/CS Student Network`;
		try {
			if (Share && Share.share) {
				await Share.share({ message: text });
			} else if (
				typeof navigator !== "undefined" &&
				navigator.clipboard
			) {
				await navigator.clipboard.writeText(text);
			} else {
				Clipboard.setString(text);
			}
		} catch {
			Clipboard.setString(text);
		}
		await sharePost(post.id);
		setPosts((prev) =>
			prev.map((p) =>
				p.id === post.id
					? { ...p, shares_count: p.shares_count + 1 }
					: p,
			),
		);
		setCopiedToast("Post link copied to clipboard!");
		setTimeout(() => setCopiedToast(null), 2500);
	};

	const handleShareProfile = async () => {
		const text = `Check out @${targetProfile?.username || username} on Impulse!`;
		try {
			if (Share && Share.share) {
				await Share.share({ message: text });
			} else if (
				typeof navigator !== "undefined" &&
				navigator.clipboard
			) {
				await navigator.clipboard.writeText(text);
			} else {
				Clipboard.setString(text);
			}
		} catch {
			Clipboard.setString(text);
		}
		setCopiedToast("Profile link copied!");
		setTimeout(() => setCopiedToast(null), 2500);
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

	return (
		<View className="flex-1 bg-background text-foreground">
			<StatusBar style="light" />

			{copiedToast && (
				<View className="fixed top-12 left-1/2 z-50 -translate-x-1/2 rounded-full border border-primary/30 bg-card/95 px-5 py-2 shadow-xl">
					<Text weight="semibold" className="text-xs text-primary">
						{copiedToast}
					</Text>
				</View>
			)}

			<ScrollView
				contentContainerStyle={{
					paddingTop: Math.max(insets.top, 16) + 12,
					paddingBottom: Math.max(insets.bottom, 16) + 32,
				}}
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={onRefresh}
						tintColor="#10b981"
					/>
				}
				showsVerticalScrollIndicator={false}>
				<View className="mx-auto w-full max-w-3xl px-4 sm:px-6">
					{/* Top Navigation */}
					<View className="mb-4 flex-row items-center justify-between">
						<Pressable
							onPress={() => router.back()}
							className="h-9 w-9 items-center justify-center rounded-xl border border-border bg-card active:scale-[0.96]">
							<ArrowLeft size={16} color="#ffffff" />
						</Pressable>
						<Text
							weight="bold"
							className="text-sm text-muted-foreground lowercase">
							/u/{username}
						</Text>
						<View className="w-9" />
					</View>

					{isLoading ? (
						<View className="items-center justify-center py-20">
							<ActivityIndicator color="#10b981" size="large" />
						</View>
					) : (
						<>
							{/* Profile Card Header */}
							<View className="mb-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
								<View className="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
									<View className="flex-row items-start gap-4">
										{/* Avatar */}
										<View className="h-16 w-16 items-center justify-center rounded-2xl border border-primary/25 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 shadow-sm">
											<Text
												weight="bold"
												className="text-2xl text-primary">
												{initials}
											</Text>
										</View>

										{/* Identity Info */}
										<View className="flex-1">
											<View className="flex-row flex-wrap items-center gap-2">
												<Text
													weight="bold"
													className="text-xl tracking-tight text-foreground sm:text-2xl">
													{displayName}
												</Text>
												<View className="flex-row items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5">
													<CheckCircle2
														size={11}
														color="#10b981"
													/>
													<Text
														weight="semibold"
														className="text-[10px] text-emerald-400">
														Verified Student
													</Text>
												</View>
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

											{targetProfile?.major ? (
												<View className="mt-2 flex-row items-center gap-1.5">
													<BookOpen
														size={12}
														color="#a1a1aa"
													/>
													<Text className="text-xs text-muted-foreground">
														{targetProfile.major}
													</Text>
												</View>
											) : null}

											{targetProfile?.bio ? (
												<Text className="mt-2.5 text-xs leading-relaxed text-foreground/90 sm:text-sm">
													{targetProfile.bio}
												</Text>
											) : (
												<Text className="mt-2 text-xs text-muted-foreground italic">
													No biography provided yet.
												</Text>
											)}
										</View>
									</View>

									{/* Action button */}
									<View className="self-start sm:self-auto">
										{isOwnProfile ? (
											<Button
												size="sm"
												variant="primary"
												startContent={
													<PenSquare
														size={13}
														color="#ffffff"
													/>
												}
												onPress={() =>
													setIsEditModalOpen(true)
												}>
												Edit Profile
											</Button>
										) : (
											<Button
												size="sm"
												variant="outline"
												startContent={
													<Share2
														size={13}
														color="#ffffff"
													/>
												}
												onPress={handleShareProfile}>
												Share
											</Button>
										)}
									</View>
								</View>

								{/* Metrics row */}
								<View className="mt-6 grid grid-cols-2 gap-3 border-t border-border/70 pt-4 sm:grid-cols-3">
									<View className="rounded-xl border border-border/60 bg-muted/20 p-3 text-center">
										<Text
											weight="bold"
											className="font-mono text-lg text-foreground">
											{posts.length}
										</Text>
										<Text className="text-[11px] text-muted-foreground">
											Posts Published
										</Text>
									</View>
									<View className="rounded-xl border border-border/60 bg-muted/20 p-3 text-center">
										<Text
											weight="bold"
											className="font-mono text-lg text-emerald-400">
											{totalUpvotes}
										</Text>
										<Text className="text-[11px] text-muted-foreground">
											Reputation Karma
										</Text>
									</View>
									<View className="col-span-2 rounded-xl border border-border/60 bg-muted/20 p-3 text-center sm:col-span-1">
										<Text
											weight="bold"
											className="text-lg text-indigo-400 capitalize">
											{targetProfile?.guild ||
												"Unaffiliated"}
										</Text>
										<Text className="text-[11px] text-muted-foreground">
											Faction Track
										</Text>
									</View>
								</View>
							</View>

							{/* Authored Posts Section */}
							<View className="mb-6">
								<View className="mb-3.5 flex-row items-center justify-between">
									<Text
										weight="bold"
										className="text-base text-foreground">
										Published Posts ({posts.length})
									</Text>
								</View>

								{posts.length === 0 ? (
									<View className="items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
										<Flame size={24} color="#a1a1aa" />
										<Text
											weight="semibold"
											className="mt-2 text-sm text-foreground">
											No posts yet
										</Text>
										<Text className="mt-1 text-xs text-muted-foreground">
											This student hasn't published any
											discussions or code snippets yet.
										</Text>
									</View>
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
												onShare={handleShare}
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
