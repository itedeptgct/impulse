import {
	createIdVerification,
	deleteOwnAccount,
	signOut,
	updateUserProfile,
	uploadIdDocument,
} from "@auth/api";
import { AccountSettingsModal } from "@auth/components/AccountSettingsModal";
import { EditProfileModal } from "@auth/components/EditProfileModal";
import { ProfileSurfaceEffect } from "@auth/components/ProfileSurfaceEffect";
import { useAuthStore } from "@auth/store";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
	AlertCircle,
	ArrowUpRight,
	Bookmark,
	BookOpen,
	Calendar,
	CheckCircle2,
	Clock,
	Code2,
	FileText,
	LogOut,
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
	FlatList,
	Pressable,
	RefreshControl,
	Switch,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	MobileAlertSheet,
	MobileSheet,
	MobileTopBar,
	NeoBadge,
	NeoButton,
	NeoCard,
} from "@/components/ui";
import { getGuildInfo } from "@/features/guilds/constants";
import { fetchUserPosts, votePost } from "@/features/posts/api";
import { useBookmarksStore } from "@/features/posts/bookmarks";
import { PostCard } from "@/features/posts/components/PostCard";
import { PostComposerModal } from "@/features/posts/components/PostComposerModal";
import {
	patchPostInFeedCaches,
	removePostFromFeedCaches,
	replacePostInFeedCaches,
} from "@/features/posts/queries";
import type { Post } from "@/features/posts/types";
import { ActiveDot } from "@/features/presence";
import { toast } from "@/lib/toast";

