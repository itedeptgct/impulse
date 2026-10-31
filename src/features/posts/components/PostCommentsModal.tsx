import { useAuthStore } from "@auth/store";
import { router } from "expo-router";
import { MessageSquare, Send, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NeoBadge, NeoButton, NeoCard, NeoInput } from "@/components/ui";
import { GuildBadge } from "@/features/guilds/components/GuildBadge";

import { addPostComment, fetchPostComments } from "../api";
import type { Comment, Post } from "../types";

export interface PostCommentsModalProps {
	post: Post | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCommentAdded: (postId: string, comment: Comment) => void;
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
	return `${Math.floor(diffHours / 24)}d ago`;
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
		let isMounted = true;
		if (open && post?.id) {
			void (async () => {
				setIsLoading(true);
				try {
					const list = await fetchPostComments(post.id);
					if (isMounted) {
						setReplyingTo(null);
						setComments(list);
					}
				} finally {
					if (isMounted) setIsLoading(false);
				}
			})();
		}
		return () => {
			isMounted = false;
		};
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
		<Modal
			visible={open}
			animationType="slide"
			presentationStyle={
				Platform.OS === "ios" ? "pageSheet" : "fullScreen"
			}
			statusBarTranslucent={true}
			onRequestClose={() => onOpenChange(false)}>
			<View
				style={{ backgroundColor: "#0a0a0c", flex: 1 }}
				className="flex-1 bg-background">
				<SafeAreaView
					style={{ backgroundColor: "#0a0a0c", flex: 1 }}
					className="flex-1 bg-background"
					edges={["top", "bottom"]}>
					{/* Header Section */}
					<View className="flex-row items-center justify-between border-b-2 border-border bg-card px-4 py-3 shadow-neo-sm">
						<View className="flex-row items-center gap-2.5">
							<MessageSquare
								size={18}
								color="#91e6b1"
								strokeWidth={2.5}
							/>
							<Text className="font-display text-base tracking-tight text-foreground uppercase">
								DISCUSSION
							</Text>
							<NeoBadge variant="primary" size="sm">
								{comments.length}
							</NeoBadge>
						</View>
						<Pressable
							accessibilityLabel="Close discussion"
							onPress={() => onOpenChange(false)}
							hitSlop={8}
							className="size-8 items-center justify-center rounded-sm border-2 border-border bg-secondary active:translate-x-px active:translate-y-px">
							<X size={15} color="#ffffff" strokeWidth={2.5} />
						</Pressable>
					</View>

					{/* Original Post Summary NeoCard */}
					<View className="px-4 pt-3 pb-1">
						<NeoCard variant="default" className="p-3">
							<Text
								className="font-display text-xs text-foreground"
								numberOfLines={1}>
								{post.title}
							</Text>
							<Text
								className="mt-1 font-mono text-[11px] text-muted-foreground"
								numberOfLines={2}>
								{post.content}
							</Text>
						</NeoCard>
					</View>

