import { fetchUserProfile, fetchUserVerification } from "@auth/api";
import { useAuthStore } from "@auth/store";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Clock, Flame, Plus, Sparkles, Trophy } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NeoBadge, NeoButton, NeoCard } from "@/components/ui";
import { fetchFeedPosts, votePost } from "@/features/posts/api";
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
	const [selectedGuild] = useState<FeedGuildFilter>("all");
	const [selectedSort, setSelectedSort] = useState<FeedSort>("new");

	// Modals
	const [isComposerOpen, setIsComposerOpen] = useState(false);
	const [activeCommentPost, setActiveCommentPost] = useState<Post | null>(
		null,
	);
	const [isCommentsOpen, setIsCommentsOpen] = useState(false);

	const loadData = useCallback(async () => {
		if (!user?.id) return;
		try {
			const [prof, verif] = await Promise.all([
				fetchUserProfile(user.id),
				fetchUserVerification(user.id),
			]);
			if (prof) setProfile(prof);
			if (verif) setVerification(verif);

			const activeGuild = prof?.guild ?? profile?.guild;
			const feedPosts = await fetchFeedPosts(
				selectedGuild,
				selectedSort,
				user.id,
				activeGuild,
			);
			setPosts(feedPosts);
		} finally {
			setIsLoading(false);
			setIsRefreshing(false);
		}
	}, [
		user?.id,
		selectedGuild,
		selectedSort,
		profile?.guild,
		setProfile,
		setVerification,
	]);

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
				p.id === postId
					? { ...p, comments_count: p.comments_count + 1 }
					: p,
			),
		);
	};

	const isApproved = verification?.status === "approved";
	const isPending = verification?.status === "pending";

	const renderHeader = () => (
		<View className="pb-2">
			{/* Top Header */}
			<View className="flex-row items-center justify-between pb-4">
				<View className="flex-row items-center gap-2.5">
					<Text className="font-display text-2xl tracking-tighter text-foreground uppercase">
						IMPULSE<Text className="text-primary">.</Text>
					</Text>
				</View>
				<NeoButton
					size="sm"
					variant="primary"
					startContent={
						<Plus size={14} color="#0a0a0c" strokeWidth={2.5} />
					}
					onPress={() => setIsComposerOpen(true)}>
					NEW TRANSMISSION
				</NeoButton>
			</View>

			{/* Verification & House Induction Banner */}
			{isApproved && !profile?.guild && (
				<NeoCard
					variant="accent"
					className="mb-4"
					onPress={() => router.push("/(tabs)/profile")}>
					<View className="flex-row items-center justify-between">
						<View className="min-w-0 flex-1 flex-row items-center gap-3">
							<Sparkles
								size={18}
								color="#91e6b1"
								strokeWidth={2.5}
							/>
							<View>
								<Text className="font-display text-xs tracking-wider text-foreground uppercase">
									YOU ARE APPROVED! CHOOSE YOUR HOUSE
								</Text>
								<Text className="mt-0.5 font-mono text-xs text-muted-foreground">
									Choose Octogram, Chameleon, or Blue Jays.
								</Text>
							</View>
						</View>
						<Text className="ml-2 shrink-0 font-mono text-xs text-primary">
							SELECT →
						</Text>
					</View>
				</NeoCard>
			)}

			{isPending && (
				<NeoCard
					variant="raised"
					className="mb-4 border-2 border-warning/60 bg-warning/10">
					<View className="flex-row items-center gap-3">
						<Clock size={18} color="#fbbf24" strokeWidth={2.5} />
						<View className="flex-1">
							<View className="mb-1 flex-row items-center gap-2">
								<Text className="font-display text-xs tracking-wider text-warning uppercase">
									VERIFICATION PENDING
								</Text>
								<NeoBadge variant="outline" size="sm">
									IN QUEUE
								</NeoBadge>
							</View>
							<Text className="font-mono text-xs leading-relaxed text-muted-foreground">
								Student ID verification in queue. Feed is
								accessible in member preview mode.
							</Text>
						</View>
					</View>
				</NeoCard>
			)}

			{/* Feed Filter & Sorting Controls */}
			<View className="mb-4">
				<View className="flex-row items-center justify-between border-t-2 border-border pt-3">
					<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
						STREAM FILTER
					</Text>
					<View className="flex-row items-center gap-2">
						<NeoButton
							size="sm"
							variant={
								selectedSort === "new" ? "primary" : "outline"
							}
							startContent={
								<Sparkles
									size={13}
									color={
										selectedSort === "new"
											? "#0a0a0c"
											: "#9aa1b2"
									}
									strokeWidth={2.5}
								/>
							}
							onPress={() => setSelectedSort("new")}>
							NEW
						</NeoButton>
						<NeoButton
							size="sm"
							variant={
								selectedSort === "top" ? "primary" : "outline"
							}
							startContent={
								<Trophy
									size={13}
									color={
										selectedSort === "top"
											? "#0a0a0c"
											: "#9aa1b2"
									}
									strokeWidth={2.5}
								/>
							}
							onPress={() => setSelectedSort("top")}>
							TOP
						</NeoButton>
					</View>
				</View>
			</View>
		</View>
	);

	const renderEmpty = () => {
		if (isLoading) {
			return (
				<View className="items-center justify-center py-16">
					<Text className="font-mono text-xs text-muted-foreground">
						[LOADING IMPULSE TRANSMISSIONS...]
					</Text>
				</View>
			);
		}

		return (
			<NeoCard
				variant="default"
				className="my-6 items-center justify-center p-8 text-center">
				<Flame size={32} color="#91e6b1" strokeWidth={2.5} />
				<Text className="mt-4 font-display text-base tracking-tight text-foreground uppercase">
					NO TRANSMISSIONS FOUND
				</Text>
				<Text className="mt-1 text-center font-mono text-xs text-muted-foreground">
					Be the first to publish a technical update or question!
				</Text>
				<NeoButton
					variant="primary"
					size="sm"
					className="mt-5"
					onPress={() => setIsComposerOpen(true)}>
					+ CREATE FIRST TRANSMISSION
				</NeoButton>
			</NeoCard>
		);
	};

	return (
		<View className="flex-1 bg-background text-foreground">
			<StatusBar style="light" />

			<FlatList
				data={posts}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<PostCard
						post={item}
						onVote={handleVote}
						onOpenComments={handleOpenComments}
					/>
				)}
				ListHeaderComponent={renderHeader}
				ListEmptyComponent={renderEmpty}
				contentContainerStyle={{
					paddingTop: Math.max(insets.top, 16) + 8,
					paddingBottom: Math.max(insets.bottom, 16) + 32,
					paddingHorizontal: 16,
					maxWidth: 672,
					width: "100%",
					alignSelf: "center",
				}}
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={onRefresh}
						tintColor="#91e6b1"
					/>
				}
				showsVerticalScrollIndicator={false}
			/>

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
		</View>
	);
}
