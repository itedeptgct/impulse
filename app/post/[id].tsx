import { useAuthStore } from "@auth/store";
import { formatRelativeTime } from "@lib/date";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
	ArrowDown,
	ArrowLeft,
	ArrowUp,
	CornerDownRight,
	FileQuestion,
	Flag,
	Lock,
	MessageSquare,
	MoreHorizontal,
	PenSquare,
	Pencil,
	Send,
	Share2,
	Shield,
	ShieldAlert,
	Trash2,
	X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	Keyboard,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	MobileAlertSheet,
	MobileSheet,
	NeoButton,
	NetworkErrorCard,
	TerminalCodeViewport,
} from "@/components/ui";
import { UserRoleBadge } from "@/features/auth/components/UserRoleBadge";
import { canManagePost } from "@/features/auth/permissions";
import { GuildBadge } from "@/features/guilds/components/GuildBadge";
import { ReportModal } from "@/features/moderation/components/ReportModal";
import {
	addPostComment,
	deleteComment,
	deletePost,
	editComment,
	fetchPostById,
	fetchPostComments,
	isPostEdited,
	normalizePostMedia,
	normalizePostTags,
	type PostAccessStatus,
	votePost,
} from "@/features/posts/api";
import { PostComposerModal } from "@/features/posts/components/PostComposerModal";
import { PostMediaCarousel } from "@/features/posts/components/PostMediaCarousel";
import { PostMediaLightboxModal } from "@/features/posts/components/PostMediaLightboxModal";
import type { Comment, Post } from "@/features/posts/types";
import {
	buildCommentTree,
	type CommentTreeNode,
	countSubtreeReplies,
	MAX_VISUAL_DEPTH,
} from "@/features/posts/utils/comment-tree";
import { sharePost } from "@/features/posts/utils/share";

const GUILD_META: Record<string, { tag: string; badge: string; bg: string }> = {
	octagram: { tag: "OCTOGRAM", badge: "0x", bg: "bg-primary" },
	chameleon: { tag: "CHAMELEON", badge: "★", bg: "bg-neo-magenta" },
	blue_jays: { tag: "BLUE JAYS", badge: "BJ", bg: "bg-neo-green-dark" },
};

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