					{/* Comments Scrollable Stream */}
					<ScrollView
						showsVerticalScrollIndicator={false}
						className="flex-1 px-4"
						contentContainerStyle={{
							flexGrow: 1,
							paddingBottom: 16,
						}}
						keyboardShouldPersistTaps="handled">
						{isLoading ? (
							<View className="flex-1 items-center justify-center py-16">
								<Text className="font-mono text-xs text-muted-foreground">
									[LOADING DISCUSSIONS...]
								</Text>
							</View>
						) : comments.length === 0 ? (
							<View className="flex-1 items-center justify-center py-16 text-center">
								<MessageSquare
									size={28}
									color="#91e6b1"
									strokeWidth={2.5}
								/>
								<Text className="mt-3 font-display text-sm text-foreground uppercase">
									NO TRANSMISSION REPLIES YET
								</Text>
								<Text className="mt-1 font-mono text-xs text-muted-foreground">
									Be the first to provide technical insight or
									ask a follow-up!
								</Text>
							</View>
						) : (
							<View className="gap-3 py-2">
								{rootComments.map((comment) => {
									const replies =
										repliesByParentId[comment.id] || [];
									return (
										<View
											key={comment.id}
											className="rounded-sm border-2 border-border bg-card p-3 shadow-neo-sm">
											{/* Root Author Bar */}
											<View className="flex-row items-center justify-between pb-1.5">
												<View className="flex-row items-center gap-2">
													<Pressable
														onPress={() =>
															handleAuthorPress(
																comment.author
																	?.username,
															)
														}
														className="flex-row items-center gap-1.5 active:opacity-75">
														<View className="size-6 items-center justify-center rounded-sm border border-border bg-secondary">
															<Text className="font-mono text-[10px] text-primary uppercase">
																{
																	(comment
																		.author
																		?.username ||
																		"S")[0]
																}
															</Text>
														</View>
														<Text className="font-mono text-xs text-foreground">
															{comment.author
																?.username ||
																"Student"}
														</Text>
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
												<Text className="font-mono text-[10px] text-muted-foreground">
													{formatRelativeTime(
														comment.created_at,
													)}
												</Text>
											</View>

											{/* Content */}
											<Text className="font-sans text-xs leading-relaxed text-foreground">
												{comment.content}
											</Text>

											{/* Reply Action */}
											<View className="mt-2 flex-row items-center justify-between border-t border-border/60 pt-2">
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
													className="rounded-sm border border-border bg-secondary px-2 py-0.5 active:translate-x-px active:translate-y-px">
													<Text className="font-mono text-[10px] text-primary uppercase">
														REPLY
													</Text>
												</Pressable>
											</View>

											{/* Nested replies */}
											{replies.length > 0 && (
												<View className="mt-2.5 gap-2 border-l-2 border-primary pl-3">
													{replies.map((reply) => (
														<View
															key={reply.id}
															className="rounded-sm border border-border bg-secondary p-2.5">
															<View className="flex-row items-center justify-between pb-1">
																<View className="flex-row items-center gap-1.5">
																	<Pressable
																		onPress={() =>
																			handleAuthorPress(
																				reply
																					.author
																					?.username,
																			)
																		}
																		className="flex-row items-center gap-1 active:opacity-75">
																		<Text className="font-mono text-[11px] text-foreground">
																			{reply
																				.author
																				?.username ||
																				"Student"}
																		</Text>
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
																<Text className="font-mono text-[9px] text-muted-foreground">
																	{formatRelativeTime(
																		reply.created_at,
																	)}
																</Text>
															</View>
															{reply.reply_to_username && (
																<Text className="font-mono text-[10px] text-primary">
																	@
																	{
																		reply.reply_to_username
																	}
																</Text>
															)}
															<Text className="font-sans text-[11px] leading-relaxed text-foreground">
																{reply.content}
															</Text>
														</View>
													))}
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
						<View className="mx-4 mb-2 flex-row items-center justify-between rounded-sm border-2 border-primary bg-primary/10 px-3 py-1.5 shadow-neo-sm">
							<Text className="font-mono text-xs text-primary">
								REPLYING TO @{replyingTo.username}
							</Text>
							<Pressable
								onPress={() => setReplyingTo(null)}
								hitSlop={8}
								className="rounded p-1">
								<X
									size={13}
									color="#91e6b1"
									strokeWidth={2.5}
								/>
							</Pressable>
						</View>
					)}

					{/* Docked bottom reply input */}
					<KeyboardAvoidingView
						behavior={
							Platform.OS === "ios" ? "padding" : undefined
						}>
						<View className="border-t-2 border-border bg-card p-3 shadow-neo-top">
							<View className="flex-row items-center gap-2">
								<NeoInput
									value={newCommentText}
									onChangeText={setNewCommentText}
									placeholder={
										replyingTo
											? `Reply to @${replyingTo.username}...`
											: "Write a transmission reply..."
									}
									containerClassName="flex-1"
									editable={!isSubmitting}
								/>
								<NeoButton
									size="md"
									variant="primary"
									loading={isSubmitting}
									disabled={
										!newCommentText.trim() || isSubmitting
									}
									onPress={handleSendComment}
									startContent={
										!isSubmitting ? (
											<Send
												size={15}
												color="#0a0a0c"
												strokeWidth={2.5}
											/>
										) : undefined
									}>
									SEND
								</NeoButton>
							</View>
						</View>
					</KeyboardAvoidingView>
				</SafeAreaView>
			</View>
		</Modal>
	);
}