export default function ProfileScreen() {
	const insets = useSafeAreaInsets();
	const queryClient = useQueryClient();
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);
	const verification = useAuthStore((state) => state.verification);
	const setVerification = useAuthStore((state) => state.setVerification);
	const clearSession = useAuthStore((state) => state.clearSession);
	const refreshUserData = useAuthStore((state) => state.refreshUserData);

	const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
	const [signOutError, setSignOutError] = useState<string | null>(null);
	const [isSigningOut, setIsSigningOut] = useState(false);

	const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] =
		useState(false);
	const [deleteAccountError, setDeleteAccountError] = useState<string | null>(
		null,
	);
	const [isDeletingAccount, setIsDeletingAccount] = useState(false);
	const [isUpdatingPresence, setIsUpdatingPresence] = useState(false);

	const [isRefreshing, setIsRefreshing] = useState(false);

	const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
	const [isAccountActionsOpen, setIsAccountActionsOpen] = useState(false);
	const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);

	const [myPosts, setMyPosts] = useState<Post[]>([]);
	const [profileTab, setProfileTab] = useState<"posts" | "saved">("posts");
	const savedPosts = useBookmarksStore((s) => s.savedPosts);
	const loadBookmarks = useBookmarksStore((s) => s.loadBookmarks);

	useEffect(() => {
		if (user?.id) {
			void loadBookmarks(user.id);
		}
	}, [user?.id, loadBookmarks]);
	const [isComposerOpen, setIsComposerOpen] = useState(false);

	const [isResubmitOpen, setIsResubmitOpen] = useState(false);
	const [resubmitAsset, setResubmitAsset] =
		useState<ImagePicker.ImagePickerAsset | null>(null);
	const [isUploadingId, setIsUploadingId] = useState(false);
	const [resubmitError, setResubmitError] = useState<string | null>(null);

	const [hasMorePosts, setHasMorePosts] = useState(true);
	const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
	const [nextPostOffset, setNextPostOffset] = useState<number | null>(null);

	const userId = user?.id;
	const profileGuild = profile?.guild;
	const profileRole = profile?.role;

	const loadUserData = useCallback(async () => {
		if (!userId) return;
		try {
			const userPostsResult = await fetchUserPosts(
				userId,
				userId,
				profileGuild,
				profileRole === "admin",
				20,
				0,
			);
			setMyPosts(userPostsResult.items);
			setHasMorePosts(userPostsResult.hasMore);
			setNextPostOffset(userPostsResult.nextOffset);
		} finally {
			setIsRefreshing(false);
		}
	}, [userId, profileGuild, profileRole]);

	const loadMorePosts = useCallback(async () => {
		if (
			!userId ||
			isLoadingMorePosts ||
			isRefreshing ||
			!hasMorePosts ||
			nextPostOffset === null
		) {
			return;
		}

		setIsLoadingMorePosts(true);
		try {
			const isAdmin = profileRole === "admin";
			const userPostsResult = await fetchUserPosts(
				userId,
				userId,
				profileGuild,
				isAdmin,
				20,
				nextPostOffset,
			);
			setMyPosts((prev) => {
				const existingIds = new Set(prev.map((p) => p.id));
				const newUnique = userPostsResult.items.filter(
					(p) => !existingIds.has(p.id),
				);
				return [...prev, ...newUnique];
			});
			setHasMorePosts(userPostsResult.hasMore);
			setNextPostOffset(userPostsResult.nextOffset);
		} finally {
			setIsLoadingMorePosts(false);
		}
	}, [
		userId,
		isLoadingMorePosts,
		isRefreshing,
		hasMorePosts,
		nextPostOffset,
		profileGuild,
		profileRole,
	]);

	useEffect(() => {
		if (!userId) return;
		let cancelled = false;
		queueMicrotask(() => {
			if (!cancelled) {
				void loadUserData();
				void refreshUserData();
			}
		});
		return () => {
			cancelled = true;
		};
	}, [userId, loadUserData, refreshUserData]);

	const onRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await Promise.all([refreshUserData(), loadUserData()]);
		} finally {
			setIsRefreshing(false);
		}
	}, [loadUserData, refreshUserData]);

	const displayName =
		profile?.display_name ||
		profile?.username ||
		user?.user_metadata?.full_name ||
		user?.user_metadata?.name ||
		user?.email?.split("@")[0] ||
		"Impulse User";

	const role = profile?.role || "user";
	const verificationStatus = verification?.status || "pending";
	const isAdmin = role === "admin";
	const isStaff = role === "admin" || role === "mod" || role === "house_mod";

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

	const handleConfirmDeleteAccount = async () => {
		setIsDeletingAccount(true);
		setDeleteAccountError(null);
		try {
			await deleteOwnAccount();
			queryClient.clear();
			setIsDeleteAccountDialogOpen(false);
			router.replace("/(auth)/sign-in");
		} catch (error: unknown) {
			const err = error as Error;
			setDeleteAccountError(
				err.message || "Failed to permanently delete account.",
			);
		} finally {
			setIsDeletingAccount(false);
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

	const patchMyPost = useCallback((postId: string, patch: Partial<Post>) => {
		setMyPosts((prev) =>
			prev.map((p) => (p.id === postId ? { ...p, ...patch } : p)),
		);
	}, []);

	const handleVote = useCallback(
		async (post: Post, targetVote: 1 | -1) => {
			const currentUserId = user?.id;
			if (!currentUserId) return;
			const currentVote = post.user_vote || 0;
			const nextVote = currentVote === targetVote ? 0 : targetVote;
			const newUp =
				Math.max(0, post.upvotes_count - (currentVote === 1 ? 1 : 0)) +
				(nextVote === 1 ? 1 : 0);
			const newDown =
				Math.max(
					0,
					post.downvotes_count - (currentVote === -1 ? 1 : 0),
				) + (nextVote === -1 ? 1 : 0);

			patchMyPost(post.id, {
				user_vote: nextVote,
				upvotes_count: newUp,
				downvotes_count: newDown,
			});
			patchPostInFeedCaches(post.id, {
				user_vote: nextVote,
				upvotes_count: newUp,
				downvotes_count: newDown,
			});

			try {
				const res = await votePost(post.id, currentUserId, targetVote);
				patchMyPost(post.id, {
					user_vote: res.user_vote,
					upvotes_count: res.upvotes_count,
					downvotes_count: res.downvotes_count,
				});
				patchPostInFeedCaches(post.id, {
					user_vote: res.user_vote,
					upvotes_count: res.upvotes_count,
					downvotes_count: res.downvotes_count,
				});
				void refreshUserData();
			} catch {
				patchMyPost(post.id, {
					user_vote: currentVote,
					upvotes_count: post.upvotes_count,
					downvotes_count: post.downvotes_count,
				});
				patchPostInFeedCaches(post.id, {
					user_vote: currentVote,
					upvotes_count: post.upvotes_count,
					downvotes_count: post.downvotes_count,
				});
				toast.error("Failed to update vote. Please try again.");
			}
		},
		[user?.id, patchMyPost, refreshUserData],
	);

	const handleOpenComments = useCallback((post: Post) => {
		router.push(`/post/${post.id}` as any);
	}, []);

	const handlePostUpdated = useCallback((updated: Post) => {
		setMyPosts((prev) =>
			prev.map((p) => (p.id === updated.id ? updated : p)),
		);
		replacePostInFeedCaches(updated);
	}, []);

	const handlePostDeleted = useCallback((deletedId: string) => {
		setMyPosts((prev) => prev.filter((p) => p.id !== deletedId));
		removePostFromFeedCaches(deletedId);
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

	const totalComments = myPosts.reduce((acc, p) => acc + p.comments_count, 0);
	const guildData = getGuildInfo(profile?.guild);
	const academicLabel = [
		profile?.course,
		profile?.year_level ? `YEAR ${profile.year_level}` : null,
		!profile?.course && !profile?.year_level ? profile?.major : null,
	]
		.filter(Boolean)
		.join(" · ");

	if (!profile) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator color="#000000" size="large" />
			</View>
		);
	}

	return (
		<View className="flex-1 bg-background text-foreground">
			<StatusBar style="dark" />

			<MobileTopBar
				sector="PROFILE"
				dotColor="#00FF66"
				showBackButton={true}
			/>

			<FlatList
				data={profileTab === "saved" ? savedPosts : myPosts}
				keyExtractor={(item) => item.id}
				renderItem={renderItem}
				ListHeaderComponent={
					<View className="mx-auto w-full max-w-2xl px-4 sm:px-6">
						{/* Unified Operator Dossier Card */}
						<View className="mb-5 bg-card shadow-neo">
							<View className="overflow-hidden border-2 border-border bg-card">
								{/* Animated Surface Effect Cover */}
								<View className="relative h-28 w-full bg-[#0A0A0A]">
									<ProfileSurfaceEffect
										guild={profile.guild}
										height={112}
									/>

									{/* Top Banner Stamps */}
									<View className="absolute inset-x-3 top-3 flex-row items-center justify-between gap-2">
										{guildData ? (
											<View className="flex-row items-center gap-1.5 border border-white/30 bg-black/80 px-2 py-1">
												<Text className="font-bold text-2xs tracking-widest text-white uppercase">
													{guildData.houseSymbol} ·{" "}
													{guildData.name}
												</Text>
											</View>
										) : verificationStatus === "pending" &&
										  !isAdmin ? (
											<View className="flex-row items-center gap-1 border border-white/30 bg-black/80 px-2 py-1">
												<Clock
													size={10}
													color="#FFE600"
													strokeWidth={2.5}
												/>
												<Text className="font-mono text-2xs tracking-wider text-white/85 uppercase">
													HOUSE LOCKED
												</Text>
											</View>
										) : (
											<Pressable
												accessibilityRole="button"
												accessibilityLabel="Choose House"
												onPress={() =>
													router.push(
														"/(tabs)/guilds",
													)
												}
												className="flex-row items-center gap-1 border border-white/40 bg-black/85 px-2.5 py-1 active:bg-neo-green">
												<Plus
													size={10}
													color="#00FF66"
													strokeWidth={3}
												/>
												<Text className="font-bold text-2xs tracking-widest text-white uppercase">
													CHOOSE HOUSE
												</Text>
											</Pressable>
										)}

										<View className="flex-row items-center gap-1.5">
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

											{verificationStatus ===
												"pending" && (
												<View className="flex-row items-center gap-1 border-2 border-border bg-neo-yellow px-2 py-0.5">
													<Clock
														size={11}
														color="#000000"
														strokeWidth={2.6}
													/>
													<Text className="font-bold text-2xs tracking-widest text-foreground uppercase">
														PENDING
													</Text>
												</View>
											)}

											{verificationStatus ===
												"rejected" && (
												<View className="flex-row items-center gap-1 border-2 border-border bg-destructive px-2 py-0.5">
													<ShieldAlert
														size={11}
														color="#faf9f5"
														strokeWidth={2.6}
													/>
													<Text className="font-bold text-2xs tracking-widest text-primary-foreground uppercase">
														UNVERIFIED
													</Text>
												</View>
											)}

											{isAdmin && (
												<View className="flex-row items-center gap-1 border border-white/40 bg-black/85 px-2 py-0.5">
													<ShieldCheck
														size={11}
														color="#00FF66"
														strokeWidth={2.6}
													/>
													<Text className="font-bold text-2xs tracking-widest text-white uppercase">
														ADMIN
													</Text>
												</View>
											)}
										</View>
									</View>
								</View>

								{/* Avatar Seam & Identity */}
								<View className="border-t-2 border-border bg-card px-4 pb-4">
									<View className="flex-row items-end justify-between">
										<View className="relative -mt-9">
											{profile.avatar_url &&
											profile.avatar_url.startsWith(
												"http",
											) ? (
												<Image
													source={{
														uri: profile.avatar_url,
													}}
													style={{
														width: 72,
														height: 72,
														borderWidth: 2,
														borderColor: "#000000",
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
												userId={profile.id}
												targetShowActiveStatus={
													profile.show_active_status
												}
												size="md"
												className="absolute -right-1 -bottom-1"
											/>
										</View>

										<Pressable
											accessibilityRole="button"
											accessibilityLabel="Account and settings menu"
											onPress={() =>
												setIsAccountActionsOpen(true)
											}
											className="mt-2.5 flex-row items-center gap-1.5 border-2 border-border bg-surface px-3 py-1.5 active:bg-secondary">
											<Settings
												size={13}
												color="#000000"
												strokeWidth={2.3}
											/>
											<Text className="font-bold text-2xs tracking-widest text-foreground uppercase">
												MENU
											</Text>
										</Pressable>
									</View>

									{/* Name & Handle */}
									<View className="mt-3">
										<Text
											numberOfLines={1}
											className="font-ndot-caps text-2xl leading-none tracking-wide text-foreground uppercase">
											{displayName}
										</Text>
										<Text className="mt-1 font-mono text-xs text-muted-foreground">
											@{profile.username || "student"}
										</Text>
									</View>

									{/* Bio */}
									{profile.bio ? (
										<Text className="mt-3 font-sans text-[13px] leading-relaxed text-foreground">
											{profile.bio}
										</Text>
									) : (
										<Text className="mt-2.5 font-mono text-xs text-muted-foreground">
											No bio added yet. Tell the campus
											about your interests!
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
											{myPosts.length}
										</Text>
									</View>

									<View className="flex-1 items-center justify-center border-r-2 border-border py-3">
										<Text className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
											KARMA
										</Text>
										<Text className="mt-1 font-display text-2xl leading-none text-destructive tabular-nums">
											{profile?.karma ?? 0}
										</Text>
									</View>

									<View className="flex-1 items-center justify-center py-3">
										<Text className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
											REPLIES
										</Text>
										<Text className="mt-1 font-display text-2xl leading-none text-foreground tabular-nums">
											{totalComments}
										</Text>
									</View>
								</View>

								{/* Docked 2-Column Action Footer */}
								<View className="flex-row border-t-2 border-border bg-surface">
									<Pressable
										accessibilityRole="button"
										accessibilityLabel="Edit profile"
										onPress={() =>
											setIsEditProfileOpen(true)
										}
										className="h-11 flex-1 flex-row items-center justify-center gap-1.5 border-r-2 border-border active:bg-secondary">
										<PenSquare
											size={13}
											color="#000000"
											strokeWidth={2.3}
										/>
										<Text className="font-bold text-2xs tracking-widest text-foreground uppercase">
											EDIT PROFILE
										</Text>
									</Pressable>

									<Pressable
										accessibilityRole="button"
										accessibilityLabel="Account settings"
										onPress={() =>
											setIsAccountSettingsOpen(true)
										}
										className="h-11 flex-1 flex-row items-center justify-center gap-1.5 active:bg-secondary">
										<Settings
											size={13}
											color="#000000"
											strokeWidth={2.3}
										/>
										<Text className="font-bold text-2xs tracking-widest text-foreground uppercase">
											ACCOUNT SETTINGS
										</Text>
									</Pressable>
								</View>
							</View>
						</View>

						{verificationStatus === "rejected" && (
							<View className="mb-5 bg-destructive/10 shadow-neo-sm">
								<View className="border-2 border-destructive bg-card p-4">
									<View className="flex-row items-start gap-3">
										<AlertCircle
											size={18}
											color="#ff2a00"
											strokeWidth={2.4}
											className="mt-0.5"
										/>
										<View className="flex-1">
											<Text className="font-ndot-caps text-sm text-destructive uppercase">
												STUDENT ID RESUBMISSION REQUIRED
											</Text>
											<Text className="mt-1 font-mono text-xs leading-relaxed text-foreground">
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
								</View>
							</View>
						)}

						{/* Unified Segmented Tabs & New Post Bar */}
						<View className="mb-5 bg-surface shadow-neo-sm">
							<View className="flex-row items-stretch overflow-hidden border-2 border-border bg-surface">
								<Pressable
									accessibilityRole="tab"
									accessibilityState={{
										selected: profileTab === "posts",
									}}
									onPress={() => setProfileTab("posts")}
									className={`h-11 flex-1 flex-row items-center justify-center gap-1.5 border-r-2 border-border ${
										profileTab === "posts"
											? "bg-primary"
											: "bg-surface active:bg-secondary"
									}`}>
									<Text
										className={`font-bold text-2xs tracking-widest uppercase ${
											profileTab === "posts"
												? "text-primary-foreground"
												: "text-foreground"
										}`}>
										POSTS ({myPosts.length})
									</Text>
								</Pressable>

								<Pressable
									accessibilityRole="tab"
									accessibilityState={{
										selected: profileTab === "saved",
									}}
									onPress={() => setProfileTab("saved")}
									className={`h-11 flex-1 flex-row items-center justify-center gap-1.5 border-r-2 border-border ${
										profileTab === "saved"
											? "bg-neo-yellow"
											: "bg-surface active:bg-secondary"
									}`}>
									<Bookmark
										size={12}
										color="#000000"
										fill={
											profileTab === "saved"
												? "#000000"
												: "none"
										}
										strokeWidth={2.4}
									/>
									<Text className="font-bold text-2xs tracking-widest text-foreground uppercase">
										SAVED ({savedPosts.length})
									</Text>
								</Pressable>

								<Pressable
									accessibilityRole="button"
									accessibilityLabel="Create new post"
									onPress={() => setIsComposerOpen(true)}
									className="h-11 flex-row items-center justify-center gap-1.5 bg-neo-green px-3.5 active:opacity-85">
									<Plus
										size={14}
										color="#000000"
										strokeWidth={3}
									/>
									<Text className="font-bold text-2xs tracking-widest text-foreground uppercase">
										POST
									</Text>
								</Pressable>
							</View>
						</View>
					</View>
				}
				ListEmptyComponent={
					<View className="mx-auto w-full max-w-2xl px-4 sm:px-6">
						<View className="bg-card shadow-neo">
							<View className="items-center justify-center border-2 border-border bg-card p-8">
								{profileTab === "saved" ? (
									<>
										<Bookmark
											size={26}
											color="#000000"
											strokeWidth={2.2}
											className="mb-2.5"
										/>
										<Text className="font-ndot-caps text-base text-foreground uppercase">
											NO SAVED POSTS YET
										</Text>
										<Text className="mt-1 max-w-sm text-center font-mono text-xs text-muted-foreground">
											Tap the bookmark icon on any post to
											save code snippets and notes here.
										</Text>
									</>
								) : (
									<>
										<PenSquare
											size={26}
											color="#000000"
											strokeWidth={2.2}
											className="mb-2.5"
										/>
										<Text className="font-ndot-caps text-base text-foreground uppercase">
											NO POSTS PUBLISHED YET
										</Text>
										<Text className="mt-1 max-w-sm text-center font-mono text-xs text-muted-foreground">
											Share code snippets, architectural
											ideas, or UI designs with your
											peers.
										</Text>
										<NeoButton
											size="sm"
											variant="primary"
											className="mt-4"
											onPress={() =>
												setIsComposerOpen(true)
											}>
											CREATE FIRST POST
										</NeoButton>
									</>
								)}
							</View>
						</View>
					</View>
				}
				ListFooterComponent={
					<View className="items-center py-4">
						{isLoadingMorePosts && (
							<View className="pb-3">
								<ActivityIndicator color="#000000" />
							</View>
						)}
						<View className="flex-row items-center justify-center gap-3 pt-2">
							<Pressable
								onPress={() => router.push("/legal/terms")}
								hitSlop={6}
								className="active:opacity-70">
								<Text className="font-mono text-[11px] text-muted-foreground uppercase underline">
									Terms of Service
								</Text>
							</Pressable>
							<Text className="font-mono text-[11px] text-muted-foreground">
								•
							</Text>
							<Pressable
								onPress={() => router.push("/legal/privacy")}
								hitSlop={6}
								className="active:opacity-70">
								<Text className="font-mono text-[11px] text-muted-foreground uppercase underline">
									Privacy Policy
								</Text>
							</Pressable>
							<Text className="font-mono text-[11px] text-muted-foreground">
								•
							</Text>
							<Pressable
								onPress={() => router.push("/developers")}
								hitSlop={6}
								className="active:opacity-70">
								<Text className="font-mono text-[11px] text-muted-foreground uppercase underline">
									Developers
								</Text>
							</Pressable>
						</View>
					</View>
				}
				onEndReached={loadMorePosts}
				onEndReachedThreshold={0.5}
				contentContainerStyle={{
					flexGrow: 1,
					paddingTop: 14,
					paddingBottom: Math.max(insets.bottom, 16) + 32,
					maxWidth: 672,
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
				open={isEditProfileOpen}
				onOpenChange={setIsEditProfileOpen}
			/>

			<AccountSettingsModal
				open={isAccountSettingsOpen}
				onOpenChange={setIsAccountSettingsOpen}
				onDeleteAccountPress={() => {
					setIsAccountSettingsOpen(false);
					setIsDeleteAccountDialogOpen(true);
				}}
			/>

			<MobileSheet
				open={isAccountActionsOpen}
				onOpenChange={setIsAccountActionsOpen}
				title="Account & Settings"
				subtitle="Manage your student verification, house, and account.">
				<View className="gap-3 py-2">
					<NeoCard
						variant="default"
						onPress={() => {
							setIsAccountActionsOpen(false);
							setIsAccountSettingsOpen(true);
						}}
						className="flex-row items-center justify-between p-3.5 shadow-neo-sm">
						<View className="flex-row items-center gap-2">
							<Settings
								size={16}
								color="#000000"
								strokeWidth={2.2}
							/>
							<Text className="font-bold text-base text-foreground uppercase">
								Account Settings
							</Text>
						</View>
						<ArrowUpRight
							size={14}
							color="#000000"
							strokeWidth={2.2}
						/>
					</NeoCard>
					{isStaff && (
						<NeoCard
							variant="accent"
							onPress={() => {
								setIsAccountActionsOpen(false);
								router.push("/admin");
							}}
							className="flex-row items-center justify-between bg-primary p-3.5 shadow-neo-sm">
							<View className="flex-row items-center gap-2">
								<ShieldCheck
									size={16}
									color="#ffffff"
									strokeWidth={2.2}
								/>
								<Text className="text-md font-bold text-background uppercase">
									{role === "house_mod"
										? "House Moderation"
										: role === "mod"
											? "Moderation Desk"
											: "Admin Moderation"}
								</Text>
							</View>
							<ArrowUpRight
								size={14}
								color="#ffffff"
								strokeWidth={2.2}
							/>
						</NeoCard>
					)}

					<View className="flex-row items-center justify-between rounded-none border-2 border-border bg-card p-3.5 shadow-neo-sm">
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

					<View className="rounded-none border-2 border-border bg-card p-3.5 shadow-neo-sm">
						<View className="flex-row items-center justify-between gap-3">
							<View className="flex-1">
								<Text className="font-bold text-xs text-foreground uppercase">
									Show Active Status
								</Text>
								<Text className="mt-1 font-mono text-xs text-muted-foreground">
									Let other users see when you are active.
									When off, you also cannot see others'
									status.
								</Text>
							</View>
							<Switch
								value={profile?.show_active_status ?? true}
								disabled={isUpdatingPresence}
								trackColor={{
									false: "#d4d4d8",
									true: "#00ff66",
								}}
								thumbColor="#000000"
								accessibilityLabel="Show Active Status"
								onValueChange={async (nextValue) => {
									if (!user?.id || isUpdatingPresence) return;
									setIsUpdatingPresence(true);
									try {
										const updated = await updateUserProfile(
											user.id,
											{ show_active_status: nextValue },
										);
										useAuthStore
											.getState()
											.setProfile(updated);
									} finally {
										setIsUpdatingPresence(false);
									}
								}}
							/>
						</View>
					</View>

					<View className="rounded-none border-2 border-border bg-card p-3.5 shadow-neo-sm">
						<Text className="font-bold text-xs text-foreground uppercase">
							Legal & Compliance
						</Text>
						<Text className="mt-1 font-mono text-xs text-muted-foreground">
							Review terms of service and student privacy
							protocols.
						</Text>
						<View className="mt-3 flex-row gap-2.5">
							<NeoButton
								size="sm"
								variant="outline"
								className="flex-1"
								startContent={
									<FileText
										size={14}
										color="#000000"
										strokeWidth={2.2}
									/>
								}
								onPress={() => {
									setIsAccountActionsOpen(false);
									router.push("/legal/terms");
								}}>
								Terms of Service
							</NeoButton>
							<NeoButton
								size="sm"
								variant="outline"
								className="flex-1"
								startContent={
									<ShieldCheck
										size={14}
										color="#000000"
										strokeWidth={2.2}
									/>
								}
								onPress={() => {
									setIsAccountActionsOpen(false);
									router.push("/legal/privacy");
								}}>
								Privacy Policy
							</NeoButton>
						</View>
						<View className="mt-2.5">
							<NeoButton
								size="sm"
								variant="outline"
								className="w-full"
								startContent={
									<Code2
										size={14}
										color="#000000"
										strokeWidth={2.2}
									/>
								}
								onPress={() => {
									setIsAccountActionsOpen(false);
									router.push("/developers");
								}}>
								Developers
							</NeoButton>
						</View>
					</View>

					<View className="rounded-none border-2 border-border bg-card p-3.5 shadow-neo-sm">
						<Text className="font-bold text-xs text-foreground uppercase">
							Sign Out
						</Text>
						<Text className="mt-1 font-mono text-xs text-muted-foreground">
							Sign out of your current Impulse session.
						</Text>
						<View className="mt-3">
							<NeoButton
								size="sm"
								variant="outline"
								className="w-full"
								startContent={
									<LogOut
										size={14}
										color="#ff2a00"
										strokeWidth={2.2}
									/>
								}
								onPress={() => {
									setIsAccountActionsOpen(false);
									setIsSignOutDialogOpen(true);
								}}>
								Sign Out
							</NeoButton>
						</View>
					</View>

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

			<PostComposerModal
				open={isComposerOpen}
				onOpenChange={setIsComposerOpen}
				onPostCreated={(newPost) => setMyPosts([newPost, ...myPosts])}
			/>

			<MobileSheet
				open={isResubmitOpen}
				onOpenChange={setIsResubmitOpen}
				title="Resubmit Student ID"
				subtitle="Select a clear, uncropped photo or scan of your student ID card.">
				<View className="py-2">
					{resubmitError && (
						<View className="mb-3 rounded-none border-2 border-destructive bg-destructive/15 p-2.5">
							<Text className="font-mono text-xs text-destructive">
								{resubmitError}
							</Text>
						</View>
					)}
					<View className="my-3 items-center justify-center rounded-none border-2 border-dashed border-border bg-background p-6">
						{resubmitAsset ? (
							<View className="items-center">
								<Text className="font-mono text-xs text-foreground">
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
										color="#000000"
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

			<MobileAlertSheet
				open={isDeleteAccountDialogOpen}
				onOpenChange={setIsDeleteAccountDialogOpen}
				title="Delete Account"
				type="error"
				description={
					deleteAccountError ||
					"Are you sure you want to permanently delete your account? Your profile, posts, and comments will be permanently deleted. This action cannot be undone."
				}
				actions={[
					{
						label: "Delete Permanently",
						onPress: handleConfirmDeleteAccount,
						variant: "destructive",
						loading: isDeletingAccount,
					},
					{
						label: "Cancel",
						onPress: () => setIsDeleteAccountDialogOpen(false),
						variant: "outline",
					},
				]}
			/>
		</View>
	);
}
