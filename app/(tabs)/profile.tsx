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
	ArrowUpRight,
	BookOpen,
	CheckCircle2,
	Clock,
	Flame,
	LogOut,
	MessageSquare,
	PenSquare,
	Plus,
	Settings,
	ShieldAlert,
	ShieldCheck,
	UploadCloud,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Clipboard,
	RefreshControl,
	ScrollView,
	Share,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	MobileAlertSheet,
	MobileSheet,
	NeoBadge,
	NeoButton,
	NeoCard,
} from "@/components/ui";
import { GuildBadge } from "@/features/guilds/components/GuildBadge";
import { GuildSelectionModal } from "@/features/guilds/components/GuildSelectionModal";
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
	// const guildInfo = getGuildInfo(profile?.guild);

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

	// const handleShareProfile = async () => {
	// 	const message = `Check out @${profile?.username || "student"} on Impulse!`;
	// 	try {
	// 		if (Share && Share.share) {
	// 			await Share.share({ message });
	// 		} else {
	// 			Clipboard.setString(message);
	// 		}
	// 	} catch {
	// 		Clipboard.setString(message);
	// 	}
	// };

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
				<ActivityIndicator color="#91e6b1" size="large" />
			</View>
		);
	}

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
				<View className="mx-auto w-full max-w-2xl px-4 sm:px-6">
					{/* Top Header Bar */}
					<View className="mb-5 flex-row items-center justify-between">
						<View>
							<Text className="font-display text-xl tracking-tight text-foreground uppercase">
								STUDENT PROFILE
							</Text>
						</View>

						<View className="flex-row items-center gap-2">
							<NeoButton
								variant="outline"
								size="sm"
								onPress={() => setIsAccountActionsOpen(true)}
								className="px-2.5">
								<Settings
									size={16}
									color="#91e6b1"
									strokeWidth={2.2}
								/>
							</NeoButton>
							<NeoButton
								variant="outline"
								size="sm"
								onPress={() => setIsSignOutDialogOpen(true)}
								className="px-2.5">
								<LogOut
									size={16}
									color="#ff5c5c"
									strokeWidth={2.2}
								/>
							</NeoButton>
						</View>
					</View>

					{/* Identity Tile (NeoCard) */}
					<NeoCard variant="default" className="mb-5 p-5 shadow-neo">
						<View className="flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
							{/* Avatar */}
							{profile.avatar_url &&
							profile.avatar_url.startsWith("http") ? (
								<Image
									source={{ uri: profile.avatar_url }}
									style={{
										width: 68,
										height: 68,
										borderRadius: 4,
										borderWidth: 2,
										borderColor: "#2a2d3d",
									}}
									contentFit="cover"
								/>
							) : (
								<View className="size-17 items-center justify-center rounded-sm border-2 border-border bg-secondary shadow-neo-sm">
									<Text className="font-mono text-2xl text-primary">
										{initials}
									</Text>
								</View>
							)}

							<View className="min-w-0 flex-1">
								{/* Names & Verification / Status Badges */}
								<View className="flex-row flex-wrap items-center gap-2">
									<Text
										className="font-display text-lg tracking-tight text-foreground sm:text-xl"
										numberOfLines={1}>
										{displayName}
									</Text>

									{verificationStatus === "approved" && (
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
									)}

									{verificationStatus === "pending" && (
										<NeoBadge
											variant="default"
											size="sm"
											startContent={
												<Clock
													size={11}
													color="#9aa1b2"
													strokeWidth={2.5}
												/>
											}>
											PENDING
										</NeoBadge>
									)}

									{verificationStatus === "rejected" && (
										<NeoBadge
											variant="default"
											size="sm"
											className="border-destructive bg-destructive/15"
											textClassName="text-destructive"
											startContent={
												<ShieldAlert
													size={11}
													color="#ff5c5c"
													strokeWidth={2.5}
												/>
											}>
											UNVERIFIED
										</NeoBadge>
									)}

									{isAdmin && (
										<NeoBadge
											variant="primary"
											size="sm"
											startContent={
												<ShieldCheck
													size={11}
													color="#91e6b1"
													strokeWidth={2.5}
												/>
											}>
											ADMIN
										</NeoBadge>
									)}
								</View>

								<Text className="mt-0.5 font-mono text-xs text-muted-foreground">
									@{profile.username || "student"}
								</Text>

								{/* House Badge & Major */}
								<View className="mt-2.5 flex-row flex-wrap items-center gap-2">
									{profile.guild ? (
										<GuildBadge
											guildId={profile.guild}
											size="sm"
										/>
									) : (
										<NeoButton
											variant="outline"
											size="sm"
											onPress={() =>
												setIsGuildModalOpen(true)
											}
											className="h-6 px-2">
											<Text className="font-mono text-[10px] text-muted-foreground uppercase">
												+ Choose House
											</Text>
										</NeoButton>
									)}

									{profile.major && (
										<View className="flex-row items-center gap-1.5 rounded-sm border-2 border-border bg-secondary px-2 py-0.5">
											<BookOpen
												size={11}
												color="#91e6b1"
												strokeWidth={2.2}
											/>
											<Text className="font-mono text-[10px] text-primary uppercase">
												{profile.major}
											</Text>
										</View>
									)}
								</View>

								{/* Bio */}
								{profile.bio ? (
									<Text className="mt-3 font-sans text-xs leading-relaxed text-muted-foreground">
										{profile.bio}
									</Text>
								) : (
									<Text className="mt-2.5 font-mono text-xs text-muted-foreground italic">
										No bio added yet. Tell the campus about
										your interests!
									</Text>
								)}
							</View>
						</View>

						{/* Action Buttons: Edit Profile, Share & House Switch */}
						<View className="mt-4 flex-row flex-wrap gap-2.5 border-t-2 border-border pt-4">
							<NeoButton
								size="sm"
								variant="outline"
								className="flex-1"
								startContent={
									<PenSquare
										size={13}
										color="#ffffff"
										strokeWidth={2.2}
									/>
								}
								onPress={() => setIsEditProfileOpen(true)}>
								EDIT PROFILE
							</NeoButton>
							{/* <NeoButton
								size="sm"
								variant="outline"
								className="px-4"
								startContent={
									<Share2 size={13} color="#ffffff" strokeWidth={2.2} />
								}
								onPress={handleShareProfile}>
								SHARE
							</NeoButton> */}
							{profile.guild && (
								<NeoButton
									size="sm"
									variant="secondary"
									className="px-3"
									onPress={() => setIsGuildModalOpen(true)}>
									<Text className="font-mono text-xs text-foreground">
										SWITCH HOUSE
									</Text>
								</NeoButton>
							)}
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
								{myPosts.length}
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
								<MessageSquare
									size={12}
									color="#38bdf8"
									strokeWidth={2.2}
								/>
								<Text className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
									DISCUSSIONS
								</Text>
							</View>
							<Text className="mt-1 font-display text-2xl tracking-tight text-sky-400">
								{totalComments}
							</Text>
						</NeoCard>
					</View>

					{/* Resubmit ID Banner if Rejected */}
					{verificationStatus === "rejected" && (
						<NeoCard
							variant="default"
							className="mb-6 border-destructive bg-destructive/10 p-4 shadow-neo-sm">
							<View className="flex-row items-start gap-3">
								<AlertCircle
									size={18}
									color="#ff5c5c"
									strokeWidth={2.2}
									className="mt-0.5"
								/>
								<View className="flex-1">
									<Text className="font-display text-sm text-red-400 uppercase">
										STUDENT ID RESUBMISSION REQUIRED
									</Text>
									<Text className="mt-1 font-mono text-xs text-muted-foreground">
										{verification?.rejection_reason ||
											"Your student credentials could not be verified. Please provide a clear, valid student ID."}
									</Text>
									<NeoButton
										size="sm"
										variant="destructive"
										className="mt-3 self-start"
										startContent={
											<UploadCloud
												size={14}
												color="#ffffff"
												strokeWidth={2.2}
											/>
										}
										onPress={() => {
											setResubmitAsset(null);
											setResubmitError(null);
											setIsResubmitOpen(true);
										}}>
										UPLOAD NEW ID
									</NeoButton>
								</View>
							</View>
						</NeoCard>
					)}

					{/* Transmissions Stream */}
					<View className="mb-8">
						<View className="flex-row items-center justify-between border-b-2 border-border pb-3.5">
							<View className="flex-row items-center gap-2">
								<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
									TRANSMISSION ARCHIVE
								</Text>
								<NeoBadge variant="default" size="sm">
									{myPosts.length}
								</NeoBadge>
							</View>
							<NeoButton
								size="sm"
								variant="primary"
								startContent={
									<Plus
										size={14}
										color="#0a0a0c"
										strokeWidth={3}
									/>
								}
								onPress={() => setIsComposerOpen(true)}>
								NEW TRANSMISSION
							</NeoButton>
						</View>

						{myPosts.length > 0 ? (
							<View className="mt-4 gap-4">
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
							<NeoCard
								variant="default"
								className="mt-4 items-center justify-center p-8 text-center shadow-neo">
								<PenSquare
									size={28}
									color="#91e6b1"
									strokeWidth={2.2}
									className="mb-2"
								/>
								<Text className="font-display text-sm text-foreground uppercase">
									NO TRANSMISSIONS PUBLISHED YET
								</Text>
								<Text className="mt-1 max-w-sm text-center font-mono text-xs text-muted-foreground">
									Share code snippets, architectural ideas, or
									UI designs with your peers.
								</Text>
								<NeoButton
									size="sm"
									variant="outline"
									className="mt-4"
									onPress={() => setIsComposerOpen(true)}>
									CREATE FIRST TRANSMISSION
								</NeoButton>
							</NeoCard>
						)}
					</View>
				</View>
			</ScrollView>

			{/* Edit Profile Modal */}
			<EditProfileModal
				open={isEditProfileOpen}
				onOpenChange={setIsEditProfileOpen}
			/>

			{/* Account Actions & Settings Sheet */}
			<MobileSheet
				open={isAccountActionsOpen}
				onOpenChange={setIsAccountActionsOpen}
				title="Account & Settings"
				subtitle="Manage your student verification, house, and account.">
				<View className="gap-3 py-2">
					{/* ID Status */}
					<View className="flex-row items-center justify-between rounded-sm border-2 border-border bg-background p-3.5 shadow-neo-sm">
						<View>
							<Text className="font-mono text-xs text-foreground uppercase">
								Student ID Verification
							</Text>
							<Text className="mt-0.5 font-mono text-xs text-muted-foreground">
								Status: {verificationStatus}
							</Text>
						</View>
						{verificationStatus === "rejected" ? (
							<NeoButton
								size="sm"
								variant="destructive"
								onPress={() => {
									setIsAccountActionsOpen(false);
									setIsResubmitOpen(true);
								}}>
								Resubmit
							</NeoButton>
						) : (
							<NeoBadge
								variant={
									verificationStatus === "approved"
										? "primary"
										: "default"
								}
								size="sm">
								{verificationStatus.toUpperCase()}
							</NeoBadge>
						)}
					</View>

					{/* Campus House
					<View className="flex-row items-center justify-between rounded-sm border-2 border-border bg-background p-3.5 shadow-neo-sm">
						<View>
							<Text className="font-mono text-xs text-foreground uppercase">
								Campus House
							</Text>
							<Text className="mt-0.5 font-mono text-xs text-muted-foreground">
								{guildInfo?.name || "None assigned"}
							</Text>
						</View>
						<NeoButton
							size="sm"
							variant="outline"
							onPress={() => {
								setIsAccountActionsOpen(false);
								setIsGuildModalOpen(true);
							}}>
							{profile.guild ? "Switch" : "Choose"}
						</NeoButton>
					</View> */}

					{/* Account Email */}
					<View className="rounded-sm border-2 border-border bg-background p-3.5 shadow-neo-sm">
						<Text className="font-mono text-xs text-muted-foreground">
							Logged in as
						</Text>
						<Text className="mt-0.5 font-mono text-xs text-foreground">
							{email}
						</Text>
						<Text className="mt-0.5 font-mono text-xs text-muted-foreground">
							Member since {memberSinceDate}
						</Text>
					</View>

					{/* Admin Desk Link */}
					{isAdmin && (
						<NeoCard
							variant="accent"
							onPress={() => {
								setIsAccountActionsOpen(false);
								router.push("/admin");
							}}
							className="flex-row items-center justify-between p-3.5 shadow-neo-sm">
							<View className="flex-row items-center gap-2">
								<ShieldCheck
									size={16}
									color="#91e6b1"
									strokeWidth={2.2}
								/>
								<Text className="font-mono text-xs text-primary uppercase">
									Admin Moderation Desk
								</Text>
							</View>
							<ArrowUpRight
								size={14}
								color="#91e6b1"
								strokeWidth={2.2}
							/>
						</NeoCard>
					)}

					<View className="mt-3 flex-row gap-2.5 border-t-2 border-border pt-3">
						<NeoButton
							size="md"
							variant="outline"
							className="flex-1"
							onPress={() => setIsAccountActionsOpen(false)}>
							CLOSE
						</NeoButton>
					</View>
				</View>
			</MobileSheet>

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

			{/* House Selection Modal */}
			<GuildSelectionModal
				open={isGuildModalOpen}
				onOpenChange={setIsGuildModalOpen}
				canDismiss={true}
			/>

			{/* Resubmit ID Sheet */}
			<MobileSheet
				open={isResubmitOpen}
				onOpenChange={setIsResubmitOpen}
				title="Resubmit Student ID"
				subtitle="Select a clear, uncropped photo or scan of your student ID card.">
				<View className="py-2">
					{resubmitError && (
						<View className="mb-3 rounded-sm border-2 border-destructive bg-destructive/15 p-2.5">
							<Text className="font-mono text-xs text-destructive">
								{resubmitError}
							</Text>
						</View>
					)}
					<View className="my-3 items-center justify-center rounded-sm border-2 border-dashed border-border bg-background p-6">
						{resubmitAsset ? (
							<View className="items-center">
								<Text className="font-mono text-xs text-primary">
									Selected:{" "}
									{resubmitAsset.fileName || "ID Document"}
								</Text>
								<NeoButton
									size="sm"
									variant="outline"
									className="mt-3"
									onPress={handlePickDocument}>
									Change File
								</NeoButton>
							</View>
						) : (
							<NeoButton
								size="sm"
								variant="outline"
								startContent={
									<UploadCloud
										size={14}
										color="#91e6b1"
										strokeWidth={2.2}
									/>
								}
								onPress={handlePickDocument}>
								Select Image from Device
							</NeoButton>
						)}
					</View>
					<View className="mt-4 flex-row gap-2.5 border-t-2 border-border pt-3">
						<NeoButton
							size="md"
							variant="outline"
							className="flex-1"
							onPress={() => setIsResubmitOpen(false)}>
							CANCEL
						</NeoButton>
						<NeoButton
							size="md"
							variant="primary"
							className="flex-1"
							loading={isUploadingId}
							disabled={!resubmitAsset || isUploadingId}
							onPress={handleUploadNewId}>
							SUBMIT
						</NeoButton>
					</View>
				</View>
			</MobileSheet>

			{/* Sign Out Confirmation Sheet */}
			<MobileAlertSheet
				open={isSignOutDialogOpen}
				onOpenChange={setIsSignOutDialogOpen}
				title="Sign Out"
				type="warning"
				description={
					signOutError ||
					"Are you sure you want to sign out of your Impulse account?"
				}
				actions={[
					{
						label: "Sign Out",
						onPress: handleConfirmSignOut,
						variant: "destructive",
						loading: isSigningOut,
					},
					{
						label: "Cancel",
						onPress: () => setIsSignOutDialogOpen(false),
						variant: "outline",
					},
				]}
			/>
		</View>
	);
}
