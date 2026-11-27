import { useAuthStore } from "@auth/store";
import { formatRelativeTime } from "@lib/date";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import {
	ArrowDown,
	ArrowUp,
	Bookmark,
	Flag,
	Lock,
	MessageSquare,
	MoreHorizontal,
	PenSquare,
	Share2,
	Trash2,
} from "lucide-react-native";
import { memo, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import {
	LinkifiedText,
	LinkPreviewList,
	MobileAlertSheet,
	MobileSheet,
	NeoButton,
	shouldShowLinkPreview,
	TerminalCodeViewport,
} from "@/components/ui";
import { UserRoleBadge } from "@/features/auth/components/UserRoleBadge";
import { canManagePost } from "@/features/auth/permissions";
import { SharePostModal } from "@/features/messages/components/SharePostModal";
import { ReportModal } from "@/features/moderation/components/ReportModal";
import { ActiveDot } from "@/features/presence";
import { toast } from "@/lib/toast";

import { deletePost, normalizePostMedia, normalizePostTags } from "../api";
import { useBookmarksStore } from "../bookmarks";
import type { Post } from "../types";
import { formatHashtag } from "../utils/search-filter";
import { FEED_POST_MAX_LINES, isLongPostContent } from "../utils/truncation";
import { PostComposerModal } from "./PostComposerModal";
import { PostMediaCarousel } from "./PostMediaCarousel";
import { PostMediaLightboxModal } from "./PostMediaLightboxModal";

interface PostCardProps {
	post: Post;
	onVote: (post: Post, vote: 1 | -1) => void;
	onOpenComments: (post: Post) => void;
	onPress?: (post: Post) => void;
	onPostUpdated?: (post: Post) => void;
	onPostDeleted?: (postId: string) => void;
}

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

function PostCardComponent({
	post,
	onVote,
	onOpenComments,
	onPress,
	onPostUpdated,
	onPostDeleted,
}: PostCardProps) {
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);
	const isBookmarked = useBookmarksStore((s) =>
		Boolean(s.bookmarkedIds[post.id]),
	);
	const toggleBookmark = useBookmarksStore((s) => s.toggleBookmark);

	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [isReportOpen, setIsReportOpen] = useState(false);
	const [isShareOpen, setIsShareOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
	const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
	const [measuredOverflowPostId, setMeasuredOverflowPostId] = useState<
		string | null
	>(null);

	const tags = normalizePostTags(post.tags);
	const mediaUrls = normalizePostMedia(post);
	const showLinkPreview = shouldShowLinkPreview(
		post.content,
		mediaUrls.length > 0,
	);

	const isExpanded = expandedPostId === post.id;
	const isTruncatable =
		measuredOverflowPostId === post.id ||
		isLongPostContent(post.content, {
			hideStandaloneUrls: showLinkPreview,
			compactInlineLinks: true,
		});

	const score = post.upvotes_count - post.downvotes_count;
	const isUpvoted = post.user_vote === 1;
	const isDownvoted = post.user_vote === -1;
	const relativeTime = formatRelativeTime(post.created_at);
	const canManage = canManagePost(
		post,
		user?.id,
		profile?.role,
		profile?.guild,
	);
	const isAdminModAction =
		(profile?.role === "admin" ||
			profile?.role === "mod" ||
			profile?.role === "house_mod") &&
		user?.id !== post.author_id;

	const authorUsername = (post.author?.username || "anon").toUpperCase();
	const guildId = post.guild || post.author?.guild;
	const guildMeta = guildId ? GUILD_META[guildId] : undefined;

	const handleCardPress = () => {
		triggerHaptic();
		if (onPress) onPress(post);
		else router.push(`/post/${post.id}` as any);
	};

	const handleConfirmDelete = async () => {
		setIsDeleting(true);
		try {
			await deletePost(post.id);
			setIsDeleteOpen(false);
			onPostDeleted?.(post.id);
			toast.success("Post deleted");
		} catch (err: unknown) {
			const e = err as Error;
			toast.error(e?.message || "Failed to delete post.");
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<View className="mb-6">
			<View className="bg-card shadow-neo">
				<View className="overflow-hidden border-2 border-border bg-card">
					{/* Author Header Strip */}
					<View className="flex-row items-center justify-between border-b-2 border-border bg-surface px-3.5 py-2.5">
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={`View profile of @${authorUsername}`}
							onPress={() => {
								if (post.author?.username) {
									triggerHaptic();
									router.push(
										`/u/${post.author.username}` as any,
									);
								}
							}}
							className="min-w-0 flex-1 flex-row items-center gap-2.5 pr-2 active:opacity-75">
							<View className="relative shrink-0">
								<View
									className={`size-8 items-center justify-center overflow-hidden border-2 border-border ${guildMeta?.bg ?? "bg-primary"}`}>
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
											{guildMeta?.badge ?? "0x"}
										</Text>
									)}
								</View>
								<ActiveDot
									userId={post.author_id}
									targetShowActiveStatus={
										post.author?.show_active_status
									}
									className="absolute -right-0.5 -bottom-0.5"
								/>
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
										isVerified={post.author?.is_verified}
										guild={post.author?.guild || post.guild}
										size="sm"
									/>
								</View>
								<Text className="mt-0.5 font-mono text-2xs tracking-wider text-muted-foreground uppercase tabular-nums">
									{relativeTime}
									{post.is_edited ? " · EDITED" : ""}
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

							{(canManage || Boolean(user)) && (
								<Pressable
									accessibilityRole="button"
									accessibilityLabel="Post options"
									hitSlop={8}
									onPress={() => {
										triggerHaptic();
										setIsMenuOpen(true);
									}}
									className="size-8 items-center justify-center active:bg-secondary">
									<MoreHorizontal
										size={16}
										color="#000000"
										strokeWidth={2.4}
									/>
								</Pressable>
							)}
						</View>
					</View>

					{/* Editorial Body */}
					<Pressable
						onPress={handleCardPress}
						className="bg-card px-4 py-4 active:opacity-95">
						<Text className="mb-2 font-display text-2xl leading-tight tracking-tight text-foreground uppercase">
							{post.title}
						</Text>

						<LinkifiedText
							hideStandaloneUrls={showLinkPreview}
							compactInlineLinks
							numberOfLines={
								isExpanded ? undefined : FEED_POST_MAX_LINES
							}
							ellipsizeMode="tail"
							onTextLayout={(e) => {
								if (
									!isExpanded &&
									e.nativeEvent.lines.length >
										FEED_POST_MAX_LINES &&
									measuredOverflowPostId !== post.id
								) {
									setMeasuredOverflowPostId(post.id);
								}
							}}
							className={`${isTruncatable ? "mb-2" : "mb-3"} font-sans text-sm leading-relaxed text-foreground`}>
							{post.content}
						</LinkifiedText>

						{isTruncatable && (
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={
									isExpanded
										? "Show less post content"
										: "See more post content"
								}
								hitSlop={6}
								onPress={(e) => {
									e.stopPropagation();
									triggerHaptic();
									setExpandedPostId(
										isExpanded ? null : post.id,
									);
								}}
								className="mb-3 self-start border border-border bg-surface px-2 py-0.5 active:bg-neo-green">
								<Text className="font-bold text-2xs tracking-wider text-foreground uppercase">
									{isExpanded ? "SHOW LESS" : "READ MORE"}
								</Text>
							</Pressable>
						)}

						<LinkPreviewList
							text={post.content}
							hasMedia={mediaUrls.length > 0}
							className="mb-3"
						/>

						{post.code_snippet && (
							<TerminalCodeViewport
								code={post.code_snippet}
								language={post.code_language}
								className="mb-3"
							/>
						)}

						{mediaUrls.length > 0 && (
							<PostMediaCarousel
								mediaUrls={mediaUrls}
								height={220}
								onMediaPress={(index) =>
									setLightboxIndex(index)
								}
								className="mb-3"
							/>
						)}

						{tags.length > 0 && (
							<View className="mt-1 flex-row flex-wrap items-center gap-1.5">
								{tags.map((tag) => {
									const formattedTag = formatHashtag(tag);
									if (!formattedTag) return null;
									return (
										<Pressable
											key={tag}
											accessibilityRole="button"
											accessibilityLabel={`Search tag ${formattedTag}`}
											onPress={(e) => {
												e.stopPropagation();
												triggerHaptic();
												router.push({
													pathname: "/(tabs)/search",
													params: { q: formattedTag },
												} as any);
											}}
											className="border border-border/60 bg-surface px-2 py-0.5 active:bg-neo-green">
											<Text className="font-mono text-2xs tracking-wider text-foreground uppercase">
												{formattedTag}
											</Text>
										</Pressable>
									);
								})}
							</View>
						)}
					</Pressable>

					{/* Docked Structural Action Rail */}
					<View className="flex-row items-stretch justify-between border-t-2 border-border bg-surface">
						<View className="flex-row items-stretch">
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Upvote"
								onPress={() => {
									triggerHaptic();
									onVote(post, 1);
								}}
								className={`h-11 w-11 items-center justify-center border-r-2 border-border ${
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

							<View className="min-w-11 items-center justify-center border-r-2 border-border bg-card px-2.5">
								<Text className="font-display text-sm text-foreground tabular-nums">
									{score}
								</Text>
							</View>

							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Downvote"
								onPress={() => {
									triggerHaptic();
									onVote(post, -1);
								}}
								className={`h-11 w-11 items-center justify-center border-r-2 border-border ${
									isDownvoted
										? "bg-primary"
										: "active:bg-secondary"
								}`}>
								<ArrowDown
									size={16}
									color={isDownvoted ? "#FAF9F5" : "#000000"}
									strokeWidth={isDownvoted ? 3 : 2.3}
								/>
							</Pressable>
						</View>

						<View className="flex-row items-stretch">
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Comments"
								onPress={() => {
									triggerHaptic();
									onOpenComments(post);
								}}
								className="h-11 flex-row items-center gap-1.5 border-l-2 border-border px-3.5 active:bg-secondary">
								<MessageSquare
									size={15}
									color="#000000"
									strokeWidth={2.2}
								/>
								<Text className="font-bold text-xs text-foreground tabular-nums">
									{post.comments_count}
								</Text>
							</Pressable>

							<Pressable
								accessibilityRole="button"
								accessibilityLabel={
									isBookmarked
										? "Remove bookmark"
										: "Save post"
								}
								onPress={() => {
									if (!user?.id) return;
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
								onPress={() => {
									triggerHaptic();
									setIsShareOpen(true);
								}}
								className="h-11 w-11 items-center justify-center border-l-2 border-border active:bg-secondary">
								<Share2
									size={15}
									color="#000000"
									strokeWidth={2.2}
								/>
							</Pressable>
						</View>
					</View>
				</View>
			</View>

			{mediaUrls.length > 0 && lightboxIndex !== null && (
				<PostMediaLightboxModal
					visible={lightboxIndex !== null}
					mediaUrls={mediaUrls}
					initialIndex={lightboxIndex}
					onClose={() => setLightboxIndex(null)}
				/>
			)}

			<SharePostModal
				open={isShareOpen}
				onOpenChange={setIsShareOpen}
				post={post}
			/>

			<MobileSheet
				open={isMenuOpen}
				onOpenChange={setIsMenuOpen}
				title="POST ACTIONS // TERMINAL">
				<View className="gap-2.5 p-4">
					{canManage && (
						<>
							{user?.id === post.author_id && (
								<NeoButton
									variant="outline"
									startContent={
										<PenSquare
											size={16}
											color="#000000"
											strokeWidth={2.2}
										/>
									}
									onPress={() => {
										setIsMenuOpen(false);
										setIsEditOpen(true);
									}}>
									EDIT POST
								</NeoButton>
							)}
							<NeoButton
								variant="destructive"
								startContent={
									<Trash2
										size={16}
										color="#FFFFFF"
										strokeWidth={2.2}
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
						</>
					)}

					{user && user.id !== post.author_id && (
						<NeoButton
							variant="outline"
							startContent={
								<Flag
									size={16}
									color="#ff2a00"
									strokeWidth={2.2}
								/>
							}
							onPress={() => {
								setIsMenuOpen(false);
								setIsReportOpen(true);
							}}>
							REPORT POST
						</NeoButton>
					)}
				</View>
			</MobileSheet>

			<ReportModal
				open={isReportOpen}
				onOpenChange={setIsReportOpen}
				targetType="post"
				targetId={post.id}
				guild={post.guild || post.author?.guild}
				targetTitle={post.title}
			/>

			{isEditOpen && (
				<PostComposerModal
					visible={isEditOpen}
					initialPost={post}
					onClose={() => setIsEditOpen(false)}
					onCreated={(updatedPost) => {
						setIsEditOpen(false);
						onPostUpdated?.(updatedPost);
					}}
				/>
			)}

			<MobileAlertSheet
				open={isDeleteOpen}
				onOpenChange={setIsDeleteOpen}
				type="error"
				title={isAdminModAction ? "PURGE POST" : "DELETE POST"}
				description="Are you certain you want to permanently delete this post? This action cannot be undone."
				actions={[
					{
						label: isAdminModAction ? "PURGE POST" : "DELETE POST",
						variant: "destructive",
						loading: isDeleting,
						onPress: handleConfirmDelete,
					},
					{
						label: "ABORT",
						variant: "outline",
						onPress: () => setIsDeleteOpen(false),
					},
				]}
			/>
		</View>
	);
}

// may god help the ones who will maintain this in the future
function areEqual(prevProps: PostCardProps, nextProps: PostCardProps): boolean {
	if (prevProps.onVote !== nextProps.onVote) return false;
	if (prevProps.onOpenComments !== nextProps.onOpenComments) return false;
	if (prevProps.onPress !== nextProps.onPress) return false;
	if (prevProps.onPostUpdated !== nextProps.onPostUpdated) return false;
	if (prevProps.onPostDeleted !== nextProps.onPostDeleted) return false;

	const p = prevProps.post;
	const n = nextProps.post;

	if (p === n) return true;

	if (
		p.id !== n.id ||
		p.author_id !== n.author_id ||
		p.title !== n.title ||
		p.content !== n.content ||
		p.visibility !== n.visibility ||
		p.guild !== n.guild ||
		p.code_snippet !== n.code_snippet ||
		p.code_language !== n.code_language ||
		p.image_url !== n.image_url ||
		p.upvotes_count !== n.upvotes_count ||
		p.downvotes_count !== n.downvotes_count ||
		p.comments_count !== n.comments_count ||
		p.user_vote !== n.user_vote ||
		p.is_edited !== n.is_edited ||
		p.created_at !== n.created_at ||
		p.updated_at !== n.updated_at
	) {
		return false;
	}

	if (
		p.author?.id !== n.author?.id ||
		p.author?.username !== n.author?.username ||
		p.author?.display_name !== n.author?.display_name ||
		p.author?.avatar_url !== n.author?.avatar_url ||
		p.author?.role !== n.author?.role ||
		p.author?.guild !== n.author?.guild ||
		p.author?.is_verified !== n.author?.is_verified
	) {
		return false;
	}

	const pTags = p.tags ?? [];
	const nTags = n.tags ?? [];
	if (pTags !== nTags) {
		if (pTags.length !== nTags.length) return false;
		for (let i = 0; i < pTags.length; i++) {
			if (pTags[i] !== nTags[i]) return false;
		}
	}

	const pUrls = p.image_urls ?? [];
	const nUrls = n.image_urls ?? [];
	if (pUrls !== nUrls) {
		if (pUrls.length !== nUrls.length) return false;
		for (let i = 0; i < pUrls.length; i++) {
			if (pUrls[i] !== nUrls[i]) return false;
		}
	}

	return true;
}

export const PostCard = memo(PostCardComponent, areEqual);
