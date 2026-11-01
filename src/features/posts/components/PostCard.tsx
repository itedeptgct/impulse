import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import {
	ArrowDown,
	ArrowUp,
	CheckCircle2,
	MessageSquare,
} from "lucide-react-native";
import {
	Image,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";

import { NeoCard } from "@/components/ui";
import { GuildBadge } from "@/features/guilds/components/GuildBadge";

import type { Post } from "../types";

interface PostCardProps {
	post: Post;
	onVote: (post: Post, vote: 1 | -1) => void;
	onOpenComments: (post: Post) => void;
	onPress?: (post: Post) => void;
}

function formatRelativeTime(isoString: string): string {
	const created = new Date(isoString).getTime();
	const now = Date.now();
	const diffMs = Math.max(0, now - created);
	const diffMins = Math.floor(diffMs / (1000 * 60));
	if (diffMins < 1) return "Just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	const diffHours = Math.floor(diffMins / 60);
	if (diffHours < 24) return `${diffHours}h ago`;
	const diffDays = Math.floor(diffHours / 24);
	return `${diffDays}d ago`;
}

export function PostCard({
	post,
	onVote,
	onOpenComments,
	onPress,
}: PostCardProps) {
	const score = post.upvotes_count - post.downvotes_count;
	const isUpvoted = post.user_vote === 1;
	const isDownvoted = post.user_vote === -1;
	const formattedTime = formatRelativeTime(post.created_at);

	const authorDisplayName =
		post.author?.display_name || post.author?.username || "Impulse Student";
	const authorInitials = authorDisplayName.slice(0, 2).toUpperCase();

	const handleCardPress = () => {
		if (onPress) {
			onPress(post);
		} else {
			router.push(`/post/${post.id}` as any);
		}
	};

	return (
		<NeoCard variant="default" className="mb-4">
			{/* Top Bar: Author, Guild Badge, & Timestamp */}
			<View className="flex-row items-center justify-between pb-3">
				<Pressable
					onPress={() => {
						if (post.author?.username) {
							router.push(`/(tabs)/u/${post.author.username}`);
						}
					}}
					className="flex-row items-center gap-2.5 active:opacity-75">
					<View className="size-10 items-center justify-center rounded-sm border-2 border-border bg-secondary">
						<Text className="font-mono text-xs text-foreground">
							{authorInitials}
						</Text>
					</View>
					<View>
						<View className="flex-row items-center gap-1.5">
							<Text className="font-display text-sm text-foreground">
								{authorDisplayName}
							</Text>
							<CheckCircle2
								size={13}
								color="#91e6b1"
								strokeWidth={2.5}
							/>
						</View>
						<Text className="font-mono text-xs text-muted-foreground">
							{formattedTime}
						</Text>
					</View>
				</Pressable>

				{/* Guild & Visibility Badges */}
				<View className="flex-row items-center gap-1.5">
					{post.visibility === "house" && (
						<View className="rounded-sm border border-amber-500/50 bg-amber-500/10 px-1.5 py-0.5">
							<Text className="font-bold font-mono text-[9px] text-amber-400 uppercase">
								HOUSE ONLY
							</Text>
						</View>
					)}
					{post.guild && (
						<GuildBadge guildId={post.guild} size="sm" />
					)}
				</View>
			</View>

			{/* Interactive Body Pressable (Reddit-style Maximized Post trigger) */}
			<Pressable onPress={handleCardPress} className="active:opacity-85">
				{/* Post Title */}
				<Text className="font-display text-base text-foreground sm:text-lg">
					{post.title}
				</Text>

				{/* Post Content */}
				<Text className="mt-2 font-sans text-xs leading-relaxed text-muted-foreground sm:text-sm">
					{post.content}
				</Text>

				{/* Code Snippet if present */}
				{post.code_snippet && (
					<View className="my-3 overflow-hidden rounded-sm border-2 border-border bg-[#0d0e12]">
						<View className="flex-row items-center justify-between border-b-2 border-border bg-secondary px-3 py-1.5">
							<View className="flex-row items-center gap-1.5">
								<View className="size-2 rounded-none bg-destructive" />
								<View className="size-2 rounded-none bg-amber-400" />
								<View className="size-2 rounded-none bg-primary" />
							</View>
							<View className="rounded-sm border border-border bg-card px-1.5 py-0.5">
								<Text className="font-mono text-[10px] tracking-wider text-primary uppercase">
									{post.code_language || "terminal"}
								</Text>
							</View>
						</View>
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							className="p-3">
							<Text className="font-mono text-xs leading-relaxed text-primary">
								{post.code_snippet}
							</Text>
						</ScrollView>
					</View>
				)}

				{/* Image Attachment if present */}
				{post.image_url && (
					<View className="my-3 overflow-hidden rounded-sm border-2 border-border bg-black">
						<Image
							source={{ uri: post.image_url }}
							className="h-56 w-full"
							resizeMode="cover"
						/>
					</View>
				)}

				{/* Tags list */}
				{post.tags && post.tags.length > 0 && (
					<View className="mt-2 flex-row flex-wrap items-center gap-1.5">
						{post.tags.map((tag) => (
							<View
								key={tag}
								className="rounded-sm border border-border bg-secondary px-2 py-0.5">
								<Text className="font-mono text-[10px] text-muted-foreground">
									{tag}
								</Text>
							</View>
						))}
					</View>
				)}
			</Pressable>

			{/* Bottom Action Controls: Reddit Upvote/Downvote Pill + Comments + Share */}
			<View className="mt-4 flex-row items-center justify-between border-t-2 border-border pt-3">
				{/* Reddit-style Brutalist Vote Pill */}
				<View className="flex-row items-center rounded-sm border-2 border-border bg-secondary p-0.5">
					<Pressable
						accessibilityLabel="Upvote"
						onPress={() => {
							if (Platform.OS !== "web") {
								Haptics.impactAsync(
									Haptics.ImpactFeedbackStyle.Light,
								).catch(() => {});
							}
							onVote(post, 1);
						}}
						className={`size-8 items-center justify-center rounded-sm active:translate-x-px active:translate-y-px ${
							isUpvoted ? "bg-primary" : "active:bg-card"
						}`}>
						<ArrowUp
							size={16}
							color={isUpvoted ? "#0a0a0c" : "#9aa1b2"}
							strokeWidth={isUpvoted ? 3 : 2.2}
						/>
					</Pressable>
					<View className="min-w-7 items-center justify-center px-2">
						<Text
							className={`font-mono text-xs tabular-nums ${
								isUpvoted
									? "text-primary"
									: isDownvoted
										? "text-sky-400"
										: "text-foreground"
							}`}>
							{score}
						</Text>
					</View>
					<Pressable
						accessibilityLabel="Downvote"
						onPress={() => {
							if (Platform.OS !== "web") {
								Haptics.impactAsync(
									Haptics.ImpactFeedbackStyle.Light,
								).catch(() => {});
							}
							onVote(post, -1);
						}}
						className={`size-8 items-center justify-center rounded-sm active:translate-x-px active:translate-y-px ${
							isDownvoted ? "bg-sky-400" : "active:bg-card"
						}`}>
						<ArrowDown
							size={16}
							color={isDownvoted ? "#0a0a0c" : "#9aa1b2"}
							strokeWidth={isDownvoted ? 3 : 2.2}
						/>
					</Pressable>
				</View>

				{/* Right Actions: Comment */}
				<View className="flex-row items-center gap-2">
					{/* Comment Trigger */}
					<Pressable
						accessibilityLabel="Comments"
						onPress={() => {
							if (Platform.OS !== "web") {
								Haptics.impactAsync(
									Haptics.ImpactFeedbackStyle.Light,
								).catch(() => {});
							}
							onOpenComments(post);
						}}
						className="flex-row items-center gap-1.5 rounded-sm border-2 border-border bg-secondary px-3 py-1.5 shadow-neo-sm active:translate-x-px active:translate-y-px active:shadow-none">
						<MessageSquare
							size={14}
							color="#9aa1b2"
							strokeWidth={2.2}
						/>
						<Text className="font-mono text-xs text-foreground tabular-nums">
							{post.comments_count}
						</Text>
						<Text className="hidden font-mono text-xs text-muted-foreground sm:inline">
							REPLIES
						</Text>
					</Pressable>
				</View>
			</View>
		</NeoCard>
	);
}
