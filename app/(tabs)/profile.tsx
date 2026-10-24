import {
	createIdVerification,
	fetchUserProfile,
	fetchUserVerification,
	signOut,
	uploadIdDocument,
} from "@auth/api";
import { EditProfileModal } from "@auth/components/EditProfileModal";
import { useAuthStore } from "@auth/store";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
	AlertCircle,
	ArrowLeft,
	ArrowUpRight,
	BookOpen,
	CheckCircle2,
	Flame,
	LogOut,
	MessageSquare,
	PenSquare,
	Settings,
	Share2,
	ShieldCheck,
	UploadCloud,
} from "lucide-react-native";
import { Button, Dialog, Text } from "panelui-native";
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

	// Profile customization
	const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
	const [isAccountActionsOpen, setIsAccountActionsOpen] = useState(false);

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
		profile?.display_name ||
		profile?.username ||
		user?.user_metadata?.full_name ||
		user?.user_metadata?.name ||
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
							user_vote: nextVote,
							upvotes_count: newUp,
							downvotes_count: newDown,
						}
					: p,
			),
		);

		await votePost(post.id, user.id, targetVote);
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

	const handleShareProfile = async () => {
		const message = `Check out @${profile?.username || "student"} on Impulse!`;
		try {
			if (Share && Share.share) {
				await Share.share({ message });
			} else {
				Clipboard.setString(message);
			}
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
				<View className="mx-auto w-full max-w-2xl px-4 sm:px-6">
					{/* Top Header Bar */}
					<View className="flex-row items-center justify-between pb-5">
						<Pressable
							onPress={() => router.back()}
							className="flex-row items-center gap-2 rounded-xl border border-border/80 bg-card px-3 py-2">
							<ArrowLeft size={16} color="#ffffff" />
							<Text
								weight="medium"
								className="text-xs text-foreground">
								Back
							</Text>
						</Pressable>

						<Text
							weight="bold"
							className="text-base text-foreground">
							My Profile
						</Text>

						<Pressable
							onPress={() => setIsAccountActionsOpen(true)}
							className="rounded-xl border border-border/80 bg-card p-2 active:scale-95">
							<Settings size={18} color="#ffffff" />
						</Pressable>
					</View>

					{/* Social Profile Hero Card */}
					<View className="mb-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
						<View className="flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
							{/* Avatar */}
							{profile.avatar_url ? (
								<Image
									source={{ uri: profile.avatar_url }}
									style={{
										width: 72,
										height: 72,
										borderRadius: 20,
									}}
									contentFit="cover"
								/>
							) : (
								<View className="h-18 w-18 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 shadow-sm">
									<Text
										weight="bold"
										className="text-2xl text-primary">
										{initials}
									</Text>
								</View>
							)}

							<View className="min-w-0 flex-1">
								{/* Names & Badges */}
								<View className="flex-row flex-wrap items-center gap-2">
									<Text
										weight="bold"
										className="text-xl tracking-tight text-foreground sm:text-2xl"
										numberOfLines={1}>
										{displayName}
									</Text>
									{verificationStatus === "approved" && (
										<View className="flex-row items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5">
											<CheckCircle2
												size={11}
												color="#10b981"
											/>
											<Text
												weight="semibold"
												className="text-[10px] text-emerald-400">
												Verified
											</Text>
										</View>
									)}
									{isAdmin && (
										<View className="flex-row items-center gap-1 rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5">
											<ShieldCheck
												size={11}
												color="#10b981"
											/>
											<Text
												weight="semibold"
												className="text-[10px] text-primary uppercase">
												Admin
											</Text>
										</View>
									)}
								</View>

								<Text className="mt-0.5 font-mono text-xs text-muted-foreground">
									@{profile.username || "student"}
								</Text>

								{/* Major */}
								{profile.major && (
									<View className="mt-2 flex-row items-center gap-1.5">
										<BookOpen size={12} color="#10b981" />
										<Text
											weight="medium"
											className="text-xs text-primary">
											{profile.major}
										</Text>
									</View>
								)}

								{/* Faction Badge */}
								{profile.guild && (
									<View className="mt-2 self-start">
										<GuildBadge
											guildId={profile.guild}
											size="sm"
										/>
									</View>
								)}

								{/* Bio */}
								{profile.bio ? (
									<Text className="mt-3 text-xs leading-relaxed text-foreground/90">
										{profile.bio}
									</Text>
								) : (
									<Text className="mt-2 text-xs text-muted-foreground italic">
										No bio added yet. Tell the campus about
										your interests!
									</Text>
								)}
							</View>
						</View>

						{/* Action Buttons: Edit Profile & Share */}
						<View className="mt-5 flex-row gap-2.5 border-t border-border/60 pt-4">
							<Button
								size="md"
								variant="primary"
								className="flex-1 active:scale-[0.98]"
								startContent={
									<PenSquare size={14} color="#ffffff" />
								}
								onPress={() => setIsEditProfileOpen(true)}>
								Edit Profile
							</Button>
							<Button
								size="md"
								variant="outline"
								className="px-4"
								startContent={
									<Share2 size={14} color="#ffffff" />
								}
								onPress={handleShareProfile}>
								Share
							</Button>
						</View>
					</View>

					{/* Metrics Grid */}
					<View className="mb-6 grid grid-cols-3 gap-3">
						<View className="items-center justify-center rounded-2xl border border-border bg-card p-3.5 shadow-sm">
							<View className="flex-row items-center gap-1">
								<PenSquare size={13} color="#10b981" />
								<Text
									weight="medium"
									className="text-[11px] text-muted-foreground">
									Posts
								</Text>
							</View>
							<Text
								weight="bold"
								className="mt-1 font-mono text-xl text-foreground">
								{myPosts.length}
							</Text>
						</View>

						<View className="items-center justify-center rounded-2xl border border-border bg-card p-3.5 shadow-sm">
							<View className="flex-row items-center gap-1">
								<Flame size={13} color="#10b981" />
								<Text
									weight="medium"
									className="text-[11px] text-muted-foreground">
									Karma
								</Text>
							</View>
							<Text
								weight="bold"
								className="mt-1 font-mono text-xl text-emerald-400">
								{totalUpvotes}
							</Text>
						</View>

						<View className="items-center justify-center rounded-2xl border border-border bg-card p-3.5 shadow-sm">
							<View className="flex-row items-center gap-1">
								<MessageSquare size={13} color="#38bdf8" />
								<Text
									weight="medium"
									className="text-[11px] text-muted-foreground">
									Replies
								</Text>
							</View>
							<Text
								weight="bold"
								className="mt-1 font-mono text-xl text-sky-400">
								{totalComments}
							</Text>
						</View>
					</View>

					{/* Resubmit ID Banner if Rejected */}
					{verificationStatus === "rejected" && (
						<View className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
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

					{/* Published Posts Feed */}
					<View className="mb-8">
						<View className="flex-row items-center justify-between pb-3.5">
							<Text
								weight="bold"
								className="text-base text-foreground">
								Published Posts ({myPosts.length})
							</Text>
							<Button
								size="sm"
								variant="outline"
								className="h-8"
								startContent={
									<PenSquare size={12} color="#ffffff" />
								}
								onPress={() => setIsComposerOpen(true)}>
								New Post
							</Button>
						</View>

						{myPosts.length > 0 ? (
							<View className="space-y-4">
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
									UI designs with your peers.
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
				</View>
			</ScrollView>

			{/* Edit Profile Modal */}
			<EditProfileModal
				open={isEditProfileOpen}
				onOpenChange={setIsEditProfileOpen}
			/>

			{/* Account Actions & Settings Dialog */}
			<Dialog
				open={isAccountActionsOpen}
				onOpenChange={setIsAccountActionsOpen}>
				<Dialog.Content className="mx-4 max-w-sm rounded-2xl border border-border bg-card p-6">
					<Dialog.Title
						weight="bold"
						className="text-lg text-foreground">
						Account & Settings
					</Dialog.Title>
					<Dialog.Description className="mt-1 text-xs text-muted-foreground">
						Manage your student verification, faction, and account.
					</Dialog.Description>

					<View className="mt-4 space-y-3">
						{/* ID Status */}
						<View className="flex-row items-center justify-between rounded-xl border border-border/70 bg-muted/30 p-3">
							<View>
								<Text
									weight="medium"
									className="text-xs text-foreground">
									Student ID Verification
								</Text>
								<Text className="text-[10px] text-muted-foreground">
									Status: {verificationStatus}
								</Text>
							</View>
							{verificationStatus === "rejected" ? (
								<Button
									size="sm"
									variant="destructive"
									onPress={() => {
										setIsAccountActionsOpen(false);
										setIsResubmitOpen(true);
									}}>
									Resubmit
								</Button>
							) : (
								<View className="rounded-md bg-muted px-2 py-0.5">
									<Text
										weight="bold"
										className="text-[10px] text-foreground capitalize">
										{verificationStatus}
									</Text>
								</View>
							)}
						</View>

						{/* Faction Guild */}
						<View className="flex-row items-center justify-between rounded-xl border border-border/70 bg-muted/30 p-3">
							<View>
								<Text
									weight="medium"
									className="text-xs text-foreground">
									Campus Faction
								</Text>
								<Text className="text-[10px] text-muted-foreground">
									{guildInfo?.name || "None assigned"}
								</Text>
							</View>
							<Button
								size="sm"
								variant="outline"
								onPress={() => {
									setIsAccountActionsOpen(false);
									setIsGuildModalOpen(true);
								}}>
								{profile.guild ? "Switch" : "Choose"}
							</Button>
						</View>

						{/* Admin Desk Link */}
						{isAdmin && (
							<Pressable
								onPress={() => {
									setIsAccountActionsOpen(false);
									router.push("/(admin)");
								}}
								className="flex-row items-center justify-between rounded-xl border border-primary/30 bg-primary/10 p-3">
								<View className="flex-row items-center gap-2">
									<ShieldCheck size={16} color="#10b981" />
									<Text
										weight="bold"
										className="text-xs text-primary">
										Admin Moderation Desk
									</Text>
								</View>
								<ArrowUpRight size={14} color="#10b981" />
							</Pressable>
						)}

						{/* Account Email */}
						<View className="rounded-xl border border-border/70 bg-muted/20 p-3">
							<Text className="text-[10px] text-muted-foreground">
								Logged in as
							</Text>
							<Text
								weight="medium"
								className="text-xs text-foreground">
								{email}
							</Text>
							<Text className="mt-0.5 text-[10px] text-muted-foreground">
								Member since {memberSinceDate}
							</Text>
						</View>
					</View>

					<Dialog.Footer className="mt-5 flex-row gap-2">
						<Button
							size="md"
							variant="outline"
							className="flex-1"
							onPress={() => setIsAccountActionsOpen(false)}>
							Close
						</Button>
						<Button
							size="md"
							variant="destructive"
							className="flex-1"
							startContent={<LogOut size={14} color="#ffffff" />}
							onPress={() => {
								setIsAccountActionsOpen(false);
								setIsSignOutDialogOpen(true);
							}}>
							Sign Out
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>

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
						Select a clear, uncropped photo or scan of your student
						ID card.
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
