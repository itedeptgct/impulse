import { useAuthStore } from "@auth/store";
import { CheckCircle2, MessageSquare, Send, X } from "lucide-react-native";
import { Button, Dialog, Text } from "panelui-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";

import { GuildBadge } from "@/features/guilds/components/GuildBadge";

import { addPostComment, fetchPostComments } from "../api";
import type { Comment, Post } from "../types";

interface PostCommentsModalProps {
	post: Post | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCommentAdded: (postId: string, comment: Comment) => void;
}

export function PostCommentsModal({
	post,
	open,
	onOpenChange,
	onCommentAdded,
}: PostCommentsModalProps) {
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);

	const [comments, setComments] = useState<Comment[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [newCommentText, setNewCommentText] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (open && post?.id) {
			setIsLoading(true);
			void fetchPostComments(post.id)
				.then((list) => setComments(list))
				.finally(() => setIsLoading(false));
		}
	}, [open, post?.id]);

	const handleSendComment = async () => {
		if (!newCommentText.trim() || !post || !user?.id) return;
		setIsSubmitting(true);
		const author = {
			id: user.id,
			username: profile?.username || user.email?.split("@")[0] || "Student",
			email: profile?.email || user.email,
			guild: profile?.guild || null,
		};

		try {
			const created = await addPostComment(
				post.id,
				author,
				newCommentText.trim(),
			);
			setComments((prev) => [...prev, created]);
			onCommentAdded(post.id, created);
			setNewCommentText("");
		} finally {
			setIsSubmitting(false);
		}
	};

	const getRelativeTime = (isoString: string) => {
		const diffMs = Date.now() - new Date(isoString).getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));
		if (diffMins < 1) return "Just now";
		if (diffMins < 60) return `${diffMins}m ago`;
		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `${diffHours}h ago`;
		return `${Math.floor(diffHours / 24)}d ago`;
	};

	if (!post) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<Dialog.Content className="mx-4 max-h-[90vh] max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
				{/* Modal Header */}
				<View className="mb-4 flex-row items-center justify-between border-b border-border pb-3">
					<View className="flex-row items-center gap-2">
						<MessageSquare size={18} className="text-primary" />
						<Dialog.Title weight="bold" className="text-lg text-foreground">
							Discussion ({comments.length})
						</Dialog.Title>
					</View>
					<Pressable
						onPress={() => onOpenChange(false)}
						className="h-8 w-8 items-center justify-center rounded-full hover:bg-muted/50 active:scale-[0.96]">
						<X size={16} className="text-muted-foreground" />
					</Pressable>
				</View>
				{/* Post Summary Preview */}
				<View className="mb-4 rounded-xl border border-border/70 bg-muted/20 p-3">
					<Text
						weight="semibold"
						className="text-xs text-foreground"
						numberOfLines={1}>
						{post.title}
					</Text>
					<Text
						className="mt-1 text-[11px] text-muted-foreground"
						numberOfLines={2}>
						{post.content}
					</Text>
				</View>
				{/* Comments Scrollable List */}
				<ScrollView
					showsVerticalScrollIndicator={false}
					className="-mx-1 max-h-[48vh] px-1">
					{isLoading ? (
						<View className="items-center justify-center py-8">
							<Text className="text-xs text-muted-foreground">
								Loading discussion...
							</Text>
						</View>
					) : comments.length === 0 ? (
						<View className="items-center justify-center py-8">
							<Text className="text-xs text-muted-foreground">
								No comments yet. Start the discussion!
							</Text>
						</View>
					) : (
						<View className="gap-3 py-1">
							{comments.map((comment) => {
								const initials = comment.author?.username
									? comment.author.username.slice(0, 2).toUpperCase()
									: "ST";
								return (
									<View
										key={comment.id}
										className="rounded-2xl border border-border/60 bg-background/50 p-3.5">
										<View className="flex-row items-center justify-between">
											<View className="flex-row items-center gap-2">
												<View className="h-7 w-7 items-center justify-center rounded-lg border border-border bg-muted/60">
													<Text
														weight="bold"
														className="text-[10px] text-foreground">
														{initials}
													</Text>
												</View>
												<View className="flex-row items-center gap-1.5">
													<Text
														weight="bold"
														className="text-xs text-foreground">
														{comment.author?.username || "Student"}
													</Text>
													<CheckCircle2
														size={11}
														className="text-emerald-400"
													/>
												</View>
												{comment.author?.guild && (
													<GuildBadge
														guildId={comment.author.guild}
														size="sm"
													/>
												)}
											</View>
											<Text className="text-[10px] text-muted-foreground">
												{getRelativeTime(comment.created_at)}
											</Text>
										</View>
										<Text className="mt-2 text-xs leading-relaxed text-foreground">
											{comment.content}
										</Text>
									</View>
								);
							})}
						</View>
					)}
				</ScrollView>
				{/* Add Comment Input Bar */}
				<View className="mt-4 flex-row items-center gap-2 border-t border-border pt-3">
					<TextInput
						value={newCommentText}
						onChangeText={setNewCommentText}
						placeholder="Write a constructive response or answer..."
						placeholderTextColor="#64748b"
						className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
					/>
					<Button
						size="md"
						variant="primary"
						loading={isSubmitting}
						disabled={!newCommentText.trim() || isSubmitting}
						className="transition-transform active:scale-[0.96]"
						onPress={handleSendComment}>
						<Send size={14} className="text-primary-foreground" />
					</Button>
				</View>
			</Dialog.Content>
		</Dialog>
	);
}
