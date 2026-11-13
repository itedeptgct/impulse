import {
	createIdVerification,
	deleteOwnAccount,
	signOut,
	uploadIdDocument,
} from "@auth/api";
import { EditProfileModal } from "@auth/components/EditProfileModal";
import { useAuthStore } from "@auth/store";
import { useQueryClient } from "@tanstack/react-query";
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
	FileText,
	Flame,
	LogOut,
	MessageSquare,
	PenSquare,
	Plus,
	Settings,
	ShieldAlert,
	ShieldCheck,
	Trash2,
	UploadCloud,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	RefreshControl,
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
import { GuildBadge } from "@/features/guilds/components/GuildBadge";
import { fetchUserPosts, votePost } from "@/features/posts/api";
import { PostCard } from "@/features/posts/components/PostCard";
import { PostComposerModal } from "@/features/posts/components/PostComposerModal";
import type { Post } from "@/features/posts/types";

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

	const [isRefreshing, setIsRefreshing] = useState(false);

	const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
	const [isAccountActionsOpen, setIsAccountActionsOpen] = useState(false);

	const [myPosts, setMyPosts] = useState<Post[]>([]);
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
			if (!cancelled) void loadUserData();
		});
		return () => {
			cancelled = true;
		};
	}, [userId, loadUserData]);

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

	const email = profile?.email || user?.email || "No email available";
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

			try {
				const res = await votePost(post.id, currentUserId, targetVote);
				patchMyPost(post.id, {
					user_vote: res.user_vote,
					upvotes_count: res.upvotes_count,
					downvotes_count: res.downvotes_count,
				});
			} catch {
				patchMyPost(post.id, {
					user_vote: currentVote,
					upvotes_count: post.upvotes_count,
					downvotes_count: post.downvotes_count,
				});
			}
		},
		[user?.id, patchMyPost],
	);

	const handleOpenComments = useCallback((post: Post) => {
		router.push(`/post/${post.id}` as any);
	}, []);

	const handlePostUpdated = useCallback((updated: Post) => {
		setMyPosts((prev) =>
			prev.map((p) => (p.id === updated.id ? updated : p)),
		);
	}, []);

	const handlePostDeleted = useCallback((deletedId: string) => {
		setMyPosts((prev) => prev.filter((p) => p.id !== deletedId));
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

	const totalUpvotes = myPosts.reduce((acc, p) => acc + p.upvotes_count, 0);
	const totalComments = myPosts.reduce((acc, p) => acc + p.comments_count, 0);

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
				data={myPosts}
				keyExtractor={(item) => item.id}
				renderItem={renderItem}
				ListHeaderComponent={
					<View className="mx-auto w-full max-w-2xl px-4 sm:px-6">
						<View className="mb-4 flex-row items-center justify-between">
							<View>
								<Text className="font-display text-2xl tracking-tight text-foreground uppercase">
									YOUR PROFILE
								</Text>
							</View>

							<View className="flex-row items-center gap-2">
								<NeoButton
									variant="outline"
									size="sm"
									onPress={() =>
										setIsAccountActionsOpen(true)
									}
									className="px-2.5">
									<Settings
										size={16}
										color="#000000"
										strokeWidth={2.2}
									/>
								</NeoButton>
							</View>
						</View>

						<NeoCard
							variant="default"
							className="mb-5 p-5 shadow-neo">
							<View className="flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
								{profile.avatar_url &&
								profile.avatar_url.startsWith("http") ? (
									<Image
										source={{ uri: profile.avatar_url }}
										style={{
											width: 68,
											height: 68,
											borderRadius: 0,
											borderWidth: 2,
											borderColor: "#000000",
										}}
										contentFit="cover"
									/>
								) : (
									<View className="size-17 items-center justify-center rounded-none border-2 border-border bg-muted shadow-neo-sm">
										<Text className="font-bold text-2xl text-foreground">
											{initials}
										</Text>
									</View>
								)}

								<View className="min-w-0 flex-1">
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
														color="#faf9f5"
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
														color="#000000"
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
												className="border-destructive bg-destructive"
												textClassName="text-primary-foreground"
												startContent={
													<ShieldAlert
														size={11}
														color="#faf9f5"
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
														color="#faf9f5"
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

									<View className="mt-2.5 flex-row flex-wrap items-center gap-2">
										{profile.guild ? (
											<GuildBadge
												guildId={profile.guild}
												size="sm"
												className="shadow-neo-sm"
											/>
										) : verificationStatus === "pending" &&
										  !isAdmin ? (
											<View className="h-6 flex-row items-center gap-1.5 border-2 border-border bg-secondary px-2 shadow-neo-xs">
												<Clock
													size={11}
													color="#000000"
													strokeWidth={2.2}
												/>
												<Text className="font-mono text-[10px] text-muted-foreground uppercase">
													House: Pending Verification
												</Text>
											</View>
										) : (
											<NeoButton
												variant="outline"
												size="sm"
												onPress={() =>
													router.push(
														"/(tabs)/guilds",
													)
												}
												className="h-6 px-2">
												<Text className="font-mono text-[10px] text-muted-foreground uppercase">
													+ Choose House
												</Text>
											</NeoButton>
										)}

										{(profile.course ||
											profile.year_level ||
											profile.major) && (
											<View className="flex-row items-center gap-1.5 rounded-none border-2 border-border bg-secondary px-2 py-0.5 shadow-neo-sm">
												<BookOpen
													size={11}
													color="#000000"
													strokeWidth={2.2}
												/>
												<Text className="font-bold text-[10px] text-foreground uppercase">
													{[
														profile.course,
														profile.year_level
															? `YEAR ${profile.year_level}`
															: null,
														!profile.course &&
														!profile.year_level
															? profile.major
															: null,
													]
														.filter(Boolean)
														.join(" • ")}
												</Text>
											</View>
										)}
									</View>

									{profile.bio ? (
										<Text className="mt-3 font-sans text-xs leading-relaxed text-muted-foreground">
											{profile.bio}
										</Text>
									) : (
										<Text className="mt-2.5 font-mono text-xs text-muted-foreground">
											No bio added yet. Tell the campus
											about your interests!
										</Text>
									)}
								</View>
							</View>

							<View className="mt-4 flex-row flex-wrap gap-2.5 border-t-2 border-border pt-4">
								<NeoButton
									size="sm"
									variant="outline"
									className="flex-1"
									startContent={
										<PenSquare
											size={13}
											color="#000000"
											strokeWidth={2.2}
										/>
									}
									onPress={() => setIsEditProfileOpen(true)}>
									EDIT PROFILE
								</NeoButton>
							</View>
						</NeoCard>

						<View className="mb-6 flex-row gap-3">
							<NeoCard
								variant="default"
								className="flex-1 items-center justify-center p-3.5 shadow-neo-sm">
								<View className="flex-row items-center gap-1.5">
									<PenSquare
										size={12}
										color="#000000"
										strokeWidth={2.2}
									/>
									<Text className="font-bold text-[10px] tracking-wider text-muted-foreground uppercase">
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
										color="#ff2a00"
										strokeWidth={2.2}
									/>
									<Text className="font-bold text-[10px] tracking-wider text-muted-foreground uppercase">
										KARMA
									</Text>
								</View>
								<Text className="mt-1 font-display text-2xl tracking-tight text-destructive">
									{totalUpvotes}
								</Text>
							</NeoCard>

							<NeoCard
								variant="default"
								className="flex-1 items-center justify-center p-3.5 shadow-neo-sm">
								<View className="flex-row items-center gap-1.5">
									<MessageSquare
										size={12}
										color="#000000"
										strokeWidth={2.2}
									/>
									<Text className="font-bold text-[10px] tracking-wider text-muted-foreground uppercase">
										DISCUSSIONS
									</Text>
								</View>
								<Text className="mt-1 font-display text-2xl tracking-tight text-foreground">
									{totalComments}
								</Text>
							</NeoCard>
						</View>

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

						<View className="mb-8">
							<View className="flex-row items-center justify-between border-b-2 border-border pb-3.5">
								<View className="flex-row items-center gap-2">
									<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
										POST ARCHIVE
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
											color="#faf9f5"
											strokeWidth={3}
										/>
									}
									onPress={() => setIsComposerOpen(true)}>
									NEW POST
								</NeoButton>
							</View>
						</View>
					</View>
				}
				ListEmptyComponent={
					<View className="mx-auto w-full max-w-2xl px-4 sm:px-6">
						<NeoCard
							variant="default"
							className="mt-4 items-center justify-center p-8 text-center shadow-neo">
							<PenSquare
								size={28}
								color="#000000"
								strokeWidth={2.2}
								className="mb-2"
							/>
							<Text className="font-display text-sm text-foreground uppercase">
								NO POSTS PUBLISHED YET
							</Text>
							<Text className="mt-1 max-w-sm text-center font-mono text-xs text-muted-foreground">
								Share code snippets, architectural ideas, or UI
								designs with your peers.
							</Text>
							<NeoButton
								size="sm"
								variant="outline"
								className="mt-4"
								onPress={() => setIsComposerOpen(true)}>
								CREATE FIRST POST
							</NeoButton>
						</NeoCard>
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

			<MobileSheet
				open={isAccountActionsOpen}
				onOpenChange={setIsAccountActionsOpen}
				title="Account & Settings"
				subtitle="Manage your student verification, house, and account.">
				<View className="gap-3 py-2">
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

					<View className="rounded-none border-2 border-border bg-card p-3.5 shadow-neo-sm">
						<Text className="font-bold text-xs text-foreground uppercase">
							Account
						</Text>
						<Text className="mt-1 font-mono text-xs text-muted-foreground">
							Sign out of your session or permanently delete your
							account.
						</Text>
						<View className="mt-3 flex-row gap-2.5">
							<NeoButton
								size="sm"
								variant="outline"
								className="flex-1"
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
							<NeoButton
								size="sm"
								variant="destructive"
								className="flex-1"
								startContent={
									<Trash2
										size={14}
										color="#ffffff"
										strokeWidth={2.2}
									/>
								}
								onPress={() => {
									setIsAccountActionsOpen(false);
									setIsDeleteAccountDialogOpen(true);
								}}>
								DELETE ACCOUNT
							</NeoButton>
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
