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
	Bookmark,
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
	RefreshControl,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	LinkifiedText,
	LinkPreviewList,
	MobileAlertSheet,
	MobileSheet,
	NeoButton,
	NetworkErrorCard,
	shouldShowLinkPreview,
	TerminalCodeViewport,
} from "@/components/ui";
import { UserRoleBadge } from "@/features/auth/components/UserRoleBadge";
import { canManagePost } from "@/features/auth/permissions";
import { GuildBadge } from "@/features/guilds/components/GuildBadge";
import { SharePostModal } from "@/features/messages/components/SharePostModal";
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
import { useBookmarksStore } from "@/features/posts/bookmarks";
import { MentionAutocomplete } from "@/features/posts/components/MentionAutocomplete";
import { PostComposerModal } from "@/features/posts/components/PostComposerModal";
import { PostMediaCarousel } from "@/features/posts/components/PostMediaCarousel";
import { PostMediaLightboxModal } from "@/features/posts/components/PostMediaLightboxModal";
import {
	patchPostInFeedCaches,
	removePostFromFeedCaches,
	replacePostInFeedCaches,
} from "@/features/posts/queries";
import type { Comment, Post } from "@/features/posts/types";
import {
	buildCommentTree,
	type CommentSort,
	type CommentTreeNode,
	countSubtreeReplies,
	MAX_VISUAL_DEPTH,
	sortCommentTree,
} from "@/features/posts/utils/comment-tree";
import { formatHashtag } from "@/features/posts/utils/search-filter";
import { toast } from "@/lib/toast";

const GUILD_META: Record<
	string,
	{ tag: string; badge: string; bg: string; textClass: string }
> = {
	octagram: {
		tag: "OCTAGRAM",
		badge: "0x",
		bg: "bg-primary",
		textClass: "text-primary-foreground",
	},
	chameleon: {
		tag: "CHAMELEON",
		badge: "RGB",
		bg: "bg-neo-green",
		textClass: "text-foreground",
	},
	blue_jays: {
		tag: "BLUE JAYS",
		badge: "PRESS",
		bg: "bg-neo-cyan",
		textClass: "text-foreground",
	},
};

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

