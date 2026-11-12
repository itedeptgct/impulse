import { useAuthStore } from "@auth/store";
import { formatRelativeTime } from "@lib/date";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import {
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
	MobileAlertSheet,
	MobileSheet,
	NeoButton,
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
import { sharePost } from "@/features/posts/utils/share";

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
	{ name: string; badge: string; bg: string; textClass: string }
> = {
	octagram: {
		name: "OCTOGRAM",
		badge: "0x",
		bg: "bg-[#008033]",
		textClass: "text-[#00FF66]",
	},
	chameleon: {
		name: "CHAMELEON",
		badge: "★",
		bg: "bg-[#FF007A]",
		textClass: "text-primary-foreground",
	},
	blue_jays: {
		name: "BLUE JAYS",
		badge: "BJ",
		bg: "bg-[#4c4546]",
		textClass: "text-[#00E5FF]",
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
	const tags = normalizePostTags(post.tags);
	const mediaUrls = normalizePostMedia(post);

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
		} catch {
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<View className="mb-6">
			{/* Official Crest Header */}
			{post.guild ? (
				<View
					className={`flex-row items-center justify-between border-2 border-b-0 border-border px-3 py-2 ${
						guildMeta?.bg ?? "bg-primary"
					}`}>
					<View className="flex-row items-center gap-2">
						<View className="size-5 items-center justify-center border border-border bg-surface">
							<Text className="font-bold text-3xs text-foreground">
								{guildMeta?.badge ?? "0x"}
							</Text>
						</View>
						<Text
							className={`font-bold text-xs tracking-wider uppercase ${
								guildMeta?.textClass ??
								"text-primary-foreground"
							}`}>
							{guildMeta?.name ?? "HOUSE"} // OFFICIAL DISPATCH
						</Text>
					</View>
					<View className="border border-border bg-surface px-1.5 py-0.5">
						<Text className="font-bold text-3xs tracking-widest text-foreground uppercase">
							OFFICIAL
						</Text>
					</View>
				</View>
			) : (
				<View className="flex-row items-center justify-between border-2 border-b-0 border-border bg-primary px-3 py-2">
					<View className="flex-row items-center gap-2">
						<Radio size={14} color="#FFE600" strokeWidth={2.5} />
						<Text className="font-bold text-xs tracking-wider text-[#FFE600] uppercase">
							GLOBAL DISPATCH
						</Text>
					</View>
					<View className="border border-border bg-[#FFE600] px-1.5 py-0.5">
						<Text className="font-bold text-3xs tracking-widest text-foreground uppercase">
							CAMPUS-WIDE
						</Text>
					</View>
				</View>
			)}

			{/* Author / Metadata subheader */}
			<View className="flex-row items-center justify-between border-2 border-b-0 border-border bg-neo-surface-active px-3 py-2">
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={`View profile of @${authorUsername}`}
					onPress={() => {
						if (post.author?.username) {
							triggerHaptic();
							router.push(`/u/${post.author.username}` as any);
						}
					}}
					className="min-w-0 flex-1 flex-row items-center gap-2 pr-2 active:opacity-75">
					<View
						className={`size-6 shrink-0 items-center justify-center border border-border ${
							guildMeta?.bg ?? "bg-primary"
						}`}>
						{post.author?.avatar_url?.startsWith("http") ? (
							<ExpoImage
								source={{ uri: post.author.avatar_url }}
								style={{ width: "100%", height: "100%" }}
								contentFit="cover"
							/>
						) : (
							<Text className="font-bold text-2xs text-primary-foreground">
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
					<Text className="font-bold text-xs text-foreground/75 tabular-nums">
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
							className="ml-1 size-7 items-center justify-center border border-border bg-surface shadow-neo-xs active:translate-x-px active:translate-y-px">
							<MoreHorizontal
								size={14}
								color="#000000"
								strokeWidth={2.4}
							/>
						</Pressable>
					)}
				</View>
			</View>

			{/* Card Body */}
			<View className="border-2 border-border bg-surface p-4 shadow-neo">
				<Pressable
					onPress={handleCardPress}
					className="active:opacity-95">
					<Text className="mb-2.5 font-display text-2xl leading-tight tracking-tight text-foreground uppercase">
						{post.title}
					</Text>

					{/* Event Date / Location Badges */}
					{(post.event_date || post.event_location) && (
						<View className="mb-3.5 flex-row flex-wrap items-center gap-2 border-2 border-border bg-neo-surface-active p-2.5">
							{post.event_date && (
								<View className="flex-row items-center gap-1.5 border border-border bg-surface px-2 py-1 shadow-neo-xs">
									<Calendar
										size={13}
										color="#000000"
										strokeWidth={2.4}
									/>
									<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
										{post.event_date}
									</Text>
								</View>
							)}
							{post.event_location && (
								<View className="flex-row items-center gap-1.5 border border-border bg-surface px-2 py-1 shadow-neo-xs">
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

					<Text className="mb-3.5 font-mono text-sm leading-relaxed text-foreground">
						{post.content}
					</Text>

					{post.code_snippet && (
						<TerminalCodeViewport
							code={post.code_snippet}
							language={post.code_language}
							className="mb-3.5"
						/>
					)}

					{mediaUrls.length > 0 && (
						<PostMediaCarousel
							mediaUrls={mediaUrls}
							height={215}
							onMediaPress={(index) => setLightboxIndex(index)}
							className="mb-3.5"
						/>
					)}

					{tags.length > 0 && (
						<View className="mb-3 flex-row flex-wrap items-center gap-1.5">
							{tags.map((tag) => (
								<View
									key={tag}
									className="border border-border bg-secondary px-2 py-0.5">
									<Text className="font-bold text-2xs tracking-wider text-foreground uppercase">
										{tag}
									</Text>
								</View>
							))}
						</View>
					)}
				</Pressable>

				{/* Action Row */}
				<View className="mt-1 flex-row items-center justify-between border-t border-border/20 pt-3">
					<View className="flex-row items-center border-2 border-border bg-surface shadow-neo-xs">
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Upvote"
							onPress={() => {
								triggerHaptic();
								onVote?.(post, 1);
							}}
							className={`h-9 items-center justify-center border-r border-border px-3 ${
								isUpvoted
									? "bg-neo-green"
									: "active:bg-primary/10"
							}`}>
							<Text className="font-bold text-xs text-foreground">
								▲
							</Text>
						</Pressable>

						<View className="min-w-11 items-center justify-center px-2.5">
							<Text className="font-bold text-xs text-foreground tabular-nums">
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
							className={`h-9 items-center justify-center border-l border-border px-3 ${
								isDownvoted
									? "bg-primary"
									: "active:bg-primary/10"
							}`}>
							<Text
								className={`font-bold text-xs ${
									isDownvoted
										? "text-primary-foreground"
										: "text-foreground"
								}`}>
								▼
							</Text>
						</Pressable>
					</View>

					<View className="flex-row items-center gap-2">
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
							className="h-9 flex-row items-center gap-1.5 border-2 border-border bg-surface px-3 shadow-neo-xs active:translate-x-px active:translate-y-px">
							<MessageSquare
								size={14}
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
							className="size-9 items-center justify-center border-2 border-border bg-surface shadow-neo-xs active:translate-x-px active:translate-y-px">
							<Share2
								size={14}
								color="#000000"
								strokeWidth={2.2}
							/>
						</Pressable>
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
