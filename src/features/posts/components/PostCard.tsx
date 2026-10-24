import {
	ArrowDown,
	ArrowUp,
	CheckCircle2,
	MessageSquare,
	Share2,
} from "lucide-react-native";
import { Text } from "panelui-native";
import { Image, Pressable, ScrollView, View } from "react-native";

import { GuildBadge } from "@/features/guilds/components/GuildBadge";

import type { Post } from "../types";

interface PostCardProps {
	post: Post;
	onVote: (post: Post, vote: 1 | -1) => void;
	onOpenComments: (post: Post) => void;
	onShare: (post: Post) => void;
}

export function PostCard({
	post,
	onVote,
	onOpenComments,
	onShare,
}: PostCardProps) {
	const score = post.upvotes_count - post.downvotes_count;
	const isUpvoted = post.user_vote === 1;
	const isDownvoted = post.user_vote === -1;

	// Calculate formatted relative time
	const getRelativeTime = (isoString: string) => {
		const diffMs = Date.now() - new Date(isoString).getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));
		if (diffMins < 1) return "Just now";
		if (diffMins < 60) return `${diffMins}m ago`;
		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `${diffHours}h ago`;
		const diffDays = Math.floor(diffHours / 24);
		return `${diffDays}d ago`;
	};

	const authorInitials = post.author?.username
		? post.author.username.slice(0, 2).toUpperCase()
		: "ST";

	return (
		<View className="mb-4 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
			{/* Top Bar: Author, Guild Badge, & Timestamp */}
			<View className="flex-row items-center justify-between pb-3">
				<View className="flex-row items-center gap-2.5">
					<View className="h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/70">
						<Text weight="bold" className="text-xs text-foreground">
							{authorInitials}
						</Text>
					</View>
					<View>
						<View className="flex-row items-center gap-1.5">
							<Text
								weight="bold"
								className="text-sm text-foreground">
								{post.author?.username || "Impulse Student"}
							</Text>
							<CheckCircle2 size={13} color="#10b981" />
						</View>
						<Text className="text-[11px] text-muted-foreground">
							{getRelativeTime(post.created_at)}
						</Text>
					</View>
				</View>
				{/* Guild Badge */}
				{post.guild && <GuildBadge guildId={post.guild} size="sm" />}
			</View>
			{/* Post Title */}
			<Text
				weight="bold"
				className="text-base tracking-tight text-foreground sm:text-lg">
				{post.title}
			</Text>
			{/* Post Content */}
			<Text className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
				{post.content}
			</Text>
			{/* Code Snippet if present */}
			{post.code_snippet && (
				<View className="my-3 overflow-hidden rounded-xl border border-border/80 bg-[#090d16]">
					<View className="flex-row items-center justify-between border-b border-border/60 bg-muted/30 px-3 py-1.5">
						<View className="flex-row items-center gap-1.5">
							<View className="h-2 w-2 rounded-full bg-red-500/80" />
							<View className="h-2 w-2 rounded-full bg-yellow-500/80" />
							<View className="h-2 w-2 rounded-full bg-green-500/80" />
							<Text className="ml-1 font-mono text-[10px] text-muted-foreground uppercase">
								{post.code_language || "code"}
							</Text>
						</View>
					</View>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						className="p-3">
						<Text className="font-mono text-xs leading-relaxed text-emerald-300">
							{post.code_snippet}
						</Text>
					</ScrollView>
				</View>
			)}
			{/* Image Attachment if present */}
			{post.image_url && (
				<View className="my-3 overflow-hidden rounded-xl border border-border/80 bg-black/40">
					<Image
						source={{ uri: post.image_url }}
						className="h-56 w-full object-cover"
						resizeMode="cover"
					/>
				</View>
			)}
			{/* Tags list */}
			{post.tags && post.tags.length > 0 && (
				<View className="mt-3 flex-row flex-wrap items-center gap-1.5">
					{post.tags.map((tag) => (
						<View
							key={tag}
							className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5">
							<Text className="text-[11px] text-muted-foreground">
								{tag}
							</Text>
						</View>
					))}
				</View>
			)}
			{/* Bottom Action Controls: Reddit Upvote/Downvote Pill + Comments + Share */}
			<View className="mt-4 flex-row items-center justify-between border-t border-border/70 pt-3">
				{/* Reddit-style Vote Pill */}
				<View className="flex-row items-center rounded-xl border border-border/80 bg-muted/40 p-1">
					<Pressable
						accessibilityLabel="Upvote"
						onPress={() => onVote(post, 1)}
						className={`h-9 w-9 items-center justify-center rounded-lg transition-all active:scale-[0.96] ${
							isUpvoted
								? "bg-emerald-500/20 text-emerald-400"
								: "hover:bg-muted/70"
						}`}>
						<ArrowUp
							size={16}
							color={isUpvoted ? "#34d399" : "#94a3b8"}
							strokeWidth={isUpvoted ? 2.5 : 2}
						/>
					</Pressable>
					<View className="min-w-7 items-center justify-center px-2">
						<Text
							weight="bold"
							className={`text-xs tabular-nums ${
								isUpvoted
									? "text-emerald-400"
									: isDownvoted
										? "text-sky-400"
										: "text-foreground"
							}`}>
							{score}
						</Text>
					</View>
					<Pressable
						accessibilityLabel="Downvote"
						onPress={() => onVote(post, -1)}
						className={`h-9 w-9 items-center justify-center rounded-lg transition-all active:scale-[0.96] ${
							isDownvoted
								? "bg-sky-500/20 text-sky-400"
								: "hover:bg-muted/70"
						}`}>
						<ArrowDown
							size={16}
							color={isDownvoted ? "#38bdf8" : "#94a3b8"}
							strokeWidth={isDownvoted ? 2.5 : 2}
						/>
					</Pressable>
				</View>
				{/* Right Actions: Comment & Share */}
				<View className="flex-row items-center gap-2">
					{/* Comment Trigger */}
					<Pressable
						accessibilityLabel="Comments"
						onPress={() => onOpenComments(post)}
						className="flex-row items-center gap-1.5 rounded-xl border border-border/70 bg-muted/30 px-3 py-2 transition-all hover:bg-muted/60 active:scale-[0.96]">
						<MessageSquare size={15} color="#a1a1aa" />
						<Text
							weight="medium"
							className="text-xs text-foreground tabular-nums">
							{post.comments_count}
						</Text>
						<Text className="hidden text-xs text-muted-foreground sm:inline">
							Comments
						</Text>
					</Pressable>
					{/* Share Trigger */}
					<Pressable
						accessibilityLabel="Share post"
						onPress={() => onShare(post)}
						className="flex-row items-center gap-1.5 rounded-xl border border-border/70 bg-muted/30 px-3 py-2 transition-all hover:bg-muted/60 active:scale-[0.96]">
						<Share2 size={15} color="#a1a1aa" />
						<Text
							weight="medium"
							className="text-xs text-foreground tabular-nums">
							{post.shares_count}
						</Text>
					</Pressable>
				</View>
			</View>
		</View>
	);
}