export default function PostDetailScreen() {
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams<{
		id: string | string[];
		commentId?: string | string[];
	}>();
	const id = Array.isArray(params.id) ? params.id[0] : params.id;
	const targetCommentId = Array.isArray(params.commentId)
		? params.commentId[0]
		: params.commentId;
	const scrollViewRef = useRef<ScrollView>(null);
	const targetCommentRef = useRef<View>(null);
	const hasScrolledToTargetRef = useRef<string | null>(null);

	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);
	const isBookmarked = useBookmarksStore((s) =>
		id ? Boolean(s.bookmarkedIds[id]) : false,
	);
	const toggleBookmark = useBookmarksStore((s) => s.toggleBookmark);

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
	const [replyCursor, setReplyCursor] = useState<number | undefined>(
		undefined,
	);
	const [isSubmittingReply, setIsSubmittingReply] = useState(false);
	const [replyingTo, setReplyingTo] = useState<{
		id: string;
		username: string;
	} | null>(null);
	const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>(
		{},
	);
	const [expiredHighlightId, setExpiredHighlightId] = useState<string | null>(
		null,
	);
	const [prevTargetCommentId, setPrevTargetCommentId] =
		useState(targetCommentId);
	const [reloadTick, setReloadTick] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isPostReportOpen, setIsPostReportOpen] = useState(false);
	const [isShareOpen, setIsShareOpen] = useState(false);
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
	const [commentSort, setCommentSort] = useState<CommentSort>("top");
	const [isRefreshing, setIsRefreshing] = useState(false);

	const commentTree = useMemo(
		() => sortCommentTree(buildCommentTree(comments), commentSort),
		[comments, commentSort],
	);

	if (targetCommentId !== prevTargetCommentId) {
		setPrevTargetCommentId(targetCommentId);
		setExpiredHighlightId(null);
		if (targetCommentId) {
			setCollapsedIds({});
		}
	}

	const hasTargetComment = Boolean(
		targetCommentId && comments.some((c) => c.id === targetCommentId),
	);
	const highlightedCommentId =
		hasTargetComment && expiredHighlightId !== targetCommentId
			? targetCommentId
			: null;

	useEffect(() => {
		if (!hasTargetComment || !targetCommentId) return;

		const timer = setTimeout(() => {
			setExpiredHighlightId(targetCommentId);
		}, 2800);

		return () => clearTimeout(timer);
	}, [hasTargetComment, targetCommentId]);

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
			removePostFromFeedCaches(post.id);
			setIsDeleteOpen(false);
			toast.success("Post deleted");
			handleGoBack();
		} catch (err: unknown) {
			const e = err as Error;
			toast.error(e.message || "Failed to delete post.");
		} finally {
			setIsDeleting(false);
		}
	};

	const handleRetry = () => {
		setReloadTick((prev) => prev + 1);
	};

	const handlePullRefresh = async () => {
		if (!id || isRefreshing) return;
		setIsRefreshing(true);
		try {
			const res = await fetchPostById(id, userId, userGuild, isAdmin);
			setAccessStatus(res.accessStatus);
			if (res.post) {
				setPost(res.post);
				const comms = await fetchPostComments(id);
				setComments(comms);
			}
		} catch (err: unknown) {
			const e = err as Error;
			toast.error(e?.message || "Failed to refresh post.");
		} finally {
			setIsRefreshing(false);
		}
	};

	useEffect(() => {
		if (!id) return;
		let cancelled = false;

		const loadPostData = async () => {
			setIsLoading(true);
			setError(null);
			try {
				const res = await fetchPostById(id, userId, userGuild, isAdmin);
				if (cancelled) return;
				setAccessStatus(res.accessStatus);
				if (res.post) {
					setPost(res.post);
					const comms = await fetchPostComments(id);
					if (cancelled) return;
					setComments(comms);
				} else {
					setPost(null);
				}
			} catch (err: unknown) {
				if (cancelled) return;
				const e = err as Error;
				setError(
					e.message ||
						"Unable to reach the server. Check your connection and try again.",
				);
			} finally {
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		};

		queueMicrotask(() => {
			if (!cancelled) {
				void loadPostData();
			}
		});

		return () => {
			cancelled = true;
		};
	}, [id, userId, userGuild, isAdmin, reloadTick]);

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
		patchPostInFeedCaches(post.id, {
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
			patchPostInFeedCaches(post.id, {
				upvotes_count: res.upvotes_count,
				downvotes_count: res.downvotes_count,
				user_vote: res.user_vote,
			});
			if (user.id === post.author_id) {
				void useAuthStore.getState().refreshUserData();
			}
		} catch (err: unknown) {
			setPost(previousPost);
			patchPostInFeedCaches(post.id, {
				upvotes_count: previousPost.upvotes_count,
				downvotes_count: previousPost.downvotes_count,
				user_vote: previousPost.user_vote,
			});
			const e = err as Error;
			toast.error(e.message || "Failed to record vote.");
		}
	};

	const handleOpenShare = () => {
		if (!post) return;
		triggerHaptic();
		setIsShareOpen(true);
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
			toast.error(e.message || "Failed to send comment.");
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
			toast.error(e.message || "Failed to edit comment.");
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
			toast.error(e.message || "Failed to delete comment.");
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
								your user account to verify clearance and view
								its contents.
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
				style={{ paddingTop: Math.max(insets.top, 8) }}
				className="border-b-2 border-border bg-background">
				<View className="flex-row items-center justify-between px-4 py-2.5">
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Return to feed"
						onPress={handleGoBack}
						hitSlop={8}
						className="size-9 items-center justify-center border-2 border-border bg-surface shadow-neo-xs active:translate-x-px active:translate-y-px">
						<ArrowLeft
							size={16}
							color="#000000"
							strokeWidth={2.5}
						/>
					</Pressable>

					<Text
						numberOfLines={1}
						className="mx-3 flex-1 text-center font-ndot-caps text-sm tracking-wider text-foreground uppercase">
						{authorDisplayName}'S POST
					</Text>

					{canManage || Boolean(user) ? (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Post options"
							onPress={() => {
								triggerHaptic();
								setIsMenuOpen(true);
							}}
							hitSlop={8}
							className="size-9 items-center justify-center border-2 border-border bg-surface shadow-neo-xs active:translate-x-px active:translate-y-px">
							<MoreHorizontal
								size={16}
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
							className="size-9 items-center justify-center border-2 border-border bg-surface shadow-neo-xs active:translate-x-px active:translate-y-px">
							<Share2
								size={15}
								color="#000000"
								strokeWidth={2.3}
							/>
						</Pressable>
					)}
				</View>
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
						refreshControl={
							<RefreshControl
								refreshing={isRefreshing}
								onRefresh={() => void handlePullRefresh()}
								tintColor="#000000"
							/>
						}
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled">
						{/* Author & Classification Bar */}
						<View className="flex-row items-center justify-between border-b-2 border-border bg-surface px-4 py-3">
							<Pressable
								onPress={() => {
									if (post.author?.username) {
										triggerHaptic();
										router.push(
											`/u/${post.author.username}` as any,
										);
									}
								}}
								className="min-w-0 flex-1 flex-row items-center gap-3 pr-2 active:opacity-75">
								<View
									className={`size-10 shrink-0 items-center justify-center overflow-hidden border-2 border-border ${guildMeta?.bg ?? "bg-primary"}`}>
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
										<Text
											numberOfLines={1}
											adjustsFontSizeToFit
											className={`px-0.5 font-bold text-2xs ${guildMeta?.textClass ?? "text-primary-foreground"}`}>
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
									<Text className="mt-0.5 font-mono text-2xs tracking-wider text-muted-foreground uppercase tabular-nums">
										{formatRelativeTime(post.created_at)}
										{edited ? " · EDITED" : ""}
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
										<Text className="font-bold text-3xs tracking-widest text-neo-green uppercase">
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

						{/* Editorial Body */}
						<View className="bg-card px-4 pt-5 pb-5">
							<Text className="font-display text-2xl leading-tight tracking-tight text-foreground uppercase sm:text-3xl">
								{post.title}
							</Text>

							<LinkifiedText
								hideStandaloneUrls={shouldShowLinkPreview(
									post.content,
									mediaUrls.length > 0,
								)}
								compactInlineLinks
								className="mt-3.5 font-sans text-sm leading-relaxed text-foreground select-text sm:text-base">
								{post.content}
							</LinkifiedText>

							<LinkPreviewList
								text={post.content}
								hasMedia={mediaUrls.length > 0}
								className="mt-4"
							/>

							{/* Terminal Code Viewport */}
							{post.code_snippet && (
								<TerminalCodeViewport
									code={post.code_snippet}
									language={post.code_language}
									className="my-4"
								/>
							)}

							{/* Media Carousel */}
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
								<View className="mt-3.5 flex-row flex-wrap items-center gap-1.5">
									{normalizedTags.map((tag) => {
										const formattedTag = formatHashtag(tag);
										if (!formattedTag) return null;
										return (
											<Pressable
												key={tag}
												accessibilityRole="button"
												accessibilityLabel={`Search tag ${formattedTag}`}
												onPress={() => {
													triggerHaptic();
													router.push({
														pathname:
															"/(tabs)/search",
														params: {
															q: formattedTag,
														},
													} as any);
												}}
												className="border border-border/60 bg-surface px-2.5 py-0.5 active:bg-neo-green">
												<Text className="font-mono text-2xs tracking-wider text-foreground uppercase">
													{formattedTag}
												</Text>
											</Pressable>
										);
									})}
								</View>
							)}
						</View>

						{/* Docked Structural Engagement Rail */}
						<View className="flex-row items-stretch justify-between border-t-2 border-border bg-surface">
							<View className="flex-row items-stretch">
								<Pressable
									accessibilityRole="button"
									accessibilityLabel="Upvote"
									onPress={() => handleVote(1)}
									className={`h-11 w-12 items-center justify-center border-r-2 border-border ${
										isUpvoted
											? "bg-neo-green"
											: "active:bg-secondary"
									}`}>
									<ArrowUp
										size={16}
										color="#000000"
										strokeWidth={isUpvoted ? 3 : 2.3}
									/>
								</Pressable>

								<View className="min-w-12 items-center justify-center border-r-2 border-border bg-card px-2.5">
									<Text className="font-display text-sm text-foreground tabular-nums">
										{score}
									</Text>
								</View>

								<Pressable
									accessibilityRole="button"
									accessibilityLabel="Downvote"
									onPress={() => handleVote(-1)}
									className={`h-11 w-12 items-center justify-center border-r-2 border-border ${
										isDownvoted
											? "bg-primary"
											: "active:bg-secondary"
									}`}>
									<ArrowDown
										size={16}
										color={
											isDownvoted ? "#faf9f5" : "#000000"
										}
										strokeWidth={isDownvoted ? 3 : 2.3}
									/>
								</Pressable>
							</View>

							<View className="flex-row items-stretch">
								<View className="h-11 flex-row items-center gap-1.5 border-l-2 border-border px-3.5">
									<MessageSquare
										size={15}
										color="#000000"
										strokeWidth={2.2}
									/>
									<Text className="font-bold text-xs text-foreground tabular-nums">
										{post.comments_count}
									</Text>
								</View>

								<Pressable
									accessibilityRole="button"
									accessibilityLabel={
										isBookmarked
											? "Remove bookmark"
											: "Save post"
									}
									onPress={() => {
										if (!user?.id || !post) return;
										triggerHaptic();
										void toggleBookmark(user.id, post).then(
											(saved) => {
												if (saved) {
													toast.success(
														"Saved to bookmarks",
													);
												} else {
													toast.info(
														"Removed from saved",
													);
												}
											},
										);
									}}
									className={`h-11 w-11 items-center justify-center border-l-2 border-border ${
										isBookmarked
											? "bg-neo-yellow"
											: "active:bg-secondary"
									}`}>
									<Bookmark
										size={15}
										color="#000000"
										fill={isBookmarked ? "#000000" : "none"}
										strokeWidth={2.2}
									/>
								</Pressable>

								<Pressable
									accessibilityRole="button"
									accessibilityLabel="Share post"
									onPress={handleOpenShare}
									className="h-11 w-11 items-center justify-center border-l-2 border-border active:bg-secondary">
									<Share2
										size={15}
										color="#000000"
										strokeWidth={2.2}
									/>
								</Pressable>
							</View>
						</View>

						{/* Responses Stream Header */}
						<View className="flex-row items-center justify-between border-y-2 border-border bg-card px-4 py-2.5">
							<Text className="font-ndot-caps text-xs tracking-wider text-foreground uppercase">
								RESPONSES ({comments.length})
							</Text>
							<View className="flex-row overflow-hidden border-2 border-border bg-surface">
								{(["top", "new", "old"] as CommentSort[]).map(
									(sortKey, idx) => {
										const active = commentSort === sortKey;
										return (
											<Pressable
												key={sortKey}
												accessibilityRole="tab"
												accessibilityState={{
													selected: active,
												}}
												onPress={() => {
													triggerHaptic();
													setCommentSort(sortKey);
												}}
												className={`px-2.5 py-1 ${
													idx < 2
														? "border-r-2 border-border"
														: ""
												} ${
													active
														? "bg-primary"
														: "bg-surface active:bg-secondary"
												}`}>
												<Text
													className={`font-bold text-3xs tracking-widest uppercase ${
														active
															? "text-primary-foreground"
															: "text-foreground"
													}`}>
													{sortKey}
												</Text>
											</Pressable>
										);
									},
								)}
							</View>
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
									Be the first user to respond to this post.
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
										const isTargetComment =
											targetCommentId === comment.id;
										const isHighlighted =
											highlightedCommentId === comment.id;

										return (
											<View
												key={comment.id}
												ref={
													isTargetComment
														? targetCommentRef
														: undefined
												}
												onLayout={
													isTargetComment
														? () => {
																if (
																	hasScrolledToTargetRef.current ===
																	comment.id
																) {
																	return;
																}
																hasScrolledToTargetRef.current =
																	comment.id;
																requestAnimationFrame(
																	() => {
																		try {
																			const targetNode =
																				targetCommentRef.current;
																			const scrollNode =
																				scrollViewRef.current;
																			if (
																				targetNode &&
																				scrollNode
																			) {
																				targetNode.measureLayout(
																					scrollNode as unknown as number,
																					(
																						_x,
																						y,
																					) => {
																						scrollViewRef.current?.scrollTo(
																							{
																								y: Math.max(
																									0,
																									y -
																										96,
																								),
																								animated: true,
																							},
																						);
																					},
																					() => {},
																				);
																			}
																		} catch {
																			// Ignore layout measurement errors on unsupported platforms
																		}
																	},
																);
															}
														: undefined
												}
												className={`${
													depth === 0
														? "px-4 py-3.5"
														: "pt-3 pl-3"
												} ${
													isHighlighted
														? "border-l-4 border-neo-green-dark bg-neo-green/20"
														: ""
												}`}>
												{/* Comment Header */}
												<View className="flex-row items-center justify-between gap-2">
													<View className="min-w-0 flex-1 flex-row items-center gap-2">
														{isDeleted ? (
															<Text className="italic font-semibold text-xs text-muted-foreground">
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
													<Text className="mt-1.5 italic font-mono text-xs text-muted-foreground select-text">
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
								? 10
								: Math.max(insets.bottom, 10),
						}}
						className="border-t-2 border-border bg-surface px-3 pt-2.5">
						{replyingTo && (
							<View className="mb-2 flex-row items-center justify-between border-2 border-border bg-card px-2.5 py-1.5">
								<View className="flex-row items-center gap-1.5">
									<CornerDownRight
										size={12}
										color="#000000"
									/>
									<Text className="font-bold text-2xs tracking-wider text-foreground uppercase">
										Replying to @{replyingTo.username}
									</Text>
								</View>
								<Pressable
									accessibilityRole="button"
									accessibilityLabel="Cancel reply"
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

						<MentionAutocomplete
							text={replyText}
							cursorIndex={replyCursor}
							onSelectText={(next) => {
								setReplyText(next);
								setReplyCursor(undefined);
							}}
							className="mb-2"
						/>

						<View className="flex-row items-end gap-2">
							<TextInput
								value={replyText}
								onChangeText={(next) => {
									setReplyCursor((prev) =>
										prev !== undefined
											? Math.max(
													0,
													prev +
														(next.length -
															replyText.length),
												)
											: undefined,
									);
									setReplyText(next);
								}}
								onSelectionChange={(e) => {
									const pos = e.nativeEvent.selection.end;
									setReplyCursor(
										pos < replyText.length
											? pos
											: undefined,
									);
								}}
								placeholder={
									user
										? "Write a response... (@ to mention)"
										: "Sign in to write a response..."
								}
								placeholderTextColor="rgba(0, 0, 0, 0.4)"
								multiline
								editable={Boolean(user)}
								style={{ minHeight: 40 }}
								className="max-h-24 flex-1 border-2 border-border bg-card px-3 py-2 font-sans text-xs text-foreground"
							/>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Send response"
								disabled={
									isSubmittingReply ||
									!replyText.trim() ||
									!user
								}
								onPress={handleSendReply}
								className={`size-10 items-center justify-center border-2 border-border shadow-neo-xs active:translate-x-px active:translate-y-px ${
									isSubmittingReply ||
									!replyText.trim() ||
									!user
										? "bg-secondary opacity-50"
										: "bg-neo-green"
								}`}>
								{isSubmittingReply ? (
									<ActivityIndicator
										size="small"
										color="#000000"
									/>
								) : (
									<Send
										size={15}
										color="#000000"
										strokeWidth={2.5}
									/>
								)}
							</Pressable>
						</View>
					</View>
				</View>
			) : error ? (
				<View
					style={{ flex: 1 }}
					className="flex-1 items-center justify-center p-6">
					<NetworkErrorCard
						message={error}
						onRetry={handleRetry}
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
									handleOpenShare();
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
								onPostUpdated={(updated) => {
									setPost(updated);
									replacePostInFeedCaches(updated);
								}}
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

			{post ? (
				<SharePostModal
					open={isShareOpen}
					onOpenChange={setIsShareOpen}
					post={post}
				/>
			) : null}
		</KeyboardAvoidingView>
	);
}
