import { fetchUserProfile, fetchUserVerification } from "@auth/api";
import { useAuthStore } from "@auth/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { Clock, Flame, Plus, Sparkles, Trophy } from "lucide-react-native";
import { Button, Text } from "panelui-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	Clipboard,
	Pressable,
	RefreshControl,
	ScrollView,
	Share,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GuildSelectionModal } from "@/features/guilds/components/GuildSelectionModal";
import { GUILD_LOGOS } from "@/features/guilds/constants";
import { fetchFeedPosts, sharePost, votePost } from "@/features/posts/api";
import { PostCard } from "@/features/posts/components/PostCard";
import { PostCommentsModal } from "@/features/posts/components/PostCommentsModal";
import { PostComposerModal } from "@/features/posts/components/PostComposerModal";
import type {
	Comment,
	FeedGuildFilter,
	FeedSort,
	Post,
} from "@/features/posts/types";

export default function FeedScreen() {
	const insets = useSafeAreaInsets();
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);
	const verification = useAuthStore((state) => state.verification);
	const setProfile = useAuthStore((state) => state.setProfile);
	const setVerification = useAuthStore((state) => state.setVerification);

	// Feed state
	const [posts, setPosts] = useState<Post[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [selectedGuild, setSelectedGuild] = useState<FeedGuildFilter>("all");
	const [selectedSort, setSelectedSort] = useState<FeedSort>("hot");

	// Modals
	const [isComposerOpen, setIsComposerOpen] = useState(false);
	const [activeCommentPost, setActiveCommentPost] = useState<Post | null>(null);
	const [isCommentsOpen, setIsCommentsOpen] = useState(false);
	const [isGuildModalOpen, setIsGuildModalOpen] = useState(false);
	const [copiedToast, setCopiedToast] = useState<string | null>(null);

	const hasAutoPromptedRef = useRef(false);

	// Check if Guild Induction modal should auto-prompt (at most once if not dismissed)
	useEffect(() => {
		if (hasAutoPromptedRef.current) return;
		if (
			verification?.status === "approved" &&
			profile &&
			!profile.guild &&
			user?.id
		) {
			void AsyncStorage.getItem(
				`impulse_guild_modal_dismissed_${user.id}`,
			).then((dismissed) => {
				if (!dismissed && !hasAutoPromptedRef.current) {
					hasAutoPromptedRef.current = true;
					setIsGuildModalOpen(true);
				}
			});
		}
	}, [verification?.status, profile, user?.id]);

	const loadData = useCallback(async () => {
		if (!user?.id) return;
		try {
			const [prof, verif, feedPosts] = await Promise.all([
				fetchUserProfile(user.id),
				fetchUserVerification(user.id),
				fetchFeedPosts(selectedGuild, selectedSort, user.id),
			]);
			if (prof) setProfile(prof);
			if (verif) setVerification(verif);
			setPosts(feedPosts);
		} finally {
			setIsLoading(false);
			setIsRefreshing(false);
		}
	}, [user?.id, selectedGuild, selectedSort, setProfile, setVerification]);

	useEffect(() => {
		void loadData();
	}, [loadData]);

	const onRefresh = () => {
		setIsRefreshing(true);
		void loadData();
	};

	// Handle Upvote / Downvote toggle
	const handleVote = async (post: Post, targetVote: 1 | -1) => {
		if (!user?.id) return;

		// Optimistic UI update
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

		await votePost(post.id, user.id, targetVote);
	};

	// Open comments modal
	const handleOpenComments = (post: Post) => {
		setActiveCommentPost(post);
		setIsCommentsOpen(true);
	};

	// Handle comment added callback
	const handleCommentAdded = (postId: string, _comment: Comment) => {
		setPosts((prev) =>
			prev.map((p) =>
				p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p,
			),
		);
	};

	// Handle post share
	const handleShare = async (post: Post) => {
		const message = `[Impulse] ${post.title} — Shared from IT/CS Student Network`;
		try {
			if (Share && Share.share) {
				await Share.share({ message });
			} else {
				Clipboard.setString(message);
			}
		} catch {
			Clipboard.setString(message);
		}

		await sharePost(post.id);
		setPosts((prev) =>
			prev.map((p) =>
				p.id === post.id ? { ...p, shares_count: p.shares_count + 1 } : p,
			),
		);

		setCopiedToast("Post link copied to clipboard!");
		setTimeout(() => setCopiedToast(null), 2500);
	};

	const isApproved = verification?.status === "approved";
	const isPending = verification?.status === "pending";

	return (
		<View className="flex-1 bg-background text-foreground">
			<StatusBar style="light" />
			{/* Toast notification */}
			{copiedToast && (
				<View className="absolute top-12 left-1/2 z-50 -translate-x-1/2 rounded-full border border-primary/30 bg-card/95 px-4 py-2 shadow-lg backdrop-blur-md">
					<Text weight="semibold" className="text-xs text-primary">
						{copiedToast}
					</Text>
				</View>
			)}
			<ScrollView
				contentContainerStyle={{
					paddingTop: Math.max(insets.top, 16) + 8,
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
				<View className="mx-auto w-full max-w-2xl px-4 sm:px-6">
					{/* Top Header */}
					<View className="flex-row items-center justify-between pb-4">
						<View className="flex-row items-center gap-2.5">
							<Text
								weight="bold"
								className="text-xl tracking-tight text-foreground lowercase">
								impulse
							</Text>
						</View>
						<View className="flex-row items-center gap-2">
							<Button
								size="sm"
								variant="primary"
								className="transition-transform active:scale-[0.96]"
								startContent={
									<Plus size={15} className="text-primary-foreground" />
								}
								onPress={() => setIsComposerOpen(true)}>
								New Post
							</Button>
							{/* <Button
								size="sm"
								variant="ghost"
								className="h-9 w-9 rounded-xl active:scale-[0.96]"
								onPress={onRefresh}>
								<RefreshCw
									size={14}
									className={`text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`}
								/>
							</Button> */}
						</View>
					</View>
					{/* Verification & Guild Induction Banner */}
					{isApproved && !profile?.guild && (
						<Pressable
							onPress={() => setIsGuildModalOpen(true)}
							className="mb-4 rounded-2xl border border-primary/30 bg-primary/10 p-4 transition-all active:scale-[0.98]">
							<View className="flex-row items-center justify-between">
								<View className="flex-row items-center gap-2.5">
									<Sparkles size={18} className="text-primary" />
									<View>
										<Text weight="bold" className="text-xs text-foreground">
											You are approved! Choose Your Faction
										</Text>
										<Text className="text-[11px] text-muted-foreground">
											Align with Octagram, Chameleon, or Blue Jays.
										</Text>
									</View>
								</View>
								<Text weight="bold" className="text-xs text-primary">
									Select →
								</Text>
							</View>
						</Pressable>
					)}
					{isPending && (
						<View className="mb-4 flex-row items-center gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3.5">
							<Clock size={15} className="shrink-0 text-amber-400" />
							<Text className="flex-1 text-xs text-muted-foreground">
								Student ID verification in queue. Feed is accessible in member
								preview mode.
							</Text>
						</View>
					)}
					{/* Feed Filter & Sorting Controls */}
					<View className="mb-4">
						{/* Sorting Controls */}
						<View className="mt-2.5 flex-row items-center justify-between border-t border-border/50 pt-2.5">
							<Text weight="medium" className="text-xs text-muted-foreground">
								Feed Sorting
							</Text>
							<View className="flex-row items-center rounded-xl border border-border/70 bg-card p-1">
								<Pressable
									onPress={() => setSelectedSort("hot")}
									className={`flex-row items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all active:scale-[0.96] ${
										selectedSort === "hot" ? "bg-primary/15" : ""
									}`}>
									<Flame
										size={13}
										className={
											selectedSort === "hot"
												? "text-primary"
												: "text-muted-foreground"
										}
									/>
									<Text
										weight={selectedSort === "hot" ? "bold" : "medium"}
										className={`text-xs ${
											selectedSort === "hot"
												? "text-primary"
												: "text-muted-foreground"
										}`}>
										Hot
									</Text>
								</Pressable>
								<Pressable
									onPress={() => setSelectedSort("new")}
									className={`flex-row items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all active:scale-[0.96] ${
										selectedSort === "new" ? "bg-primary/15" : ""
									}`}>
									<Sparkles
										size={13}
										className={
											selectedSort === "new"
												? "text-primary"
												: "text-muted-foreground"
										}
									/>
									<Text
										weight={selectedSort === "new" ? "bold" : "medium"}
										className={`text-xs ${
											selectedSort === "new"
												? "text-primary"
												: "text-muted-foreground"
										}`}>
										New
									</Text>
								</Pressable>
								<Pressable
									onPress={() => setSelectedSort("top")}
									className={`flex-row items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all active:scale-[0.96] ${
										selectedSort === "top" ? "bg-primary/15" : ""
									}`}>
									<Trophy
										size={13}
										className={
											selectedSort === "top"
												? "text-primary"
												: "text-muted-foreground"
										}
									/>
									<Text
										weight={selectedSort === "top" ? "bold" : "medium"}
										className={`text-xs ${
											selectedSort === "top"
												? "text-primary"
												: "text-muted-foreground"
										}`}>
										Top
									</Text>
								</Pressable>
							</View>
						</View>
					</View>
					{/* Posts Stream */}
					{isLoading ? (
						<View className="items-center justify-center py-16">
							<Text className="text-xs text-muted-foreground">
								Loading Impulse transmissions...
							</Text>
						</View>
					) : posts.length === 0 ? (
						<View className="items-center justify-center rounded-2xl border border-border bg-card p-10 text-center">
							<Flame size={24} className="text-muted-foreground" />
							<Text weight="bold" className="mt-2 text-sm text-foreground">
								No posts found in this feed
							</Text>
							<Text className="mt-1 text-xs text-muted-foreground">
								Be the first to publish a technical update or question!
							</Text>
							<Button
								size="sm"
								variant="primary"
								className="mt-4 active:scale-[0.96]"
								onPress={() => setIsComposerOpen(true)}>
								Create First Post
							</Button>
						</View>
					) : (
						<View>
							{posts.map((post) => (
								<PostCard
									key={post.id}
									post={post}
									onVote={handleVote}
									onOpenComments={handleOpenComments}
									onShare={handleShare}
								/>
							))}
						</View>
					)}
				</View>
			</ScrollView>
			{/* Create Post Modal */}
			<PostComposerModal
				open={isComposerOpen}
				onOpenChange={setIsComposerOpen}
				onPostCreated={(newPost) => setPosts([newPost, ...posts])}
			/>
			{/* Comments Thread Modal */}
			<PostCommentsModal
				post={activeCommentPost}
				open={isCommentsOpen}
				onOpenChange={setIsCommentsOpen}
				onCommentAdded={handleCommentAdded}
			/>
			{/* Guild Selection Induction Modal */}
			<GuildSelectionModal
				open={isGuildModalOpen}
				onOpenChange={setIsGuildModalOpen}
				canDismiss={true}
			/>
		</View>
	);
}
