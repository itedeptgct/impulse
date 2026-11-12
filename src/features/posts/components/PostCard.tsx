import { useAuthStore } from "@auth/store";
import { formatRelativeTime } from "@lib/date";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import {
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
	MobileAlertSheet,
	MobileSheet,
	NeoButton,
	TerminalCodeViewport,
} from "@/components/ui";

import {
	canManagePost,
	deletePost,
	normalizePostMedia,
	normalizePostTags,
} from "../api";
import type { Post } from "../types";
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

	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [isShareComingSoonOpen, setIsShareComingSoonOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

	const score = post.upvotes_count - post.downvotes_count;
	const isUpvoted = post.user_vote === 1;
	const isDownvoted = post.user_vote === -1;
	const relativeTime = formatRelativeTime(post.created_at);
	const canManage = canManagePost(post, user?.id, profile?.role);
	const isAdminModAction =
		profile?.role === "admin" && user?.id !== post.author_id;
	const tags = normalizePostTags(post.tags);
	const mediaUrls = normalizePostMedia(post);

	const authorUsername = (post.author?.username || "anon").toUpperCase();
	const guildId = post.guild || post.author?.guild;
	const guildMeta = guildId ? GUILD_META[guildId] : undefined;
	const guildTag = guildMeta?.tag ?? (guildId ? "BLUE JAYS" : "IMPULSE");

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
			<View className="flex-row items-center justify-between border-2 border-b-0 border-border bg-neo-surface-active px-3 py-2">
				<Pressable
					onPress={() => {
						if (post.author?.username) {
							triggerHaptic();
							router.push(`/u/${post.author.username}` as any);
						}
					}}
					className="min-w-0 flex-1 flex-row items-center gap-2 pr-2 active:opacity-75">
					<View
						className={`size-6 shrink-0 items-center justify-center border border-border ${guildMeta?.bg ?? "bg-primary"}`}>
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

					<Text
						numberOfLines={1}
						className="shrink font-bold text-xs tracking-wider text-foreground uppercase">
						@{authorUsername} // {guildTag}
					</Text>
				</Pressable>

				<View className="shrink-0 flex-row items-center gap-1.5">
					{post.visibility === "house" && (
						<View className="flex-row items-center gap-1 border border-border bg-primary px-1.5 py-0.5">
							<Lock size={9} color="#00FF66" strokeWidth={2.5} />
							<Text className="font-bold text-3xs tracking-wider text-neo-green uppercase">
								HOUSE
							</Text>
						</View>
					)}

					<Text className="ml-0.5 font-bold text-xs text-foreground/75 tabular-nums">
						{relativeTime}
					</Text>

					{canManage && (
						<Pressable
							accessibilityLabel="Post options"
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

			<View className="border-2 border-border bg-surface p-4 shadow-neo">
				<Pressable
					onPress={handleCardPress}
					className="active:opacity-95">
					<Text className="mb-2.5 font-display text-2xl leading-tight tracking-tight text-foreground uppercase">
						{post.title}
					</Text>

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

				<View className="mt-1 flex-row items-center justify-between border-t border-border/20 pt-3">
					<View className="flex-row items-center border-2 border-border bg-surface shadow-neo-xs">
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Upvote"
							onPress={() => {
								triggerHaptic();
								onVote(post, 1);
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
								onVote(post, -1);
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
								onOpenComments(post);
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
							accessibilityLabel="Share post"
							onPress={() => {
								triggerHaptic();
								setIsShareComingSoonOpen(true);
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

			<MobileAlertSheet
				open={isShareComingSoonOpen}
				onOpenChange={setIsShareComingSoonOpen}
				type="info"
				title="SHARING IS COMING SOON"
				description="I am not paid well to implement this feature. Check back soon."
				actions={[
					{
						label: "GOT IT",
						variant: "primary",
						onPress: () => setIsShareComingSoonOpen(false),
					},
				]}
			/>

			<MobileSheet
				open={isMenuOpen}
				onOpenChange={setIsMenuOpen}
				title="POST ACTIONS // TERMINAL">
				<View className="gap-2.5 p-4">
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
						EDIT TRANSMISSION
					</NeoButton>
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
							? "PURGE DISPATCH (ADMIN)"
							: "DELETE TRANSMISSION"}
					</NeoButton>
				</View>
			</MobileSheet>

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
				title={isAdminModAction ? "ADMIN PURGE" : "PURGE TRANSMISSION"}
				description="Are you certain you want to purge this transmission from the collegiate mesh ledger? This action cannot be reverted."
				actions={[
					{
						label: "PURGE DISPATCH",
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
		p.author?.guild !== n.author?.guild
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
