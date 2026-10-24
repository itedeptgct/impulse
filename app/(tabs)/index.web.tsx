import { fetchUserProfile, fetchUserVerification } from "@auth/api";
import { useAuthStore } from "@auth/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Clock, Flame, RefreshCw, Sparkles, Trophy } from "lucide-react-native";
import { Button, Text } from "panelui-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";

import { GuildSelectionModal } from "@/features/guilds/components/GuildSelectionModal";
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

export default function FeedWebScreen() {
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);
	const verification = useAuthStore((state) => state.verification);
	const setProfile = useAuthStore((state) => state.setProfile);
	const setVerification = useAuthStore((state) => state.setVerification);

	const [posts, setPosts] = useState<Post[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [selectedGuild, setSelectedGuild] = useState<FeedGuildFilter>("all");
	const [selectedSort, setSelectedSort] = useState<FeedSort>("hot");

	// Modals & Popups
	const [isComposerOpen, setIsComposerOpen] = useState(false);
	const [activeCommentPost, setActiveCommentPost] = useState<Post | null>(
		null,
	);
	const [isCommentsOpen, setIsCommentsOpen] = useState(false);
	const [isGuildModalOpen, setIsGuildModalOpen] = useState(false);
	const [copiedToast, setCopiedToast] = useState<string | null>(null);

	const hasAutoPromptedRef = useRef(false);

	// Auto prompt guild modal when student is approved and unassigned
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

	// Listen for posts created in layout sidebar
	useEffect(() => {
		if (typeof window === "undefined") return;
		const handleLayoutPostCreated = (e: Event) => {
			const customEvent = e as CustomEvent<Post>;
			if (customEvent.detail) {
				setPosts((prev) => [customEvent.detail, ...prev]);
			}
		};
		window.addEventListener(
			"impulse-post-created",
			handleLayoutPostCreated,
		);
		return () =>
			window.removeEventListener(
				"impulse-post-created",
				handleLayoutPostCreated,
			);
	}, []);

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

	const handleOpenComments = (post: Post) => {
		setActiveCommentPost(post);
		setIsCommentsOpen(true);
	};

	const handleCommentAdded = (postId: string, _comment: Comment) => {
		setPosts((prev) =>
			prev.map((p) =>
				p.id === postId
					? { ...p, comments_count: p.comments_count + 1 }
					: p,
			),
		);
	};

	const handleShare = async (post: Post) => {
		const text = `[Impulse] ${post.title} — Shared from IT/CS Student Network`;
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(text);
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

	const displayName =
		profile?.display_name ||
		profile?.username ||
		user?.user_metadata?.full_name ||
		user?.email?.split("@")[0] ||
		"Student";

	const initials = displayName.slice(0, 2).toUpperCase();
	const isApproved = verification?.status === "approved";
	const isPending = verification?.status === "pending";

	return (
		<View className="space-y-4">
			{/* Toast */}
			{copiedToast && (
				<View className="fixed top-14 left-1/2 z-50 -translate-x-1/2 rounded-full border border-primary/30 bg-card/95 px-5 py-2 shadow-xl backdrop-blur-md">
					<Text weight="semibold" className="text-xs text-primary">
						{copiedToast}
					</Text>
				</View>
			)}

			{/* Stream Control Header & Sort Pills */}
			<View className="rounded-2xl border border-border bg-card p-4 shadow-sm">
				<View className="flex-row items-center justify-between">
					<View className="flex-row items-center gap-1.5 rounded-xl bg-muted/40 p-1">
						<Pressable
							onPress={() => setSelectedSort("hot")}
							className={`flex-row items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all active:scale-[0.96] ${
								selectedSort === "hot"
									? "bg-card shadow-sm"
									: ""
							}`}>
							<Flame
								size={14}
								color={
									selectedSort === "hot"
										? "#10b981"
										: "#a1a1aa"
								}
							/>
							<Text
								weight={
									selectedSort === "hot" ? "bold" : "medium"
								}
								className={`text-xs ${selectedSort === "hot" ? "text-primary" : "text-muted-foreground"}`}>
								Hot
							</Text>
						</Pressable>

						<Pressable
							onPress={() => setSelectedSort("new")}
							className={`flex-row items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all active:scale-[0.96] ${
								selectedSort === "new"
									? "bg-card shadow-sm"
									: ""
							}`}>
							<Sparkles
								size={14}
								color={
									selectedSort === "new"
										? "#10b981"
										: "#a1a1aa"
								}
							/>
							<Text
								weight={
									selectedSort === "new" ? "bold" : "medium"
								}
								className={`text-xs ${selectedSort === "new" ? "text-primary" : "text-muted-foreground"}`}>
								New
							</Text>
						</Pressable>

						<Pressable
							onPress={() => setSelectedSort("top")}
							className={`flex-row items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all active:scale-[0.96] ${
								selectedSort === "top"
									? "bg-card shadow-sm"
									: ""
							}`}>
							<Trophy
								size={14}
								color={
									selectedSort === "top"
										? "#10b981"
										: "#a1a1aa"
								}
							/>
							<Text
								weight={
									selectedSort === "top" ? "bold" : "medium"
								}
								className={`text-xs ${selectedSort === "top" ? "text-primary" : "text-muted-foreground"}`}>
								Top
							</Text>
						</Pressable>
					</View>

					<Button
						size="sm"
						variant="ghost"
						className="h-8 w-8 rounded-xl active:scale-[0.96]"
						onPress={onRefresh}>
						<RefreshCw
							size={13}
							color="#a1a1aa"
							className={isRefreshing ? "animate-spin" : ""}
						/>
					</Button>
				</View>
			</View>

			{/* Quick Post Composer Trigger Box */}
			<View className="rounded-2xl border border-border bg-card p-4 shadow-sm">
				<View className="flex-row items-center gap-3">
					<View className="h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted/70">
						<Text weight="bold" className="text-xs text-foreground">
							{initials}
						</Text>
					</View>
					<Pressable
						onPress={() => setIsComposerOpen(true)}
						className="flex-1 rounded-xl border border-border/80 bg-background/80 px-4 py-2.5 transition-colors hover:border-primary/50">
						<Text className="text-xs text-muted-foreground">
							Share an algorithm, snippet, design, or project...
						</Text>
					</Pressable>
					<Button
						size="sm"
						variant="primary"
						className="active:scale-[0.96]"
						onPress={() => setIsComposerOpen(true)}>
						Post
					</Button>
				</View>
			</View>

			{/* Guild Induction Prompt Banner if Approved & No Guild */}
			{isApproved && !profile?.guild && (
				<Pressable
					onPress={() => setIsGuildModalOpen(true)}
					className="rounded-2xl border border-primary/30 bg-primary/10 p-5 shadow-sm transition-all active:scale-[0.98]">
					<View className="flex-row items-center justify-between">
						<View className="flex-row items-center gap-3">
							<Sparkles size={20} color="#10b981" />
							<View>
								<Text
									weight="bold"
									className="text-sm text-foreground">
									Student ID Confirmed: Choose Your Faction
									Guild!
								</Text>
								<Text className="text-xs text-muted-foreground">
									Select between Octagram, Chameleon, or Blue
									Jays.
								</Text>
							</View>
						</View>
						<Button size="sm" variant="primary">
							Induct Now →
						</Button>
					</View>
				</Pressable>
			)}

			{isPending && (
				<View className="flex-row items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
					<Clock size={18} color="#fbbf24" />
					<View className="flex-1">
						<Text weight="bold" className="text-xs text-amber-400">
							Student ID Verification Pending
						</Text>
						<Text className="text-[11px] text-muted-foreground">
							Your submission is under review by campus
							administrators. Faction induction will unlock upon
							approval.
						</Text>
					</View>
				</View>
			)}

			{/* Posts Stream */}
			{isLoading ? (
				<View className="items-center justify-center py-20">
					<Text className="text-xs text-muted-foreground">
						Loading network feed...
					</Text>
				</View>
			) : posts.length === 0 ? (
				<View className="items-center justify-center rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
					<Flame size={28} color="#a1a1aa" />
					<Text
						weight="bold"
						className="mt-3 text-base text-foreground">
						No posts in this stream yet
					</Text>
					<Text className="mt-1 max-w-sm text-xs text-muted-foreground">
						Be the first to publish a technical update or discuss
						with your peers.
					</Text>
					<Button
						size="md"
						variant="primary"
						className="mt-4 active:scale-[0.96]"
						onPress={() => setIsComposerOpen(true)}>
						Create Post
					</Button>
				</View>
			) : (
				<View className="space-y-4">
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

			{/* Post Composer Modal */}
			<PostComposerModal
				open={isComposerOpen}
				onOpenChange={setIsComposerOpen}
				onPostCreated={(newPost) => setPosts([newPost, ...posts])}
				onOpenGuildModal={() => setIsGuildModalOpen(true)}
			/>

			{/* Post Comments Modal */}
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
