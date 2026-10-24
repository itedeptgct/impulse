import { useAuthStore } from "@auth/store";
import { router } from "expo-router";
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
	const [replyingTo, setReplyingTo] = useState<{
		id: string;
		username: string;
	} | null>(null);

	useEffect(() => {
		if (open && post?.id) {
			setIsLoading(true);
			setReplyingTo(null);
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
			username:
				profile?.username || user.email?.split("@")[0] || "Student",
			email: profile?.email || user.email,
			guild: profile?.guild || null,
		};

		try {
			const created = await addPostComment(
				post.id,
				author,
				newCommentText.trim(),
				replyingTo?.id,
				replyingTo?.username,
			);
			setComments((prev) => [...prev, created]);
			onCommentAdded(post.id, created);
			setNewCommentText("");
			setReplyingTo(null);
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

	const handleAuthorPress = (authorUsername?: string) => {
		if (!authorUsername) return;
		onOpenChange(false);
		router.push(`/(tabs)/u/${authorUsername}`);
	};

	if (!post) return null;

	const rootComments = comments.filter((c) => !c.parent_id);
	const repliesByParentId = comments.reduce<Record<string, Comment[]>>(
		(acc, c) => {
			if (c.parent_id) {
				acc[c.parent_id] = acc[c.parent_id] || [];
				acc[c.parent_id].push(c);
			}
			return acc;
		},
		{},
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<Dialog.Content className="mx-4 max-h-[90vh] max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
				{/* Modal Header */}
				<View className="mb-4 flex-row items-center justify-between border-b border-border pb-3">
					<View className="flex-row items-center gap-2">
						<MessageSquare size={18} color="#10b981" />
						<Dialog.Title
							weight="bold"
							className="text-lg text-foreground">
							Discussion ({comments.length})
						</Dialog.Title>
					</View>
					<Pressable
						onPress={() => onOpenChange(false)}
						className="h-8 w-8 items-center justify-center rounded-full hover:bg-muted/50 active:scale-[0.96]">
						<X size={16} color="#a1a1aa" />
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
					) : rootComments.length === 0 ? (
						<View className="items-center justify-center py-8">
							<Text className="text-xs text-muted-foreground">
								No comments yet. Start the discussion!
							</Text>
						</View>
					) : (
						<View className="gap-3 py-1">
							{rootComments.map((comment) => {
								const initials = comment.author?.username
									? comment.author.username
											.slice(0, 2)
											.toUpperCase()
									: "ST";
								const replies =
									repliesByParentId[comment.id] || [];

								return (
									<View key={comment.id} className="gap-2">
										{/* Root Comment Item */}
										<View className="rounded-2xl border border-border/60 bg-background/50 p-3.5">
											<View className="flex-row items-center justify-between">
												<View className="flex-row items-center gap-2">
													<Pressable
														onPress={() =>
															handleAuthorPress(
																comment.author
																	?.username,
															)
														}
														className="h-7 w-7 items-center justify-center rounded-lg border border-border bg-muted/60 active:opacity-75">
														<Text
															weight="bold"
															className="text-[10px] text-foreground">
															{initials}
														</Text>
													</Pressable>
													<Pressable
														onPress={() =>
															handleAuthorPress(
																comment.author
																	?.username,
															)
														}
														className="flex-row items-center gap-1.5 active:opacity-75">
														<Text
															weight="bold"
															className="text-xs text-foreground hover:underline">
															{comment.author
																?.username ||
																"Student"}
														</Text>
														<CheckCircle2
															size={11}
															color="#10b981"
														/>
													</Pressable>
													{comment.author?.guild && (
														<GuildBadge
															guildId={
																comment.author
																	.guild
															}
															size="sm"
														/>
													)}
												</View>
												<Text className="text-[10px] text-muted-foreground">
													{getRelativeTime(
														comment.created_at,
													)}
												</Text>
											</View>
											<Text className="mt-2 text-xs leading-relaxed text-foreground">
												{comment.content}
											</Text>
											{/* Comment Actions */}
											<View className="mt-2 flex-row items-center gap-3 pt-1">
												<Pressable
													onPress={() =>
														setReplyingTo({
															id: comment.id,
															username:
																comment.author
																	?.username ||
																"Student",
														})
													}
													className="rounded-md px-1.5 py-0.5 active:bg-muted/40">
													<Text
														weight="semibold"
														className="text-[11px] text-primary">
														Reply
													</Text>
												</Pressable>
											</View>
										</View>

										{/* Threaded Replies List */}
										{replies.length > 0 && (
											<View className="mt-1 ml-6 space-y-2 border-l-2 border-primary/30 pl-3">
												{replies.map((reply) => {
													const replyInitials = reply
														.author?.username
														? reply.author.username
																.slice(0, 2)
																.toUpperCase()
														: "ST";
													return (
														<View
															key={reply.id}
															className="rounded-xl border border-border/50 bg-background/40 p-2.5">
															<View className="flex-row items-center justify-between">
																<View className="flex-row items-center gap-1.5">
																	<Pressable
																		onPress={() =>
																			handleAuthorPress(
																				reply
																					.author
																					?.username,
																			)
																		}
																		className="h-5 w-5 items-center justify-center rounded-md border border-border bg-muted/60 active:opacity-75">
																		<Text
																			weight="bold"
																			className="text-[9px] text-foreground">
																			{
																				replyInitials
																			}
																		</Text>
																	</Pressable>
																	<Pressable
																		onPress={() =>
																			handleAuthorPress(
																				reply
																					.author
																					?.username,
																			)
																		}
																		className="flex-row items-center gap-1 active:opacity-75">
																		<Text
																			weight="bold"
																			className="text-[11px] text-foreground hover:underline">
																			{reply
																				.author
																				?.username ||
																				"Student"}
																		</Text>
																		<CheckCircle2
																			size={
																				10
																			}
																			color="#10b981"
																		/>
																	</Pressable>
																	{reply
																		.author
																		?.guild && (
																		<GuildBadge
																			guildId={
																				reply
																					.author
																					.guild
																			}
																			size="sm"
																		/>
																	)}
																</View>
																<Text className="text-[9px] text-muted-foreground">
																	{getRelativeTime(
																		reply.created_at,
																	)}
																</Text>
															</View>
															<Text className="mt-1 text-xs leading-relaxed text-foreground">
																{reply.reply_to_username && (
																	<Text
																		weight="medium"
																		className="mr-1 text-xs text-primary">
																		@
																		{
																			reply.reply_to_username
																		}{" "}
																	</Text>
																)}
																{reply.content}
															</Text>
															{/* Reply Action on reply */}
															<View className="mt-1.5 flex-row items-center gap-2">
																<Pressable
																	onPress={() =>
																		setReplyingTo(
																			{
																				id: comment.id,
																				username:
																					reply
																						.author
																						?.username ||
																					"Student",
																			},
																		)
																	}
																	className="rounded px-1 py-0.5 active:bg-muted/40">
																	<Text
																		weight="semibold"
																		className="text-[10px] text-primary">
																		Reply
																	</Text>
																</Pressable>
															</View>
														</View>
													);
												})}
											</View>
										)}
									</View>
								);
							})}
						</View>
					)}
				</ScrollView>

				{/* Active Reply Banner */}
				{replyingTo && (
					<View className="mt-2 flex-row items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5">
						<Text weight="medium" className="text-xs text-primary">
							Replying to @{replyingTo.username}
						</Text>
						<Pressable
							onPress={() => setReplyingTo(null)}
							className="rounded-full p-1 active:bg-primary/20">
							<X size={13} color="#10b981" />
						</Pressable>
					</View>
				)}

				{/* Add Comment Input Bar */}
				<View className="mt-3 flex-row items-center gap-2 border-t border-border pt-3">
					<TextInput
						value={newCommentText}
						onChangeText={setNewCommentText}
						placeholder={
							replyingTo
								? `Reply to @${replyingTo.username}...`
								: "Write a constructive response or answer..."
						}
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
						<Send size={14} color="#ffffff" />
					</Button>
				</View>
			</Dialog.Content>
		</Dialog>
	);
}
