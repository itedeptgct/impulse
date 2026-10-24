import {
	createIdVerification,
	fetchUserProfile,
	fetchUserVerification,
	signOut,
	uploadIdDocument,
} from "@auth/api";
import { useAuthStore } from "@auth/store";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
	AlertCircle,
	ArrowLeft,
	ArrowUpRight,
	Check,
	CheckCircle2,
	Clock,
	Flame,
	LogOut,
	Mail,
	MessageSquare,
	PenSquare,
	ShieldCheck,
	Sparkles,
	UploadCloud,
	XCircle,
} from "lucide-react-native";
import { Button, Dialog, Text } from "panelui-native";
import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Clipboard,
	RefreshControl,
	ScrollView,
	Share,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GuildBadge } from "@/features/guilds/components/GuildBadge";
import { GuildSelectionModal } from "@/features/guilds/components/GuildSelectionModal";
import { getGuildInfo } from "@/features/guilds/constants";
import { fetchUserPosts, sharePost, votePost } from "@/features/posts/api";
import { PostCard } from "@/features/posts/components/PostCard";
import { PostCommentsModal } from "@/features/posts/components/PostCommentsModal";
import { PostComposerModal } from "@/features/posts/components/PostComposerModal";
import type { Comment, Post } from "@/features/posts/types";

