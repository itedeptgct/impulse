import { useAuthStore } from "@auth/store";
import { formatEventDateTime, formatRelativeTime } from "@lib/date";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import {
	ArrowDown,
	ArrowUp,
	Calendar,
	MapPin,
	MessageSquare,
	MoreHorizontal,
	Radio,
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
import {
	deletePost,
	normalizePostMedia,
	normalizePostTags,
} from "@/features/posts/api";
import { PostMediaCarousel } from "@/features/posts/components/PostMediaCarousel";
import { PostMediaLightboxModal } from "@/features/posts/components/PostMediaLightboxModal";
import type { Post } from "@/features/posts/types";
import { formatHashtag } from "@/features/posts/utils/search-filter";
import { sharePost } from "@/features/posts/utils/share";
import {
	FEED_POST_MAX_LINES,
	isLongPostContent,
} from "@/features/posts/utils/truncation";
import { toast } from "@/lib/toast";

export interface DispatchCardProps {
	post: Post;
	onVote?: (post: Post, vote: 1 | -1) => void;
	onOpenComments?: (post: Post) => void;
	onPress?: (post: Post) => void;
	onPostUpdated?: (post: Post) => void;
	onPostDeleted?: (postId: string) => void;
}

const HOUSE_DISPATCH_META: Record<
	string,
	{
		name: string;
		badge: string;
		bg: string;
		textClass: string;
		badgeBg: string;
		badgeText: string;
	}
> = {
	octagram: {
		name: "OCTAGRAM",
		badge: "0x",
		bg: "bg-primary",
		textClass: "text-primary-foreground",
		badgeBg: "bg-primary",
		badgeText: "text-primary-foreground",
	},
	chameleon: {
		name: "CHAMELEON",
		badge: "RGB",
		bg: "bg-neo-green",
		textClass: "text-foreground",
		badgeBg: "bg-neo-green",
		badgeText: "text-foreground",
	},
	blue_jays: {
		name: "BLUE JAYS",
		badge: "PRESS",
		bg: "bg-neo-cyan",
		textClass: "text-foreground",
		badgeBg: "bg-neo-cyan",
		badgeText: "text-foreground",
	},
};

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

function DispatchCardComponent({
	post,
	onVote,
	onOpenComments,
	onPress,
	onPostDeleted,
}: DispatchCardProps) {
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);

	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
	const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
	const [measuredOverflowPostId, setMeasuredOverflowPostId] = useState<
		string | null
	>(null);

	const tags = normalizePostTags(post.tags);
	const mediaUrls = normalizePostMedia(post.image_url || post);
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
	const guildMeta = guildId ? HOUSE_DISPATCH_META[guildId] : undefined;

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
					{/* Official Broadcast Masthead */}
					{post.guild ? (
						<View
							className={`flex-row items-center justify-between border-b-2 border-border px-3.5 py-2.5 ${
								guildMeta?.bg ?? "bg-primary"
							}`}>
							<View className="min-w-0 flex-1 flex-row items-center gap-2 pr-2">
								<Radio
									size={14}
									color={
										guildId === "octagram"
											? "#FAF9F5"
											: "#000000"
									}
									strokeWidth={2.5}
								/>
								<Text
									numberOfLines={1}
									className={`font-ndot-caps text-sm tracking-wider uppercase ${
										guildMeta?.textClass ??
										"text-primary-foreground"
									}`}>
									{guildMeta?.name ?? "HOUSE"} DISPATCH
								</Text>
							</View>
							<View className="border border-border bg-card px-2 py-0.5">
								<Text className="font-bold text-3xs tracking-widest text-foreground uppercase">
									{guildMeta?.badge ?? "OFFICIAL"}
								</Text>
							</View>
						</View>
					) : (
						<View className="flex-row items-center justify-between border-b-2 border-border bg-primary px-3.5 py-2.5">
							<View className="min-w-0 flex-1 flex-row items-center gap-2 pr-2">
								<Radio
									size={14}
									color="#FFE600"
									strokeWidth={2.5}
								/>
								<Text
									numberOfLines={1}
									className="font-ndot-caps text-sm tracking-wider text-neo-yellow uppercase">
									GLOBAL DISPATCH
								</Text>
							</View>
							<View className="border border-border bg-neo-yellow px-2 py-0.5">
								<Text className="font-bold text-3xs tracking-widest text-foreground uppercase">
									CAMPUS-WIDE
								</Text>
							</View>
						</View>
					)}

					{/* Author / Timestamp Strip */}
					<View className="flex-row items-center justify-between border-b-2 border-border bg-surface px-3.5 py-2">
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
							<View
								className={`size-7 shrink-0 items-center justify-center overflow-hidden border-2 border-border ${
									guildMeta?.bg ?? "bg-primary"
								}`}>
								{post.author?.avatar_url?.startsWith("http") ? (
									<ExpoImage
										source={{ uri: post.author.avatar_url }}
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
										className={`px-0.5 font-bold text-3xs ${guildMeta?.badgeText ?? "text-primary-foreground"}`}>
										{guildMeta?.badge ?? "0x"}
									</Text>
								)}
							</View>

							<View className="min-w-0 flex-1 flex-row items-center gap-1.5">
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
						</Pressable>

						<View className="shrink-0 flex-row items-center gap-1.5">
							<Text className="font-mono text-2xs tracking-wider text-muted-foreground uppercase tabular-nums">
								{relativeTime}
							</Text>

							{canManage && (
								<Pressable
									accessibilityRole="button"
									accessibilityLabel="Dispatch options"
									hitSlop={8}
									onPress={() => {
										triggerHaptic();
										setIsMenuOpen(true);
									}}
									className="size-7 items-center justify-center active:bg-secondary">
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
										? "Show less dispatch content"
										: "See more dispatch content"
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

					{/* Docked Event Logistics Strip */}
					{(post.event_date || post.event_location) && (
						<View className="flex-row flex-wrap items-center gap-x-4 gap-y-2 border-t-2 border-border bg-neo-surface-active px-4 py-2.5">
							{post.event_date && (
								<View className="flex-row items-center gap-1.5">
									<Calendar
										size={13}
										color="#000000"
										strokeWidth={2.4}
									/>
									<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
										{formatEventDateTime(post.event_date)}
									</Text>
								</View>
							)}
							{post.event_location && (
								<View className="flex-row items-center gap-1.5">
									<MapPin
										size={13}
										color="#000000"
										strokeWidth={2.4}
									/>
									<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
										{post.event_location}
									</Text>
								</View>
							)}
						</View>
					)}

					{/* Docked Structural Action Rail */}
					<View className="flex-row items-stretch justify-between border-t-2 border-border bg-surface">
						<View className="flex-row items-stretch">
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Upvote"
								onPress={() => {
									triggerHaptic();
									onVote?.(post, 1);
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
									onVote?.(post, -1);
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
									if (onOpenComments) {
										onOpenComments(post);
									} else {
										handleCardPress();
									}
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
								accessibilityLabel="Share dispatch"
								onPress={async () => {
									triggerHaptic();
									await sharePost(post);
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

			<MobileSheet
				open={isMenuOpen}
				onOpenChange={setIsMenuOpen}
				title="DISPATCH ACTIONS // TERMINAL">
				<View className="gap-2.5 p-4">
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
							? "PURGE DISPATCH"
							: "DELETE DISPATCH"}
					</NeoButton>
				</View>
			</MobileSheet>

			<MobileAlertSheet
				open={isDeleteOpen}
				onOpenChange={setIsDeleteOpen}
				type="error"
				title={isAdminModAction ? "PURGE DISPATCH" : "DELETE DISPATCH"}
				description="Are you certain you want to permanently delete this official dispatch? This action cannot be undone."
				actions={[
					{
						label: isAdminModAction
							? "PURGE DISPATCH"
							: "DELETE DISPATCH",
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

function areEqual(
	prevProps: DispatchCardProps,
	nextProps: DispatchCardProps,
): boolean {
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
		p.image_urls !== n.image_urls ||
		p.upvotes_count !== n.upvotes_count ||
		p.downvotes_count !== n.downvotes_count ||
		p.comments_count !== n.comments_count ||
		p.user_vote !== n.user_vote ||
		p.is_edited !== n.is_edited ||
		p.event_date !== n.event_date ||
		p.event_location !== n.event_location ||
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

	return true;
}

export const DispatchCard = memo(DispatchCardComponent, areEqual);
