import { fetchUserProfile, fetchUserVerification, signOut } from "@auth/api";
import { useAuthStore } from "@auth/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
	ArrowUpRight,
	CheckCircle2,
	Clock,
	Flame,
	Hash,
	LogOut,
	RefreshCw,
	ShieldCheck,
	Sparkles,
	Trophy,
	User,
} from "lucide-react-native";
import { Button, Dialog, Text } from "panelui-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { GuildSelectionModal } from "@/features/guilds/components/GuildSelectionModal";
import { GUILD_LIST } from "@/features/guilds/constants";
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
	const clearSession = useAuthStore((state) => state.clearSession);

	const [posts, setPosts] = useState<Post[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [selectedGuild, setSelectedGuild] = useState<FeedGuildFilter>("all");
	const [selectedSort, setSelectedSort] = useState<FeedSort>("hot");

	// Modals & Popups
	const [isComposerOpen, setIsComposerOpen] = useState(false);
	const [activeCommentPost, setActiveCommentPost] = useState<Post | null>(null);
	const [isCommentsOpen, setIsCommentsOpen] = useState(false);
	const [isGuildModalOpen, setIsGuildModalOpen] = useState(false);
	const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
	const [isSigningOut, setIsSigningOut] = useState(false);
	const [copiedToast, setCopiedToast] = useState<string | null>(null);

	const hasAutoPromptedRef = useRef(false);

	// Auto prompt guild modal when student is approved and unassigned (at most once if not dismissed)
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
				p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p,
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
				p.id === post.id ? { ...p, shares_count: p.shares_count + 1 } : p,
			),
		);
		setCopiedToast("Post link copied to clipboard!");
		setTimeout(() => setCopiedToast(null), 2500);
	};

	const handleSignOut = async () => {
		setIsSigningOut(true);
		try {
			await signOut();
			clearSession();
			setIsSignOutDialogOpen(false);
			router.replace("/(onboarding)/onboarding");
		} finally {
			setIsSigningOut(false);
		}
	};

	const displayName =
		profile?.username ||
		user?.user_metadata?.full_name ||
		user?.email?.split("@")[0] ||
		"Impulse Student";

	const initials = displayName.slice(0, 2).toUpperCase();
	const isAdmin = profile?.role === "admin";
	const isApproved = verification?.status === "approved";
	const isPending = verification?.status === "pending";

	return (
		<View className="min-h-screen flex-1 bg-background text-foreground">
			<StatusBar style="light" />
			{/* Toast */}
			{copiedToast && (
				<View className="fixed top-14 left-1/2 z-50 -translate-x-1/2 rounded-full border border-primary/30 bg-card/95 px-5 py-2 shadow-xl backdrop-blur-md">
					<Text weight="semibold" className="text-xs text-primary">
						{copiedToast}
					</Text>
				</View>
			)}
			{/* Sticky Top Header */}
			<header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
				<View className="mx-auto flex-row items-center justify-between px-6 py-3.5 lg:max-w-7xl lg:px-8">
					<View className="flex-row items-center gap-3">
						<Text
							weight="bold"
							className="text-lg tracking-tight text-foreground lowercase">
							impulse
						</Text>
					</View>
					{/* Center Navigation Links */}
					<View className="hidden items-center gap-2 md:flex-row">
						<Pressable
							onPress={() => setSelectedGuild("all")}
							className={`rounded-xl px-3 py-1.5 transition-all active:scale-[0.96] ${
								selectedGuild === "all"
									? "bg-primary/15 text-primary"
									: "text-muted-foreground hover:bg-muted/50"
							}`}>
							<Text
								weight={selectedGuild === "all" ? "bold" : "medium"}
								className={`text-xs ${
									selectedGuild === "all"
										? "text-primary"
										: "text-muted-foreground"
								}`}>
								Network Stream
							</Text>
						</Pressable>
						<Pressable
							onPress={() => setIsGuildModalOpen(true)}
							className="rounded-xl px-3 py-1.5 text-muted-foreground transition-all hover:bg-muted/50 active:scale-[0.96]">
							<Text weight="medium" className="text-xs text-muted-foreground">
								Faction Guilds
							</Text>
						</Pressable>
						<Pressable
							onPress={() => router.push("/(tabs)/profile")}
							className="rounded-xl px-3 py-1.5 text-muted-foreground transition-all hover:bg-muted/50 active:scale-[0.96]">
							<Text weight="medium" className="text-xs text-muted-foreground">
								Profile
							</Text>
						</Pressable>
					</View>
					{/* Right Actions */}
					<View className="flex-row items-center gap-2.5">
						{isAdmin && (
							<Button
								size="sm"
								variant="outline"
								className="transition-transform active:scale-[0.96]"
								startContent={
									<ShieldCheck size={14} className="text-primary" />
								}
								onPress={() => router.push("/(admin)")}>
								Admin Desk
							</Button>
						)}
						<Button
							size="sm"
							variant="ghost"
							className="h-9 w-9 rounded-xl active:scale-[0.96]"
							onPress={onRefresh}>
							<RefreshCw
								size={14}
								className={`text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`}
							/>
						</Button>
						<Button
							size="sm"
							variant="outline"
							className="transition-transform active:scale-[0.96]"
							startContent={
								<LogOut size={14} className="text-muted-foreground" />
							}
							onPress={() => setIsSignOutDialogOpen(true)}>
							Sign Out
						</Button>
					</View>
				</View>
			</header>
			{/* Main 12-Column Responsive Workspace */}
			<ScrollView
				className="flex-1"
				contentContainerStyle={{ flexGrow: 1 }}
				showsVerticalScrollIndicator={false}>
				<main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
					<View className="grid grid-cols-1 gap-6 lg:grid-cols-12">
						{/* Left Column (3 cols): User Card, Guild Factions, Sort Navigation */}
						<View className="space-y-5 lg:col-span-3">
							{/* User Identity Card */}
							<View className="rounded-2xl border border-border bg-card p-4 shadow-sm">
								<View className="flex-row items-center gap-3">
									<View className="h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
										<Text weight="bold" className="text-sm text-primary">
											{initials}
										</Text>
									</View>
									<View className="flex-1">
										<View className="flex-row items-center gap-1.5">
											<Text
												weight="bold"
												className="text-sm text-foreground"
												numberOfLines={1}>
												{displayName}
											</Text>
											{isApproved && (
												<CheckCircle2 size={13} className="text-emerald-400" />
											)}
										</View>
										<Text
											className="text-[11px] text-muted-foreground"
											numberOfLines={1}>
											{profile?.email || user?.email}
										</Text>
									</View>
								</View>
								<Pressable
									onPress={() => router.push("/(tabs)/profile")}
									className="mt-3 flex-row items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-muted/30 py-2 transition-all hover:bg-muted/60 active:scale-[0.96]">
									<User size={13} className="text-muted-foreground" />
									<Text weight="medium" className="text-xs text-foreground">
										View Profile
									</Text>
								</Pressable>
							</View>
							{/* Sort Options */}
							<View className="rounded-2xl border border-border bg-card p-4 shadow-sm">
								<Text
									weight="bold"
									className="mb-2.5 text-xs tracking-wider text-muted-foreground uppercase">
									Sort Stream (This should be on)
								</Text>
								<View className="flex-row gap-1 rounded-xl bg-muted/40 p-1">
									<Pressable
										onPress={() => setSelectedSort("hot")}
										className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-1.5 transition-all active:scale-[0.96] ${
											selectedSort === "hot" ? "bg-card shadow-sm" : ""
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
											className={`text-xs ${selectedSort === "hot" ? "text-primary" : "text-muted-foreground"}`}>
											Hot
										</Text>
									</Pressable>
									<Pressable
										onPress={() => setSelectedSort("new")}
										className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-1.5 transition-all active:scale-[0.96] ${
											selectedSort === "new" ? "bg-card shadow-sm" : ""
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
											className={`text-xs ${selectedSort === "new" ? "text-primary" : "text-muted-foreground"}`}>
											New
										</Text>
									</Pressable>
									<Pressable
										onPress={() => setSelectedSort("top")}
										className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-1.5 transition-all active:scale-[0.96] ${
											selectedSort === "top" ? "bg-card shadow-sm" : ""
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
											className={`text-xs ${selectedSort === "top" ? "text-primary" : "text-muted-foreground"}`}>
											Top
										</Text>
									</Pressable>
								</View>
							</View>
						</View>
						{/* Center Column (6 cols): Composer, Guild Banner, Stream */}
						<View className="space-y-5 lg:col-span-6">
							{/* Quick Facebook-style Composer Box */}
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
											<Sparkles size={20} className="text-primary" />
											<View>
												<Text weight="bold" className="text-sm text-foreground">
													Student ID Confirmed: Choose Your Faction Guild!
												</Text>
												<Text className="text-xs text-muted-foreground">
													Select between Octagram (Dev/Hacking), Chameleon
													(GFX), or Blue Jays (Social).
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
									<Clock size={18} className="text-amber-400" />
									<View className="flex-1">
										<Text weight="bold" className="text-xs text-amber-400">
											Student ID Verification Pending
										</Text>
										<Text className="text-[11px] text-muted-foreground">
											Your submission is under review by campus administrators.
											Faction induction will unlock upon approval.
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
									<Flame size={28} className="text-muted-foreground" />
									<Text
										weight="bold"
										className="mt-3 text-base text-foreground">
										No posts in this stream yet
									</Text>
									<Text className="mt-1 max-w-sm text-xs text-muted-foreground">
										Be the first to publish a technical update or discuss with
										your peers.
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
						{/* Right Column (3 cols): Faction Spotlights & Trending Topics */}
						<View className="space-y-5 lg:col-span-3">
							{/* Factions Spotlight Card */}
							<View className="rounded-2xl border border-border bg-card p-4 shadow-sm">
								<Text
									weight="bold"
									className="mb-3 text-xs tracking-wider text-muted-foreground uppercase">
									Campus Factions
								</Text>
								<View className="space-y-3">
									{GUILD_LIST.map((guild) => (
										<View
											key={guild.id}
											className={`rounded-xl border p-3 ${guild.badgeBorderColor} ${guild.badgeBgColor}`}>
											<View className="flex-row items-center gap-2">
												<Image
													source={guild.logo}
													style={{ width: 16, height: 16 }}
													contentFit="contain"
												/>
												<Text
													weight="bold"
													className={`text-xs ${guild.badgeTextColor}`}>
													{guild.name}
												</Text>
											</View>
											<Text
												className="mt-1 line-clamp-2 text-[11px] text-muted-foreground"
												numberOfLines={2}>
												{guild.tagline}
											</Text>
										</View>
									))}
								</View>
							</View>
							{/* Trending Campus Topics */}
							<View className="rounded-2xl border border-border bg-card p-4 shadow-sm">
								<View className="mb-3 flex-row items-center gap-1.5">
									<Hash size={14} className="text-muted-foreground" />
									<Text
										weight="bold"
										className="text-xs tracking-wider text-muted-foreground uppercase">
										Trending Topics
									</Text>
								</View>
								<View className="flex-row flex-wrap gap-1.5">
									{[
										"#algorithms",
										"#redis",
										"#designsystems",
										"#hackathons",
										"#rust",
										"#python",
										"#uidesign",
										"#careers",
									].map((tag) => (
										<View
											key={tag}
											className="rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1">
											<Text className="text-[11px] text-muted-foreground">
												{tag}
											</Text>
										</View>
									))}
								</View>
							</View>
							{/* Admin Gateway Card if Admin */}
							{isAdmin && (
								<View className="rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-sm">
									<View className="mb-1.5 flex-row items-center gap-2">
										<ShieldCheck size={16} className="text-primary" />
										<Text weight="bold" className="text-xs text-foreground">
											Admin Moderation
										</Text>
									</View>
									<Text className="mb-3 text-[11px] text-muted-foreground">
										Review pending ID verifications and manage member roles.
									</Text>
									<Button
										size="sm"
										variant="primary"
										fullWidth
										endContent={
											<ArrowUpRight
												size={13}
												className="text-primary-foreground"
											/>
										}
										onPress={() => router.push("/(admin)")}>
										Launch Admin Panel
									</Button>
								</View>
							)}
						</View>
					</View>
				</main>
			</ScrollView>
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
			{/* Sign Out Confirmation Dialog */}
			<Dialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
				<Dialog.Content className="mx-4 max-w-sm rounded-2xl border border-border bg-card p-6">
					<Dialog.Title weight="bold" className="text-xl text-foreground">
						Sign Out
					</Dialog.Title>
					<Dialog.Description className="mt-2 text-sm text-muted-foreground">
						Are you sure you want to sign out of your Impulse account?
					</Dialog.Description>
					<Dialog.Footer className="mt-6 flex-row gap-2.5">
						<Button
							size="md"
							variant="outline"
							className="flex-1"
							onPress={() => setIsSignOutDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							size="md"
							variant="destructive"
							className="flex-1"
							loading={isSigningOut}
							onPress={handleSignOut}>
							Sign Out
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>
		</View>
	);
}
