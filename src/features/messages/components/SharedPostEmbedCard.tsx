import { router } from "expo-router";
import { ArrowUpRight, Lock } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import type { Post } from "@/features/posts/types";

interface SharedPostEmbedCardProps {
	post?: Post | null;
	sharedPostId: string;
}

export function SharedPostEmbedCard({
	post,
	sharedPostId,
}: SharedPostEmbedCardProps) {
	const handleOpenPost = () => {
		router.push(`/post/${sharedPostId}` as never);
	};

	if (!post) {
		return (
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Open shared transmission"
				onPress={handleOpenPost}
				className="mt-1.5 border-2 border-border bg-card p-3 shadow-neo-xs active:translate-x-px active:translate-y-px">
				<View className="flex-row items-center gap-1.5">
					<Lock size={12} color="#000000" strokeWidth={2.5} />
					<Text className="font-mono text-2xs text-muted-foreground uppercase">
						[ SHARED TRANSMISSION ]
					</Text>
				</View>
				<Text className="mt-1 font-mono text-xs text-foreground">
					Tap to open post or verify clearance.
				</Text>
			</Pressable>
		);
	}

	const authorHandle = post.author?.username
		? `@${post.author.username}`
		: "User";
	const tagLabel =
		post.post_type === "dispatch" ? "// SHARED DISPATCH" : "// SHARED POST";

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`Open shared post: ${post.title}`}
			onPress={handleOpenPost}
			className="mt-1.5 border-2 border-border bg-card p-3 shadow-neo-xs active:translate-x-px active:translate-y-px">
			<View className="flex-row items-center justify-between gap-2">
				<Text className="font-mono text-2xs text-destructive uppercase">
					{tagLabel}
					{post.guild ? ` · ${post.guild.toUpperCase()}` : ""}
				</Text>
				<ArrowUpRight size={13} color="#000000" strokeWidth={2.5} />
			</View>
			<Text
				numberOfLines={2}
				className="mt-1 font-display text-sm tracking-tight text-foreground uppercase">
				{post.title}
			</Text>
			{post.content ? (
				<Text
					numberOfLines={2}
					className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
					{post.content}
				</Text>
			) : null}
			<View className="mt-2 flex-row items-center justify-between border-t border-border/20 pt-1.5">
				<Text className="font-mono text-2xs text-muted-foreground">
					BY {authorHandle.toUpperCase()}
				</Text>
				<Text className="font-mono text-2xs text-destructive uppercase">
					TAP TO OPEN →
				</Text>
			</View>
		</Pressable>
	);
}