export default function PostDetailScreen() {
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams<{ id: string | string[] }>();
	const id = Array.isArray(params.id) ? params.id[0] : params.id;
	const scrollViewRef = useRef<ScrollView>(null);

	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);

	const userId = user?.id;
	const userGuild = profile?.guild;
	const isAdmin = profile?.role === "admin";

	const [post, setPost] = useState<Post | null>(null);
	const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
	const [comments, setComments] = useState<Comment[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [accessStatus, setAccessStatus] =
		useState<PostAccessStatus>("accessible");
	const [replyText, setReplyText] = useState("");
	const [isSubmittingReply, setIsSubmittingReply] = useState(false);
	const [replyingTo, setReplyingTo] = useState<{
		id: string;
		username: string;
	} | null>(null);
	const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>(
		{},
	);
	const [error, setError] = useState<string | null>(null);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isPostReportOpen, setIsPostReportOpen] = useState(false);
	const [commentToReport, setCommentToReport] = useState<Comment | null>(
		null,
	);
	const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
	const [editingCommentId, setEditingCommentId] = useState<string | null>(
		null,
	);
	const [editingCommentContent, setEditingCommentContent] = useState("");
	const [isSavingCommentEdit, setIsSavingCommentEdit] = useState(false);
	const [commentToDelete, setCommentToDelete] = useState<Comment | null>(
		null,
	);
	const [isDeletingComment, setIsDeletingComment] = useState(false);

	const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

	useEffect(() => {
		const showEvent =
			Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
		const hideEvent =
			Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

		const showSub = Keyboard.addListener(showEvent, () => {
			setIsKeyboardVisible(true);
		});
		const hideSub = Keyboard.addListener(hideEvent, () => {
			setIsKeyboardVisible(false);
		});

		return () => {
			showSub.remove();
			hideSub.remove();
		};
	}, []);

	const toggleCollapse = useCallback((commentId: string) => {
		triggerHaptic();
		setCollapsedIds((prev) => ({
			...prev,
			[commentId]: !prev[commentId],
		}));
	}, []);

	const handleGoBack = () => {
		triggerHaptic();
		if (router.canGoBack()) {
			router.back();
		} else {
			router.replace("/(tabs)");
		}
	};

	const handleConfirmDelete = async () => {
		if (!post) return;
		setIsDeleting(true);
		try {
			await deletePost(post.id);
			setIsDeleteOpen(false);
			handleGoBack();
		} catch (err: unknown) {
			const e = err as Error;
			setError(e.message || "Failed to delete post.");
		} finally {
			setIsDeleting(false);
		}
	};

	const loadPostData = useCallback(async () => {
		if (!id) return;
		setIsLoading(true);
		setError(null);
		try {
			const res = await fetchPostById(id, userId, userGuild, isAdmin);
			setAccessStatus(res.accessStatus);
			if (res.post) {
				setPost(res.post);
				const comms = await fetchPostComments(id);
				setComments(comms);
			} else {
				setPost(null);
			}
		} catch (err: unknown) {
			const e = err as Error;
			setError(
				e.message ||
					"Unable to reach the server. Check your connection and try again.",
			);
		} finally {
			setIsLoading(false);
		}
	}, [id, userId, userGuild, isAdmin]);

	useEffect(() => {
		queueMicrotask(() => {
			void loadPostData();
		});
	}, [loadPostData]);

	const handleVote = async (targetVote: 1 | -1) => {
		if (!post || !user?.id) return;
		triggerHaptic();

		const currentVote = post.user_vote || 0;
		const nextVote = currentVote === targetVote ? 0 : targetVote;

		let newUp = post.upvotes_count;
		let newDown = post.downvotes_count;

		if (currentVote === 1) newUp = Math.max(0, newUp - 1);
		if (currentVote === -1) newDown = Math.max(0, newDown - 1);

		if (nextVote === 1) newUp += 1;
		if (nextVote === -1) newDown += 1;

		const previousPost = post;
		setPost({
			...post,
			upvotes_count: newUp,
			downvotes_count: newDown,
			user_vote: nextVote,
		});

		try {
			const res = await votePost(post.id, user.id, targetVote);
			setPost((prev) =>
				prev
					? {
							...prev,
							upvotes_count: res.upvotes_count,
							downvotes_count: res.downvotes_count,
							user_vote: res.user_vote,
						}
					: null,
			);
		} catch (err: unknown) {
			setPost(previousPost);
			const e = err as Error;
			setError(e.message || "Failed to record vote.");
		}
	};

	const handleOpenShare = async () => {
		if (!post) return;
		triggerHaptic();
		await sharePost(post);
	};

	const handleSendReply = async () => {
		if (!replyText.trim() || !post || !user?.id) return;
		triggerHaptic();
		setIsSubmittingReply(true);

		const author = {
			id: user.id,
			username:
				profile?.username || user.email?.split("@")[0] || "Student",
			display_name:
				profile?.display_name || profile?.username || "Student",
			avatar_url: profile?.avatar_url || null,
			email: profile?.email || user.email,
			guild: profile?.guild || null,
		};

		try {
			const created = await addPostComment(
				post.id,
				author,
				replyText.trim(),
				replyingTo?.id,
				replyingTo?.username,
			);
			setComments((prev) => [...prev, created]);
			setPost((prev) =>
				prev
					? { ...prev, comments_count: prev.comments_count + 1 }
					: null,
			);
			setReplyText("");
			setReplyingTo(null);
			setTimeout(() => {
				scrollViewRef.current?.scrollToEnd({ animated: true });
			}, 100);
		} catch (err: unknown) {
			const e = err as Error;
			setError(e.message || "Failed to send comment.");
		} finally {
			setIsSubmittingReply(false);
		}
	};

	const handleSaveCommentEdit = async () => {
		if (!editingCommentId || !editingCommentContent.trim()) return;
		setIsSavingCommentEdit(true);
		try {
			const updated = await editComment(
				editingCommentId,
				editingCommentContent.trim(),
			);
			setComments((prev) =>
				prev.map((c) =>
					c.id === editingCommentId ? { ...c, ...updated } : c,
				),
			);
			setEditingCommentId(null);
			setEditingCommentContent("");
			triggerHaptic();
		} catch (err: unknown) {
			const e = err as Error;
			setError(e.message || "Failed to edit comment.");
		} finally {
			setIsSavingCommentEdit(false);
		}
	};

	const handleConfirmDeleteComment = async () => {
		if (!commentToDelete) return;
		const targetId = commentToDelete.id;
		setIsDeletingComment(true);
		try {
			const res = await deleteComment(targetId);
			if (res.mode === "soft") {
				setComments((prev) =>
					prev.map((c) =>
						c.id === targetId
							? {
									...c,
									is_deleted: true,
									content: "",
									updated_at: new Date().toISOString(),
								}
							: c,
					),
				);
			} else {
				setComments((prev) => prev.filter((c) => c.id !== targetId));
			}
			setPost((prev) =>
				prev
					? {
							...prev,
							comments_count: Math.max(
								0,
								prev.comments_count - 1,
							),
						}
					: null,
			);
			setCommentToDelete(null);
			triggerHaptic();
		} catch (err: unknown) {
			const e = err as Error;
			setError(e.message || "Failed to delete comment.");
		} finally {
			setIsDeletingComment(false);
		}
	};

	if (!isLoading && !post && !error) {
		if (accessStatus === "unauthenticated") {
			return (
				<View
					style={{ flex: 1, backgroundColor: "#faf9f5" }}
					className="flex-1 bg-background">
					<StatusBar style="dark" />
					<View
						style={{ paddingTop: Math.max(insets.top, 16) + 4 }}
						className="flex-row items-center justify-between border-b-2 border-border bg-card px-4 pb-3 shadow-neo-sm">
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Return to feed"
							onPress={handleGoBack}
							hitSlop={8}
							className="size-10 items-center justify-center border-2 border-border bg-secondary shadow-neo-sm active:translate-x-px active:translate-y-px">
							<ArrowLeft
								size={18}
								color="#000000"
								strokeWidth={2.5}
							/>
						</Pressable>
						<View className="mx-2 flex-1 items-center">
							<Text
								numberOfLines={1}
								className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
								POST // CLASSIFIED
							</Text>
							<Text
								numberOfLines={1}
								className="font-display text-sm tracking-tight text-foreground uppercase">
								RESTRICTED CONTENT
							</Text>
						</View>
						<View className="size-10" />
					</View>
					<View
						style={{
							flex: 1,
							paddingBottom: Math.max(insets.bottom, 16),
						}}
						className="flex-1 items-center justify-center p-6">
						<View className="w-full max-w-md items-center border-2 border-border bg-card p-6 shadow-neo">
							<View className="size-14 items-center justify-center border-2 border-border bg-muted">
								<Lock
									size={28}
									color="#000000"
									strokeWidth={2.5}
								/>
							</View>
							<Text className="mt-4 text-center font-display text-xl text-foreground uppercase">
								SIGN IN TO VIEW
							</Text>
							<Text className="mt-2 text-center font-mono text-xs leading-relaxed text-muted-foreground">
								This is a house-restricted post. Sign in with
								your operative account to verify clearance and
								view its contents.
							</Text>
							<NeoButton
								variant="primary"
								size="md"
								className="mt-6 w-full"
								onPress={() => {
									triggerHaptic();
									router.push("/(auth)/sign-in" as any);
								}}>
								SIGN IN
							</NeoButton>
							<NeoButton
								variant="secondary"
								size="md"
								className="mt-2.5 w-full"
								onPress={handleGoBack}>
								RETURN TO FEED
							</NeoButton>
						</View>
					</View>
				</View>
			);
		}

		if (accessStatus === "restricted") {
			return (
				<View
					style={{ flex: 1, backgroundColor: "#faf9f5" }}
					className="flex-1 bg-background">
					<StatusBar style="dark" />
					<View
						style={{ paddingTop: Math.max(insets.top, 16) + 4 }}
						className="flex-row items-center justify-between border-b-2 border-border bg-card px-4 pb-3 shadow-neo-sm">
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Return to feed"
							onPress={handleGoBack}
							hitSlop={8}
							className="size-10 items-center justify-center border-2 border-border bg-secondary shadow-neo-sm active:translate-x-px active:translate-y-px">
							<ArrowLeft
								size={18}
								color="#000000"
								strokeWidth={2.5}
							/>
						</Pressable>
						<View className="mx-2 flex-1 items-center">
							<Text
								numberOfLines={1}
								className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
								POST // CLASSIFIED
							</Text>
							<Text
								numberOfLines={1}
								className="font-display text-sm tracking-tight text-foreground uppercase">
								HOUSE CLEARANCE REQUIRED
							</Text>
						</View>
						<View className="size-10" />
					</View>
					<View
						style={{
							flex: 1,
							paddingBottom: Math.max(insets.bottom, 16),
						}}
						className="flex-1 items-center justify-center p-6">
						<View className="w-full max-w-md items-center border-2 border-border bg-card p-6 shadow-neo">
							<View className="size-14 items-center justify-center border-2 border-border bg-muted">
								<Shield
									size={28}
									color="#000000"
									strokeWidth={2.5}
								/>
							</View>
							<Text className="mt-4 text-center font-display text-xl text-foreground uppercase">
								HOUSE-RESTRICTED POST
							</Text>
							<Text className="mt-2 text-center font-mono text-xs leading-relaxed text-muted-foreground">
								This post is exclusive to verified members of
								this house. Only members of that house can view
								its contents. Your current house affiliation
								does not grant clearance.
							</Text>
							<NeoButton
								variant="primary"
								size="md"
								className="mt-6 w-full"
								onPress={handleGoBack}>
								GO BACK
							</NeoButton>
						</View>
					</View>
				</View>
			);
		}

		// accessStatus === "not_found" or other fallback
		return (
			<View
				style={{ flex: 1, backgroundColor: "#faf9f5" }}
				className="flex-1 bg-background">
				<StatusBar style="dark" />
				<View
					style={{ paddingTop: Math.max(insets.top, 16) + 4 }}
					className="flex-row items-center justify-between border-b-2 border-border bg-card px-4 pb-3 shadow-neo-sm">
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Return to feed"
						onPress={handleGoBack}
						hitSlop={8}
						className="size-10 items-center justify-center border-2 border-border bg-secondary shadow-neo-sm active:translate-x-px active:translate-y-px">
						<ArrowLeft
							size={18}
							color="#000000"
							strokeWidth={2.5}
						/>
					</Pressable>
					<View className="mx-2 flex-1 items-center">
						<Text
							numberOfLines={1}
							className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
							POST // 404
						</Text>
						<Text
							numberOfLines={1}
							className="font-display text-sm tracking-tight text-foreground uppercase">
							NOT FOUND
						</Text>
					</View>
					<View className="size-10" />
				</View>
				<View
					style={{
						flex: 1,
						paddingBottom: Math.max(insets.bottom, 16),
					}}
					className="flex-1 items-center justify-center p-6">
					<View className="w-full max-w-md items-center border-2 border-border bg-card p-6 shadow-neo">
						<View className="size-14 items-center justify-center border-2 border-border bg-muted">
							<FileQuestion
								size={28}
								color="#000000"
								strokeWidth={2.5}
							/>
						</View>
						<Text className="mt-4 text-center font-display text-xl text-foreground uppercase">
							POST DELETED OR NOT FOUND
						</Text>
						<Text className="mt-2 text-center font-mono text-xs leading-relaxed text-muted-foreground">
							The post you are attempting to access has been
							removed or does not exist.
						</Text>
						<NeoButton
							variant="primary"
							size="md"
							className="mt-6 w-full"
							onPress={handleGoBack}>
							RETURN TO FEED
						</NeoButton>
					</View>
				</View>
			</View>
		);
	}

	const authorDisplayName =
		post?.author?.display_name || post?.author?.username || "Student";
	const authorUsername = (post?.author?.username || "anon").toUpperCase();
	const authorInitials = (authorDisplayName || "ST")
		.slice(0, 2)
		.toUpperCase();
	const isUpvoted = post?.user_vote === 1;
	const isDownvoted = post?.user_vote === -1;
	const score = (post?.upvotes_count || 0) - (post?.downvotes_count || 0);
	const canManage = post
		? canManagePost(post, user?.id, profile?.role, profile?.guild)
		: false;
	const edited = post ? isPostEdited(post) : false;
	const isAdminModAction = Boolean(
		post &&
		(profile?.role === "admin" ||
			profile?.role === "mod" ||
			profile?.role === "house_mod") &&
		user?.id !== post.author_id,
	);

	const normalizedTags = normalizePostTags(post?.tags);
	const mediaUrls = normalizePostMedia(post);

	const guildId = post?.guild || post?.author?.guild;
	const guildMeta = guildId ? GUILD_META[guildId] : undefined;

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			style={{ flex: 1, backgroundColor: "#faf9f5" }}
			className="flex-1 bg-background">
			<StatusBar style="dark" />

			{/* Top App Bar */}
			<View
				style={{ paddingTop: Math.max(insets.top, 16) + 4 }}
				className="flex-row items-center justify-between border-b-2 border-border bg-card px-4 pb-3 shadow-neo-sm">
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Return to feed"
					onPress={handleGoBack}
					hitSlop={8}
					className="size-10 items-center justify-center border-2 border-border bg-secondary shadow-neo-sm active:translate-x-px active:translate-y-px">
					<ArrowLeft size={18} color="#000000" strokeWidth={2.5} />
				</Pressable>

				<View className="mx-2 flex-1 items-center">
					<Text
						numberOfLines={1}
						className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
						POST //{" "}
						{post
							? `ID:${post.id.slice(0, 8).toUpperCase()}`
							: "LOG"}
					</Text>
					<Text
						numberOfLines={1}
						className="font-display text-sm tracking-tight text-foreground uppercase">
						{authorDisplayName}'S POST
					</Text>
				</View>

				{canManage || Boolean(user) ? (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Post options"
						onPress={() => {
							triggerHaptic();
							setIsMenuOpen(true);
						}}
						hitSlop={8}
						className="size-10 items-center justify-center border-2 border-border bg-secondary shadow-neo-sm active:translate-x-px active:translate-y-px">
						<MoreHorizontal
							size={18}
							color="#000000"
							strokeWidth={2.5}
						/>
					</Pressable>
				) : (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Share post"
						onPress={handleOpenShare}
						hitSlop={8}
						className="size-10 items-center justify-center border-2 border-border bg-secondary shadow-neo-sm active:translate-x-px active:translate-y-px">
						<Share2 size={16} color="#000000" strokeWidth={2.3} />
					</Pressable>
				)}
			</View>

			{isLoading ? (
				<View
					style={{ flex: 1 }}
					className="flex-1 items-center justify-center">
					<ActivityIndicator size="large" color="#000000" />
				</View>
			) : post ? (
				<View style={{ flex: 1 }} className="flex-1">
					<ScrollView
						ref={scrollViewRef}
						style={{ flex: 1 }}
						className="flex-1"
						contentContainerStyle={{
							flexGrow: 1,
							paddingBottom: 24,
						}}
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled">
						{/* Edge-to-Edge Author & Classification Bar */}
						<View className="flex-row items-center justify-between border-b-2 border-border bg-neo-surface-active px-4 py-2.5">
							<Pressable
								onPress={() => {
									if (post.author?.username) {
										triggerHaptic();
										router.push(
											`/u/${post.author.username}` as any,
										);
									}
								}}
								className="min-w-0 flex-1 flex-row items-center gap-2.5 pr-2 active:opacity-75">
								<View
									className={`size-8 shrink-0 items-center justify-center border border-border ${guildMeta?.bg ?? "bg-primary"}`}>
									{post.author?.avatar_url?.startsWith(
										"http",
									) ? (
										<ExpoImage
											source={{
												uri: post.author.avatar_url,
											}}
											style={{
												width: "100%",
												height: "100%",
											}}
											contentFit="cover"
										/>
									) : (
										<Text className="font-bold text-xs text-primary-foreground">
											{guildMeta?.badge ?? authorInitials}
										</Text>
									)}
								</View>

								<View className="min-w-0 flex-1">
									<View className="flex-row items-center gap-1.5">
										<Text
											numberOfLines={1}
											className="shrink font-bold text-xs tracking-wider text-foreground uppercase">
											@{authorUsername}
										</Text>
										<UserRoleBadge
											role={post.author?.role}
											isVerified={
												post.author?.is_verified
											}
											guild={
												post.author?.guild || post.guild
											}
											size="sm"
										/>
									</View>
									<Text className="font-mono text-2xs text-muted-foreground">
										{formatRelativeTime(post.created_at)}
										{edited ? " • (EDITED)" : ""}
									</Text>
								</View>
							</Pressable>

							<View className="shrink-0 flex-row items-center gap-1.5">
								{post.visibility === "house" && (
									<View className="flex-row items-center gap-1 border border-border bg-primary px-1.5 py-0.5">
										<Lock
											size={9}
											color="#00FF66"
											strokeWidth={2.5}
										/>
										<Text className="font-bold text-3xs tracking-wider text-neo-green uppercase">
											HOUSE
										</Text>
									</View>
								)}
								{post.author?.guild && (
									<GuildBadge
										guildId={post.author.guild}
										size="sm"
									/>
								)}
							</View>
						</View>

						{/* Editorial Dispatch Body (Full Bleed - No enclosing NeoCard box!) */}
						<View className="bg-background px-4 pt-5 pb-4">
							<Text className="font-display text-2xl leading-tight tracking-tight text-foreground uppercase sm:text-3xl">
								{post.title}
							</Text>

							<Text className="mt-3.5 font-mono text-sm leading-relaxed text-foreground select-text sm:text-base">
								{post.content}
							</Text>

							{/* Neo-brutalist Terminal Code Viewport */}
							{post.code_snippet && (
								<TerminalCodeViewport
									code={post.code_snippet}
									language={post.code_language}
									className="my-4"
								/>
							)}

							{/* Media Asset Render (Single or Swipeable Carousel) */}
							{mediaUrls.length > 0 && (
								<PostMediaCarousel
									mediaUrls={mediaUrls}
									height={280}
									onMediaPress={(index) =>
										setLightboxIndex(index)
									}
									className="my-4"
								/>
							)}

							{/* Post Tags */}
							{normalizedTags.length > 0 && (
								<View className="mt-3 flex-row flex-wrap items-center gap-1.5">
									{normalizedTags.map((tag) => (
										<View
											key={tag}
											className="border border-border bg-secondary px-2.5 py-1">
											<Text className="font-bold text-xs text-foreground uppercase">
												{tag.startsWith("#")
													? tag
													: `#${tag}`}
											</Text>
										</View>
									))}
								</View>
							)}
						</View>

						{/* Action & Engagement Bar (Consistent with Feed PostCard!) */}
						<View className="flex-row items-center justify-between border-t-2 border-border bg-surface px-4 py-3">
							<View className="flex-row items-center border-2 border-border bg-surface shadow-neo-xs">
								<Pressable
									accessibilityRole="button"
									accessibilityLabel="Upvote"
									onPress={() => handleVote(1)}
									className={`h-9 items-center justify-center border-r border-border px-3.5 ${
										isUpvoted
											? "bg-neo-green"
											: "active:bg-primary/10"
									}`}>
									<ArrowUp
										size={16}
										color="#000000"
										strokeWidth={isUpvoted ? 3 : 2.2}
									/>
								</Pressable>

								<View className="min-w-11 items-center justify-center px-2.5">
									<Text className="font-bold text-xs text-foreground tabular-nums">
										{score}
									</Text>
								</View>

								<Pressable
									accessibilityRole="button"
									accessibilityLabel="Downvote"
									onPress={() => handleVote(-1)}
									className={`h-9 items-center justify-center border-l border-border px-3.5 ${
										isDownvoted
											? "bg-primary"
											: "active:bg-primary/10"
									}`}>
									<ArrowDown
										size={16}
										color={
											isDownvoted ? "#faf9f5" : "#000000"
										}
										strokeWidth={isDownvoted ? 3 : 2.2}
									/>
								</Pressable>
							</View>

							<View className="flex-row items-center gap-2">
								<View className="h-9 flex-row items-center gap-1.5 border-2 border-border bg-surface px-3 shadow-neo-xs">
									<MessageSquare
										size={14}
										color="#000000"
										strokeWidth={2.2}
									/>
									<Text className="font-bold text-xs text-foreground tabular-nums">
										{post.comments_count}
									</Text>
								</View>

								<Pressable
									accessibilityRole="button"
									accessibilityLabel="Share post"
									onPress={handleOpenShare}
									className="size-9 items-center justify-center border-2 border-border bg-surface shadow-neo-xs active:translate-x-px active:translate-y-px">
									<Share2
										size={15}
										color="#000000"
										strokeWidth={2.2}
									/>
								</Pressable>
							</View>
						</View>

						{/* Section Header: Responses Stream */}
						<View className="flex-row items-center justify-between border-y-2 border-border bg-neo-surface-active px-4 py-2.5">
							<Text className="font-mono text-xs tracking-wider text-foreground uppercase">
								RESPONSES ({comments.length})
							</Text>
						</View>

						{/* Comments Tree */}
						{comments.length === 0 ? (
							<View className="mx-4 my-8 items-center justify-center border-2 border-dashed border-border/30 bg-card p-6">
								<MessageSquare
									size={24}
									color="#000000"
									strokeWidth={1.8}
								/>
								<Text className="mt-3 text-center font-display text-sm tracking-tight text-foreground uppercase">
									NO RESPONSES RECORDED
								</Text>
								<Text className="mt-1 text-center font-mono text-xs text-muted-foreground">
									Be the first operative to respond to this
									post.
								</Text>
							</View>
						) : (
							<View className="divide-y divide-border/20">
								{commentTree.map((rootNode) => {
									const renderBranch = (
										node: CommentTreeNode,
									): React.ReactNode => {
										const { comment, replies, depth } =
											node;
										const isCollapsed = Boolean(
											collapsedIds[comment.id],
										);
										const hiddenReplyCount =
											countSubtreeReplies(node);
										const isDeleted = Boolean(
											comment.is_deleted,
										);
										const isAuthor = Boolean(
											userId &&
											userId === comment.author_id,
										);
										const isEditing =
											editingCommentId === comment.id;

										const cDisplayName = isDeleted
											? "[deleted]"
											: comment.author?.display_name ||
												comment.author?.username ||
												"Student";
										const cInitials = cDisplayName
											.slice(0, 2)
											.toUpperCase();
										const canIndentChildren =
											depth < MAX_VISUAL_DEPTH;

										return (
											<View
												key={comment.id}
												className={
													depth === 0
														? "px-4 py-3.5"
														: "pt-3 pl-3"
												}>
												{/* Comment Header */}
												<View className="flex-row items-center justify-between gap-2">
													<View className="min-w-0 flex-1 flex-row items-center gap-2">
														{isDeleted ? (
															<Text className="font-semibold text-xs text-muted-foreground italic">
																[deleted]
															</Text>
														) : (
															<Pressable
																onPress={() => {
																	if (
																		comment
																			.author
																			?.username
																	) {
																		triggerHaptic();
																		router.push(
																			`/u/${comment.author.username}` as any,
																		);
																	}
																}}
																className="flex-row items-center gap-2 active:opacity-75">
																<View className="size-6 items-center justify-center overflow-hidden border border-border bg-secondary">
																	{comment.author?.avatar_url?.startsWith(
																		"http",
																	) ? (
																		<ExpoImage
																			source={{
																				uri: comment
																					.author
																					.avatar_url,
																			}}
																			style={{
																				width: "100%",
																				height: "100%",
																			}}
																			contentFit="cover"
																		/>
																	) : (
																		<Text className="font-bold text-2xs text-foreground">
																			{
																				cInitials
																			}
																		</Text>
																	)}
																</View>
																<Text
																	numberOfLines={
																		1
																	}
																	className="font-bold text-xs text-foreground uppercase">
																	@
																	{comment
																		.author
																		?.username ||
																		cDisplayName}
																</Text>
															</Pressable>
														)}

														{!isDeleted &&
															comment.author
																?.role && (
																<UserRoleBadge
																	role={
																		comment
																			.author
																			.role
																	}
																	size="sm"
																/>
															)}

														{!isDeleted &&
															comment.author
																?.guild && (
																<GuildBadge
																	guildId={
																		comment
																			.author
																			.guild
																	}
																	size="sm"
																/>
															)}
													</View>

													<View className="flex-row items-center gap-2">
														<View className="flex-row items-center gap-1">
															<Text className="font-mono text-[10px] text-muted-foreground">
																{formatRelativeTime(
																	comment.created_at,
																)}
															</Text>
															{!isDeleted &&
																comment.updated_at &&
																comment.updated_at !==
																	comment.created_at && (
																	<Text className="font-mono text-[10px] text-muted-foreground">
																		(edited)
																	</Text>
																)}
														</View>
														{replies.length > 0 && (
															<Pressable
																onPress={() =>
																	toggleCollapse(
																		comment.id,
																	)
																}
																hitSlop={6}
																className="border border-border bg-secondary px-1.5 py-0.5 active:opacity-75">
																<Text className="font-bold text-[10px] text-foreground">
																	{isCollapsed
																		? `+${hiddenReplyCount}`
																		: "−"}
																</Text>
															</Pressable>
														)}
													</View>
												</View>

												{isCollapsed ? (
													<Pressable
														onPress={() =>
															toggleCollapse(
																comment.id,
															)
														}
														className="mt-1.5 self-start border border-border/40 bg-secondary/60 px-2 py-0.5 active:opacity-75">
														<Text className="font-mono text-[10px] text-muted-foreground">
															Thread collapsed (
															{hiddenReplyCount}{" "}
															{hiddenReplyCount ===
															1
																? "reply"
																: "replies"}
															) — tap to expand
														</Text>
													</Pressable>
												) : isDeleted ? (
													<Text className="mt-1.5 font-mono text-xs text-muted-foreground italic select-text">
														[deleted]
													</Text>
												) : (
													<>
														{depth >
															MAX_VISUAL_DEPTH &&
															comment.reply_to_username && (
																<View className="mt-1 flex-row items-center gap-1">
																	<CornerDownRight
																		size={
																			11
																		}
																		color="#000000"
																	/>
																	<Text className="font-bold text-[11px] text-foreground">
																		@
																		{
																			comment.reply_to_username
																		}
																	</Text>
																</View>
															)}

														{isEditing ? (
															<View className="mt-2 border-2 border-border bg-card p-2.5 shadow-neo-sm">
																<TextInput
																	value={
																		editingCommentContent
																	}
																	onChangeText={
																		setEditingCommentContent
																	}
																	multiline
																	autoFocus
																	maxLength={
																		2000
																	}
																	placeholder="Edit your comment..."
																	placeholderTextColor="#71717A"
																	className="min-h-16 font-mono text-xs text-foreground"
																	textAlignVertical="top"
																/>
																<View className="mt-2 flex-row items-center justify-end gap-2">
																	<Pressable
																		disabled={
																			isSavingCommentEdit
																		}
																		onPress={() => {
																			triggerHaptic();
																			setEditingCommentId(
																				null,
																			);
																			setEditingCommentContent(
																				"",
																			);
																		}}
																		className="border border-border bg-secondary px-2.5 py-1 active:opacity-75">
																		<Text className="font-bold text-xs text-foreground uppercase">
																			Cancel
																		</Text>
																	</Pressable>
																	<Pressable
																		disabled={
																			isSavingCommentEdit ||
																			!editingCommentContent.trim()
																		}
																		onPress={
																			handleSaveCommentEdit
																		}
																		className={`border border-border bg-primary px-3 py-1 active:opacity-75 ${
																			!editingCommentContent.trim() ||
																			isSavingCommentEdit
																				? "opacity-50"
																				: ""
																		}`}>
																		{isSavingCommentEdit ? (
																			<ActivityIndicator
																				size="small"
																				color="#FFFFFF"
																			/>
																		) : (
																			<Text className="font-bold text-xs text-primary-foreground uppercase">
																				Save
																			</Text>
																		)}
																	</Pressable>
																</View>
															</View>
														) : (
															<>
																<Text className="mt-1.5 font-mono text-xs leading-relaxed text-foreground select-text">
																	{
																		comment.content
																	}
																</Text>

																<View className="mt-2 flex-row items-center gap-2">
																	<Pressable
																		onPress={() => {
																			triggerHaptic();
																			setReplyingTo(
																				{
																					id: comment.id,
																					username:
																						comment
																							.author
																							?.username ||
																						"student",
																				},
																			);
																		}}
																		className="flex-row items-center gap-1 border border-border bg-secondary px-2 py-0.5 active:opacity-70">
																		<CornerDownRight
																			size={
																				10
																			}
																			color="#000000"
																		/>
																		<Text className="font-bold text-[10px] text-foreground uppercase">
																			REPLY
																		</Text>
																	</Pressable>

																	{isAuthor && (
																		<>
																			<Pressable
																				onPress={() => {
																					triggerHaptic();
																					setEditingCommentId(
																						comment.id,
																					);
																					setEditingCommentContent(
																						comment.content,
																					);
																				}}
																				className="flex-row items-center gap-1 border border-border bg-secondary px-2 py-0.5 active:opacity-70">
																				<Pencil
																					size={
																						10
																					}
																					color="#000000"
																				/>
																				<Text className="font-bold text-[10px] text-foreground uppercase">
																					EDIT
																				</Text>
																			</Pressable>

																			<Pressable
																				onPress={() => {
																					triggerHaptic();
																					setCommentToDelete(
																						comment,
																					);
																				}}
																				className="flex-row items-center gap-1 border border-destructive/40 bg-destructive/10 px-2 py-0.5 active:opacity-70">
																				<Trash2
																					size={
																						10
																					}
																					color="#DC2626"
																				/>
																				<Text className="font-bold text-[10px] text-destructive uppercase">
																					DELETE
																				</Text>
																			</Pressable>
																		</>
																	)}

																	{user &&
																		!isAuthor && (
																			<Pressable
																				accessibilityRole="button"
																				accessibilityLabel="Report comment"
																				onPress={() => {
																					triggerHaptic();
																					setCommentToReport(
																						comment,
																					);
																				}}
																				className="flex-row items-center gap-1 border border-border bg-secondary px-2 py-0.5 active:opacity-70">
																				<Flag
																					size={
																						10
																					}
																					color="#ff2a00"
																					strokeWidth={
																						2.4
																					}
																				/>
																				<Text className="font-bold text-[10px] text-foreground uppercase">
																					REPORT
																				</Text>
																			</Pressable>
																		)}
																</View>
															</>
														)}
													</>
												)}

												{/* Nested Guide Tree */}
												{replies.length > 0 &&
													!isCollapsed && (
														<View
															className={`mt-1 flex-row ${
																canIndentChildren
																	? "ml-2"
																	: ""
															}`}>
															<Pressable
																accessibilityLabel="Collapse thread branch"
																onPress={() =>
																	toggleCollapse(
																		comment.id,
																	)
																}
																hitSlop={6}
																className="w-3 items-center pt-2 active:opacity-60">
																<View className="w-0.5 flex-1 bg-border/30" />
															</Pressable>
															<View className="min-w-0 flex-1">
																{replies.map(
																	(
																		childNode,
																	) =>
																		renderBranch(
																			childNode,
																		),
																)}
															</View>
														</View>
													)}
											</View>
										);
									};

									return renderBranch(rootNode);
								})}
							</View>
						)}
					</ScrollView>

					{/* Fixed Sticky Reply Input Bar */}
					<View
						style={{
							paddingBottom: isKeyboardVisible
								? 12
								: Math.max(insets.bottom, 12),
						}}
						className="border-t-2 border-border bg-card p-3 shadow-neo-top-sm">
						{replyingTo && (
							<View className="mb-2 flex-row items-center justify-between border border-border bg-secondary px-2.5 py-1">
								<View className="flex-row items-center gap-1.5">
									<CornerDownRight
										size={12}
										color="#000000"
									/>
									<Text className="font-bold text-xs text-foreground">
										Replying to @{replyingTo.username}
									</Text>
								</View>
								<Pressable
									onPress={() => {
										triggerHaptic();
										setReplyingTo(null);
									}}
									hitSlop={8}
									className="p-0.5">
									<X
										size={13}
										color="#000000"
										strokeWidth={2.5}
									/>
								</Pressable>
							</View>
						)}

						<View className="flex-row items-center gap-2">
							<TextInput
								value={replyText}
								onChangeText={setReplyText}
								placeholder={
									user
										? "Transmit response..."
										: "Sign in to write a response..."
								}
								placeholderTextColor="rgba(0, 0, 0, 0.4)"
								multiline
								editable={Boolean(user)}
								style={{ minHeight: 40 }}
								className="max-h-24 flex-1 border-2 border-border bg-card px-3 py-2 font-mono text-xs text-foreground focus:border-border"
							/>
							<NeoButton
								variant="primary"
								size="sm"
								loading={isSubmittingReply}
								disabled={
									isSubmittingReply ||
									!replyText.trim() ||
									!user
								}
								onPress={handleSendReply}>
								<Send size={15} color="#faf9f5" />
							</NeoButton>
						</View>
					</View>
				</View>
			) : error ? (
				<View
					style={{ flex: 1 }}
					className="flex-1 items-center justify-center p-6">
					<NetworkErrorCard
						message={error}
						onRetry={loadPostData}
						isRetrying={isLoading}
						className="w-full max-w-md"
					/>
				</View>
			) : (
				<View
					style={{ flex: 1 }}
					className="flex-1 items-center justify-center p-6">
					<View className="w-full max-w-md items-center border-2 border-border bg-card p-6 shadow-neo">
						<View className="size-14 items-center justify-center border-2 border-border bg-muted">
							<FileQuestion
								size={28}
								color="#000000"
								strokeWidth={2.5}
							/>
						</View>
						<Text className="mt-4 text-center font-display text-xl text-foreground uppercase">
							POST DELETED OR NOT FOUND
						</Text>
						<Text className="mt-2 text-center font-mono text-xs leading-relaxed text-muted-foreground">
							The post you are attempting to access has been
							removed or does not exist.
						</Text>
						<NeoButton
							variant="primary"
							size="md"
							className="mt-6 w-full"
							onPress={handleGoBack}>
							RETURN TO FEED
						</NeoButton>
					</View>
				</View>
			)}

			<PostMediaLightboxModal
				visible={lightboxIndex !== null}
				mediaUrls={mediaUrls}
				initialIndex={lightboxIndex ?? 0}
				onClose={() => setLightboxIndex(null)}
			/>

			{post && (canManage || Boolean(user)) && (
				<>
					<MobileSheet
						open={isMenuOpen}
						onOpenChange={setIsMenuOpen}
						title="Post Controls"
						subtitle={
							isAdminModAction
								? `Moderation for @${post.author?.username || "student"}'s post`
								: "Update or report this post."
						}>
						<View className="gap-2.5 pb-4">
							{isAdminModAction && (
								<View className="mb-1 flex-row items-center gap-2 border border-border bg-secondary px-3 py-2">
									<ShieldAlert size={14} color="#ff2a00" />
									<Text className="font-bold text-xs text-foreground uppercase">
										Moderator override enabled
									</Text>
								</View>
							)}
							{user?.id === post.author_id && (
								<NeoButton
									size="md"
									variant="outline"
									className="w-full justify-start"
									startContent={
										<PenSquare
											size={15}
											color="#000000"
											strokeWidth={2.3}
										/>
									}
									onPress={() => {
										setIsMenuOpen(false);
										setIsEditOpen(true);
									}}>
									EDIT POST
								</NeoButton>
							)}
							{canManage && (
								<NeoButton
									size="md"
									variant="destructive"
									className="w-full justify-start"
									startContent={
										<Trash2
											size={15}
											color="#faf9f5"
											strokeWidth={2.3}
										/>
									}
									onPress={() => {
										setIsMenuOpen(false);
										setIsDeleteOpen(true);
									}}>
									{isAdminModAction
										? "PURGE POST"
										: "DELETE POST"}
								</NeoButton>
							)}
							<NeoButton
								size="md"
								variant="outline"
								className="w-full justify-start"
								startContent={
									<Share2
										size={15}
										color="#000000"
										strokeWidth={2.3}
									/>
								}
								onPress={() => {
									setIsMenuOpen(false);
									void handleOpenShare();
								}}>
								SHARE POST
							</NeoButton>
							{user && user.id !== post.author_id && (
								<NeoButton
									size="md"
									variant="outline"
									className="w-full justify-start"
									startContent={
										<Flag
											size={15}
											color="#ff2a00"
											strokeWidth={2.3}
										/>
									}
									onPress={() => {
										setIsMenuOpen(false);
										setIsPostReportOpen(true);
									}}>
									REPORT POST
								</NeoButton>
							)}
						</View>
					</MobileSheet>

					{canManage && (
						<>
							<PostComposerModal
								open={isEditOpen}
								onOpenChange={setIsEditOpen}
								editingPost={post}
								onPostUpdated={(updated) => setPost(updated)}
							/>

							<MobileAlertSheet
								open={isDeleteOpen}
								onOpenChange={setIsDeleteOpen}
								title={
									isAdminModAction
										? "Purge Post"
										: "Delete Post"
								}
								type="error"
								description={`Are you sure you want to permanently delete "${post.title}"? This action cannot be undone.`}
								actions={[
									{
										label: isAdminModAction
											? "Purge Permanently"
											: "Delete Permanently",
										onPress: handleConfirmDelete,
										variant: "destructive",
										loading: isDeleting,
									},
									{
										label: "Cancel",
										onPress: () => setIsDeleteOpen(false),
										variant: "outline",
									},
								]}
							/>
						</>
					)}
				</>
			)}

			{post && (
				<ReportModal
					open={isPostReportOpen}
					onOpenChange={setIsPostReportOpen}
					targetType="post"
					targetId={post.id}
					guild={post.guild || post.author?.guild}
					targetTitle={post.title}
				/>
			)}

			<ReportModal
				open={Boolean(commentToReport)}
				onOpenChange={(open) => {
					if (!open) setCommentToReport(null);
				}}
				targetType="comment"
				targetId={commentToReport?.id || ""}
				guild={post?.guild || commentToReport?.author?.guild}
				targetTitle={
					commentToReport
						? `@${commentToReport.author?.username || "student"}: "${commentToReport.content.slice(0, 60)}"`
						: undefined
				}
			/>

			<MobileAlertSheet
				open={Boolean(commentToDelete)}
				onOpenChange={(open) => {
					if (!open && !isDeletingComment) {
						setCommentToDelete(null);
					}
				}}
				title="Delete Comment"
				type="error"
				description="Are you sure you want to delete this comment? If it has replies, it will be marked as [deleted] to keep conversation context."
				actions={[
					{
						label: "Delete",
						onPress: handleConfirmDeleteComment,
						variant: "destructive",
						loading: isDeletingComment,
					},
					{
						label: "Cancel",
						onPress: () => setCommentToDelete(null),
						variant: "outline",
					},
				]}
			/>
		</KeyboardAvoidingView>
	);
}