export default function ProfileScreen() {
	const insets = useSafeAreaInsets();
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);
	const verification = useAuthStore((state) => state.verification);
	const setProfile = useAuthStore((state) => state.setProfile);
	const setVerification = useAuthStore((state) => state.setVerification);
	const clearSession = useAuthStore((state) => state.clearSession);

	const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
	const [signOutError, setSignOutError] = useState<string | null>(null);
	const [isSigningOut, setIsSigningOut] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);

	// User posts
	const [myPosts, setMyPosts] = useState<Post[]>([]);
	const [isComposerOpen, setIsComposerOpen] = useState(false);
	const [activeCommentPost, setActiveCommentPost] = useState<Post | null>(
		null,
	);
	const [isCommentsOpen, setIsCommentsOpen] = useState(false);

	// Resubmit ID state
	const [isResubmitOpen, setIsResubmitOpen] = useState(false);
	const [resubmitAsset, setResubmitAsset] =
		useState<ImagePicker.ImagePickerAsset | null>(null);
	const [isUploadingId, setIsUploadingId] = useState(false);
	const [resubmitError, setResubmitError] = useState<string | null>(null);

	// Guild Modal Trigger
	const [isGuildModalOpen, setIsGuildModalOpen] = useState(false);

	const loadUserData = useCallback(async () => {
		if (!user?.id) return;
		try {
			const [prof, verif, userPosts] = await Promise.all([
				fetchUserProfile(user.id),
				fetchUserVerification(user.id),
				fetchUserPosts(user.id),
			]);
			if (prof) setProfile(prof);
			if (verif) setVerification(verif);
			setMyPosts(userPosts);
		} finally {
			setIsRefreshing(false);
		}
	}, [user?.id, setProfile, setVerification]);

	useEffect(() => {
		if (user?.id) {
			void loadUserData();
		}
	}, [user?.id, loadUserData]);

	const onRefresh = useCallback(() => {
		setIsRefreshing(true);
		void loadUserData();
	}, [loadUserData]);

	const displayName =
		profile?.username ||
		user?.user_metadata?.full_name ||
		user?.user_metadata?.name ||
		user?.user_metadata?.username ||
		user?.email?.split("@")[0] ||
		"Impulse User";

	const email = profile?.email || user?.email || "No email available";
	const role = profile?.role || "user";
	const verificationStatus = verification?.status || "pending";
	const isAdmin = role === "admin";
	const guildInfo = getGuildInfo(profile?.guild);

	const handleConfirmSignOut = async () => {
		setIsSigningOut(true);
		setSignOutError(null);
		try {
			await signOut();
			clearSession();
			setIsSignOutDialogOpen(false);
			router.replace("/(onboarding)/onboarding");
		} catch (error: unknown) {
			const err = error as Error;
			setSignOutError(err.message || "Failed to sign out.");
		} finally {
			setIsSigningOut(false);
		}
	};

	const handlePickDocument = async () => {
		setResubmitError(null);
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			allowsEditing: false,
			quality: 0.85,
		});

		if (!result.canceled && result.assets && result.assets[0]) {
			setResubmitAsset(result.assets[0]);
		}
	};

	const handleUploadNewId = async () => {
		if (!user?.id || !resubmitAsset) return;
		setIsUploadingId(true);
		setResubmitError(null);
		try {
			const filePath = await uploadIdDocument(
				user.id,
				resubmitAsset.uri,
				resubmitAsset.fileName,
			);
			const newVerif = await createIdVerification(user.id, filePath);
			setVerification(newVerif);
			setIsResubmitOpen(false);
			setResubmitAsset(null);
		} catch (err: unknown) {
			const error = err as Error;
			setResubmitError(error.message || "Failed to upload ID document.");
		} finally {
			setIsUploadingId(false);
		}
	};

	// Voting on profile posts
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

		setMyPosts((prev) =>
			prev.map((p) =>
				p.id === post.id
					? {
							...p,
							user_vote: nextVote as any,
							upvotes_count: newUp,
							downvotes_count: newDown,
						}
					: p,
			),
		);

		try {
			await votePost(post.id, user.id, nextVote as any);
		} catch {
			// handled
		}
	};

	const handleShare = async (post: Post) => {
		const message = `Check out this Impulse post: ${post.title}`;
		try {
			if (Share && Share.share) {
				await Share.share({ message });
			} else {
				Clipboard.setString(message);
			}
			await sharePost(post.id);
		} catch {
			Clipboard.setString(message);
		}
	};

	const handleOpenComments = (post: Post) => {
		setActiveCommentPost(post);
		setIsCommentsOpen(true);
	};

	const handleCommentAdded = (postId: string, newComment: Comment) => {
		setMyPosts((prev) =>
			prev.map((p) =>
				p.id === postId || p.id === newComment.post_id
					? { ...p, comments_count: p.comments_count + 1 }
					: p,
			),
		);
	};

	const initials = displayName
		.split(" ")
		.map((part: string) => part[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	const memberSinceDate = profile?.created_at
		? new Date(profile.created_at).toLocaleDateString("en-US", {
				month: "short",
				year: "numeric",
			})
		: "Recent";

	// Calculated stats
	const totalUpvotes = myPosts.reduce((acc, p) => acc + p.upvotes_count, 0);
	const totalComments = myPosts.reduce((acc, p) => acc + p.comments_count, 0);

	if (!profile) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator color="#10b981" size="large" />
			</View>
		);
	}

	return (
		<View className="flex-1 bg-background text-foreground">
			<StatusBar style="light" />
			<ScrollView
				contentContainerStyle={{
					flexGrow: 1,
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
				<View className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
					{/* Top Header */}
					<View className="flex-row items-center justify-between pb-6">
						<View>
							<Text
								weight="bold"
								className="text-2xl tracking-tight text-foreground">
								User Profile
							</Text>
							<Text className="mt-0.5 text-xs text-muted-foreground">
								View and manage your account, posts, and
								faction.
							</Text>
						</View>
						<View className="flex-row items-center gap-2">
							<Button
								size="sm"
								variant="outline"
								className="transition-transform active:scale-[0.96]"
								startContent={
									<ArrowLeft size={14} color="#a1a1aa" />
								}
								onPress={() => router.push("/(tabs)")}>
								Return to Home
							</Button>
							<Button
								size="sm"
								variant="outline"
								className="transition-transform active:scale-[0.96]"
								startContent={
									<LogOut size={14} color="#a1a1aa" />
								}
								onPress={() => {
									setSignOutError(null);
									setIsSignOutDialogOpen(true);
								}}>
								Sign Out
							</Button>
						</View>
					</View>
					{/* Profile Hero Card */}
					<View className="mb-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
						<View className="flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
							<View className="h-16 w-16 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 shadow-sm">
								<Text
									weight="bold"
									className="text-2xl text-primary">
									{initials}
								</Text>
							</View>
							<View className="flex-1">
								<View className="flex-row flex-wrap items-center gap-2">
									<Text
										weight="bold"
										className="text-xl tracking-tight text-foreground sm:text-2xl"
										numberOfLines={1}>
										{displayName}
									</Text>
									{isAdmin && (
										<View className="flex-row items-center gap-1 rounded-full border border-primary/30 bg-primary/15 px-2.5 py-0.5">
											<ShieldCheck
												size={12}
												color="#10b981"
											/>
											<Text
												weight="semibold"
												className="text-[11px] text-primary uppercase">
												Admin
											</Text>
										</View>
									)}
									{profile.guild && (
										<GuildBadge
											guildId={profile.guild}
											size="md"
										/>
									)}
								</View>
								<Text className="mt-0.5 text-xs text-muted-foreground">
									{email}
								</Text>
								{/* Status Badges */}
								<View className="mt-3 flex-row flex-wrap items-center gap-2">
									{verificationStatus === "approved" ? (
										<View className="flex-row items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1">
											<CheckCircle2
												size={12}
												color="#10b981"
											/>
											<Text
												weight="medium"
												className="text-[11px] text-emerald-400">
												Verified
											</Text>
										</View>
									) : verificationStatus === "rejected" ? (
										<View className="flex-row items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1">
											<XCircle
												size={12}
												color="#ef4444"
											/>
											<Text
												weight="medium"
												className="text-[11px] text-destructive">
												Action Required
											</Text>
										</View>
									) : (
										<View className="flex-row items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1">
											<Clock size={12} color="#f59e0b" />
											<Text
												weight="medium"
												className="text-[11px] text-amber-400">
												Pending Verification
											</Text>
										</View>
									)}
									<View className="flex-row items-center gap-1.5 rounded-full border border-border bg-popover px-2.5 py-1">
										<Mail size={12} color="#a1a1aa" />
										<Text
											weight="medium"
											className="text-[11px] text-foreground">
											Student Email
										</Text>
									</View>
									<View className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-1">
										<Text className="text-[11px] text-muted-foreground">
											Member since {memberSinceDate}
										</Text>
									</View>
								</View>
							</View>
						</View>
					</View>
					{/* Developer Impact Metrics Grid */}
					<View className="mb-6 grid grid-cols-3 gap-3">
						<View className="items-center justify-center rounded-2xl border border-border bg-card p-4 shadow-sm">
							<View className="flex-row items-center gap-1.5 text-muted-foreground">
								<PenSquare size={14} color="#10b981" />
								<Text
									weight="medium"
									className="text-xs text-muted-foreground">
									Posts Created
								</Text>
							</View>
							<Text
								weight="bold"
								className="mt-1 font-mono text-2xl text-foreground">
								{myPosts.length}
							</Text>
						</View>
						<View className="items-center justify-center rounded-2xl border border-border bg-card p-4 shadow-sm">
							<View className="flex-row items-center gap-1.5 text-muted-foreground">
								<Flame size={14} color="#10b981" />
								<Text
									weight="medium"
									className="text-xs text-muted-foreground">
									Karma Score
								</Text>
							</View>
							<Text
								weight="bold"
								className="mt-1 font-mono text-2xl text-emerald-400">
								{totalUpvotes}
							</Text>
						</View>
						<View className="items-center justify-center rounded-2xl border border-border bg-card p-4 shadow-sm">
							<View className="flex-row items-center gap-1.5 text-muted-foreground">
								<MessageSquare size={14} color="#38bdf8" />
								<Text
									weight="medium"
									className="text-xs text-muted-foreground">
									Responses
								</Text>
							</View>
							<Text
								weight="bold"
								className="mt-1 font-mono text-2xl text-sky-400">
								{totalComments}
							</Text>
						</View>
					</View>
					{/* Faction Showcase Card */}
					<View className="mb-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
						<View className="flex-row items-center justify-between pb-3">
							<View>
								<Text
									weight="bold"
									className="text-base text-foreground">
									Faction Selection
								</Text>
								<Text className="text-xs text-muted-foreground">
									Amet ut velit aliquip eiusmod commodo cillum
									voluptate dolore ut id Lorem eiusmod.
								</Text>
							</View>
							<Button
								size="sm"
								variant="outline"
								className="transition-transform active:scale-[0.96]"
								startContent={
									<Sparkles size={13} color="#10b981" />
								}
								onPress={() => setIsGuildModalOpen(true)}>
								{profile.guild
									? "Switch Faction"
									: "Choose Faction"}
							</Button>
						</View>
						{profile.guild && guildInfo ? (
							<View
								className={`rounded-2xl border p-5 ${guildInfo.badgeBorderColor} ${guildInfo.badgeBgColor}`}>
								<View className="flex-row items-start gap-4">
									<View className="h-14 w-14 items-center justify-center rounded-2xl border border-border/80 bg-background/80 p-1.5 shadow-sm">
										<Image
											source={guildInfo.logo}
											style={{ width: 38, height: 38 }}
											contentFit="contain"
										/>
									</View>
									<View className="flex-1">
										<View className="flex-row items-center gap-2">
											<Text
												weight="bold"
												className={`text-lg ${guildInfo.badgeTextColor}`}>
												{guildInfo.name} Faction
											</Text>
											<View
												className={`rounded-full border px-2 py-0.5 ${guildInfo.badgeBorderColor} ${guildInfo.badgeBgColor}`}>
												<Text
													weight="bold"
													className={`text-[9px] tracking-wider uppercase ${guildInfo.badgeTextColor}`}>
													{guildInfo.badge}
												</Text>
											</View>
										</View>
										<Text className="mt-0.5 text-xs text-muted-foreground">
											{guildInfo.tagline}
										</Text>
										<Text className="mt-2 text-xs leading-relaxed text-foreground/90">
											{guildInfo.manifesto}
										</Text>
										{/* Perks Preview */}
										<View className="mt-4 grid grid-cols-1 gap-2 border-t border-border/50 pt-3 sm:grid-cols-2">
											{guildInfo.perks.map((perk) => (
												<View
													key={perk}
													className="flex-row items-center gap-1.5">
													<Check
														size={12}
														color={
															guildInfo.accentColor
														}
														strokeWidth={3}
													/>
													<Text className="text-[11px] text-foreground/80">
														{perk}
													</Text>
												</View>
											))}
										</View>
									</View>
								</View>
							</View>
						) : (
							<View className="rounded-2xl border border-border/80 bg-muted/20 p-5">
								<Text
									weight="medium"
									className="text-sm text-foreground">
									No Faction Activated
								</Text>
								<Text className="mt-1 text-xs text-muted-foreground">
									Pick your track from Octagram, Chameleon, or
									Blue Jays to unlock dedicated faction feeds,
									badges, and posting permissions.
								</Text>
								<Button
									size="sm"
									variant="primary"
									className="mt-3.5 self-start active:scale-[0.96]"
									onPress={() => setIsGuildModalOpen(true)}>
									Choose Your Faction
								</Button>
							</View>
						)}
					</View>
					{/* Admin Moderation Desk if Admin */}
					{isAdmin && (
						<View className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-sm">
							<View className="flex-row items-center justify-between">
								<View className="flex-row items-center gap-3">
									<ShieldCheck size={20} color="#10b981" />
									<View>
										<Text
											weight="bold"
											className="text-sm text-foreground">
											Admin Moderation Desk
										</Text>
										<Text className="text-xs text-muted-foreground">
											Audit student IDs and moderate
											network submissions.
										</Text>
									</View>
								</View>
								<Button
									size="sm"
									variant="primary"
									endContent={
										<ArrowUpRight
											size={14}
											color="#ffffff"
										/>
									}
									onPress={() => router.push("/(admin)")}>
									Launch
								</Button>
							</View>
						</View>
					)}
					{/* Resubmit ID Banner if Rejected */}
					{verificationStatus === "rejected" && (
						<View className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-5">
							<View className="flex-row items-start gap-3">
								<AlertCircle
									size={18}
									color="#ef4444"
									className="mt-0.5"
								/>
								<View className="flex-1">
									<Text
										weight="bold"
										className="text-sm text-destructive">
										Student ID Resubmission Required
									</Text>
									<Text className="mt-1 text-xs text-muted-foreground">
										{verification?.rejection_reason ||
											"Your ID could not be verified. Please provide a clear, valid student ID."}
									</Text>
									<Button
										size="sm"
										variant="destructive"
										className="mt-3 self-start active:scale-[0.96]"
										startContent={
											<UploadCloud
												size={14}
												color="#ffffff"
											/>
										}
										onPress={() => {
											setResubmitAsset(null);
											setResubmitError(null);
											setIsResubmitOpen(true);
										}}>
										Upload New ID
									</Button>
								</View>
							</View>
						</View>
					)}
					{/* My Published Posts Section */}
					<View className="mb-8">
						<View className="flex-row items-center justify-between pb-3.5">
							<View>
								<Text
									weight="bold"
									className="text-lg text-foreground">
									My Contributions
								</Text>
								<Text className="text-xs text-muted-foreground">
									Posts you published to your faction
								</Text>
							</View>
							<Button
								size="sm"
								variant="primary"
								className="transition-transform active:scale-[0.96]"
								startContent={
									<PenSquare size={13} color="#ffffff" />
								}
								onPress={() => setIsComposerOpen(true)}>
								New Post
							</Button>
						</View>
						{myPosts.length > 0 ? (
							<View className="gap-4">
								{myPosts.map((post) => (
									<PostCard
										key={post.id}
										post={post}
										onVote={handleVote}
										onOpenComments={handleOpenComments}
										onShare={handleShare}
									/>
								))}
							</View>
						) : (
							<View className="items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
								<PenSquare
									size={28}
									color="#a1a1aa"
									className="mb-2"
								/>
								<Text
									weight="semibold"
									className="text-sm text-foreground">
									No posts published yet
								</Text>
								<Text className="mt-1 max-w-sm text-center text-xs text-muted-foreground">
									Share code snippets, architectural ideas, or
									UI designs with your faction guild.
								</Text>
								<Button
									size="sm"
									variant="outline"
									className="mt-4 active:scale-[0.96]"
									onPress={() => setIsComposerOpen(true)}>
									Create Your First Post
								</Button>
							</View>
						)}
					</View>
					{/* Account Metadata Card */}
					<View className="rounded-2xl border border-border bg-card p-5 shadow-sm">
						<Text
							weight="semibold"
							className="mb-4 text-xs tracking-wider text-muted-foreground uppercase">
							Account Details
						</Text>
						<View className="gap-3">
							<View className="flex-row items-center justify-between border-b border-border pb-2.5">
								<Text className="text-xs text-muted-foreground">
									Email Address
								</Text>
								<Text
									weight="medium"
									className="text-xs text-foreground">
									{email}
								</Text>
							</View>
							<View className="flex-row items-center justify-between border-b border-border pb-2.5">
								<Text className="text-xs text-muted-foreground">
									Account Role
								</Text>
								<Text
									weight="medium"
									className="text-xs text-foreground capitalize">
									{role}
								</Text>
							</View>
							<View className="flex-row items-center justify-between">
								<Text className="text-xs text-muted-foreground">
									ID Verification
								</Text>
								<Text
									weight="semibold"
									className={`text-xs capitalize ${
										verificationStatus === "approved"
											? "text-emerald-400"
											: verificationStatus === "rejected"
												? "text-destructive"
												: "text-amber-400"
									}`}>
									{verificationStatus}
								</Text>
							</View>
						</View>
					</View>
				</View>
			</ScrollView>
			{/* Post Composer Modal */}
			<PostComposerModal
				open={isComposerOpen}
				onOpenChange={setIsComposerOpen}
				onPostCreated={(newPost) => setMyPosts([newPost, ...myPosts])}
				onOpenGuildModal={() => setIsGuildModalOpen(true)}
			/>
			{/* Comments Modal */}
			<PostCommentsModal
				post={activeCommentPost}
				open={isCommentsOpen}
				onOpenChange={setIsCommentsOpen}
				onCommentAdded={handleCommentAdded}
			/>
			{/* Faction Modal */}
			<GuildSelectionModal
				open={isGuildModalOpen}
				onOpenChange={setIsGuildModalOpen}
				canDismiss={true}
			/>
			{/* Resubmit ID Modal */}
			<Dialog open={isResubmitOpen} onOpenChange={setIsResubmitOpen}>
				<Dialog.Content className="mx-4 max-w-md rounded-2xl border border-border bg-card p-6">
					<Dialog.Title
						weight="bold"
						className="text-lg text-foreground">
						Resubmit Student ID
					</Dialog.Title>
					<Dialog.Description className="mt-1 text-xs text-muted-foreground">
						Select a clear, uncropped photo or scan of your GCT
						student ID card.
					</Dialog.Description>
					{resubmitError && (
						<View className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5">
							<Text className="text-xs text-destructive">
								{resubmitError}
							</Text>
						</View>
					)}
					<View className="my-4 items-center justify-center rounded-xl border border-dashed border-border bg-background p-6">
						{resubmitAsset ? (
							<View className="items-center">
								<Text
									weight="medium"
									className="text-xs text-emerald-400">
									Selected:{" "}
									{resubmitAsset.fileName || "ID Document"}
								</Text>
								<Button
									size="sm"
									variant="outline"
									className="mt-3"
									onPress={handlePickDocument}>
									Change File
								</Button>
							</View>
						) : (
							<Button
								size="sm"
								variant="outline"
								startContent={
									<UploadCloud size={14} color="#a1a1aa" />
								}
								onPress={handlePickDocument}>
								Select Image from Device
							</Button>
						)}
					</View>
					<Dialog.Footer className="mt-2 flex-row gap-2">
						<Button
							size="md"
							variant="outline"
							className="flex-1"
							onPress={() => setIsResubmitOpen(false)}>
							Cancel
						</Button>
						<Button
							size="md"
							variant="primary"
							className="flex-1"
							loading={isUploadingId}
							disabled={!resubmitAsset || isUploadingId}
							onPress={handleUploadNewId}>
							Submit for Review
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>
			{/* Sign Out Confirmation Dialog */}
			<Dialog
				open={isSignOutDialogOpen}
				onOpenChange={setIsSignOutDialogOpen}>
				<Dialog.Content className="mx-4 max-w-sm rounded-2xl border border-border bg-card p-6">
					<Dialog.Title
						weight="bold"
						className="text-xl text-foreground">
						Sign Out
					</Dialog.Title>
					<Dialog.Description className="mt-2 text-sm text-muted-foreground">
						Are you sure you want to sign out of your Impulse
						account?
					</Dialog.Description>
					{signOutError && (
						<View className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5">
							<Text className="text-xs text-destructive">
								{signOutError}
							</Text>
						</View>
					)}
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
							onPress={handleConfirmSignOut}>
							Sign Out
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>
		</View>
	);
}
