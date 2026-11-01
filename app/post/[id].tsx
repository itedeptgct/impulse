import { useAuthStore } from "@auth/store";
import { Image as ExpoImage } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
	ArrowDown,
	ArrowLeft,
	ArrowUp,
	CheckCircle2,
	CornerDownRight,
	MessageSquare,
	Send,
	Shield,
	X,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NeoButton, NeoCard } from "@/components/ui";
import { GuildBadge } from "@/features/guilds/components/GuildBadge";
import {
	addPostComment,
	fetchPostById,
	fetchPostComments,
	votePost,
} from "@/features/posts/api";
import type { Comment, Post } from "@/features/posts/types";

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

export default function PostDetailScreen() {
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams<{ id: string | string[] }>();
	const id = Array.isArray(params.id) ? params.id[0] : params.id;

	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);

	const userId = user?.id;
	const userGuild = profile?.guild;

	const [post, setPost] = useState<Post | null>(null);
	const [comments, setComments] = useState<Comment[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isRestricted, setIsRestricted] = useState(false);
	const [replyText, setReplyText] = useState("");
	const [isSubmittingReply, setIsSubmittingReply] = useState(false);
	const [replyingTo, setReplyingTo] = useState<{
		id: string;
		username: string;
	} | null>(null);
	const [error, setError] = useState<string | null>(null);

	const handleGoBack = () => {
		if (router.canGoBack()) {
			router.back();
		} else {
			router.replace("/(tabs)");
		}
	};

	const loadPostData = useCallback(async () => {
		if (!id) return;
		setIsLoading(true);
		setError(null);
		try {
			const res = await fetchPostById(id, userId, userGuild);
			if (res.isRestricted) {
				setIsRestricted(true);
				setPost(null);
			} else if (res.post) {
				setPost(res.post);
				setIsRestricted(false);
				const comms = await fetchPostComments(id);
				setComments(comms);
			} else {
				setPost(null);
				setError("Post not found.");
			}
		} catch (err: unknown) {
			const e = err as Error;
			setError(e.message || "Failed to load post.");
		} finally {
			setIsLoading(false);
		}
	}, [id, userId, userGuild]);

	useEffect(() => {
		void loadPostData();
	}, [loadPostData]);

	const handleVote = async (targetVote: 1 | -1) => {
		if (!post || !user?.id) return;

		const currentVote = post.user_vote || 0;
		const nextVote = currentVote === targetVote ? 0 : targetVote;

		let newUp = post.upvotes_count;
		let newDown = post.downvotes_count;

		if (currentVote === 1) newUp = Math.max(0, newUp - 1);
		if (currentVote === -1) newDown = Math.max(0, newDown - 1);

		if (nextVote === 1) newUp += 1;
		if (nextVote === -1) newDown += 1;

		setPost({
			...post,
			upvotes_count: newUp,
			downvotes_count: newDown,
			user_vote: nextVote,
		});

		await votePost(post.id, user.id, targetVote);
	};

	const handleSendReply = async () => {
		if (!replyText.trim() || !post || !user?.id) return;
		setIsSubmittingReply(true);

		const author = {
			id: user.id,
			username:
				profile?.username || user.email?.split("@")[0] || "Student",
			display_name:
				profile?.display_name || profile?.username || "Student",
			avatar_url: profile?.avatar_url || null,
			email: profile?.email || user.email,
			guild: profile?.guild || null,
		};

		try {
			const created = await addPostComment(
				post.id,
				author,
				replyText.trim(),
				replyingTo?.id,
				replyingTo?.username,
			);
			setComments((prev) => [...prev, created]);
			setPost((prev) =>
				prev
					? { ...prev, comments_count: prev.comments_count + 1 }
					: null,
			);
			setReplyText("");
			setReplyingTo(null);
		} catch (err: unknown) {
			const e = err as Error;
			setError(e.message || "Failed to send comment.");
		} finally {
			setIsSubmittingReply(false);
		}
	};

	// Restricted State (Classified House Post)
	if (isRestricted) {
		return (
			<View
				style={{ flex: 1, backgroundColor: "#0a0a0c" }}
				className="flex-1 bg-background">
				<StatusBar style="light" />
				<View
					style={{
						flex: 1,
						paddingTop: Math.max(insets.top, 16),
						paddingBottom: Math.max(insets.bottom, 16),
					}}
					className="flex-1 items-center justify-center p-6">
					<View className="w-full max-w-md items-center rounded-sm border-2 border-amber-500/50 bg-card p-6 shadow-neo">
						<View className="size-14 items-center justify-center rounded-sm border-2 border-amber-400 bg-amber-400/20">
							<Shield
								size={28}
								color="#fbbf24"
								strokeWidth={2.5}
							/>
						</View>
						<Text className="mt-4 text-center font-display text-xl text-foreground uppercase">
							CLASSIFIED HOUSE TRANSMISSION
						</Text>
						<Text className="mt-2 text-center font-mono text-xs leading-relaxed text-muted-foreground">
							This transmission is exclusive to verified members
							of this house. Your current house affiliation does
							not grant clearance to view this record.
						</Text>
						<NeoButton
							variant="primary"
							size="md"
							className="mt-6 w-full"
							onPress={handleGoBack}>
							RETURN TO FEED
						</NeoButton>
					</View>
				</View>
			</View>
		);
	}

	const authorDisplayName =
		post?.author?.display_name || post?.author?.username || "Student";
	const authorInitials = (authorDisplayName || "ST")
		.slice(0, 2)
		.toUpperCase();
	const isUpvoted = post?.user_vote === 1;
	const isDownvoted = post?.user_vote === -1;
	const score = (post?.upvotes_count || 0) - (post?.downvotes_count || 0);

	const normalizedTags = Array.isArray(post?.tags)
		? post.tags
		: typeof post?.tags === "string"
			? (post.tags as string)
					.replace(/[{}]/g, "")
					.split(",")
					.map((t) => t.trim())
					.filter(Boolean)
			: [];

	return (
		<View
			style={{ flex: 1, backgroundColor: "#0a0a0c" }}
			className="flex-1 bg-background">
			<StatusBar style="light" />

			{/* Top Navigation Bar */}
			<View
				style={{ paddingTop: Math.max(insets.top, 16) + 4 }}
				className="flex-row items-center justify-between border-b-2 border-border bg-card px-4 pb-3 shadow-neo-sm">
				<Pressable
					onPress={handleGoBack}
					hitSlop={8}
					className="size-10 items-center justify-center rounded-sm border-2 border-border bg-secondary shadow-neo-sm active:translate-x-px active:translate-y-px">
					<ArrowLeft size={18} color="#ffffff" strokeWidth={2.5} />
				</Pressable>

				<Text className="font-display text-sm tracking-tight text-foreground uppercase">
					TRANSMISSION RECORD
				</Text>

				<View className="w-10 items-end">
					{post?.guild && (
						<GuildBadge guildId={post.guild} size="sm" />
					)}
				</View>
			</View>

			{isLoading ? (
				<View
					style={{ flex: 1 }}
					className="flex-1 items-center justify-center">
					<ActivityIndicator size="large" color="#91e6b1" />
				</View>
			) : post ? (
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : undefined}
					style={{ flex: 1 }}
					className="flex-1">
					<ScrollView
						style={{ flex: 1 }}
						className="flex-1"
						contentContainerStyle={{
							flexGrow: 1,
							paddingHorizontal: 16,
							paddingTop: 16,
							paddingBottom: 24,
						}}
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled">
						{/* Post Content NeoCard */}
						<NeoCard
							variant="default"
							className="mb-5 p-5 shadow-neo">
							{/* Author Header */}
							<View className="mb-4 flex-row items-center justify-between border-b-2 border-border pb-3">
								<Pressable
									onPress={() => {
										if (post.author?.username) {
											router.push(
												`/(tabs)/u/${post.author.username}`,
											);
										}
									}}
									className="flex-row items-center gap-3">
									<View className="size-11 items-center justify-center overflow-hidden rounded-sm border-2 border-border bg-secondary shadow-neo-sm">
										{post.author?.avatar_url &&
										post.author.avatar_url.startsWith(
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
											<Text className="font-bold font-mono text-sm text-foreground">
												{authorInitials}
											</Text>
										)}
									</View>
									<View>
										<View className="flex-row items-center gap-1.5">
											<Text className="font-display text-base text-foreground">
												{authorDisplayName}
											</Text>
											<CheckCircle2
												size={14}
												color="#91e6b1"
												strokeWidth={2.5}
											/>
										</View>
										<Text className="font-mono text-xs text-muted-foreground">
											@{post.author?.username} •{" "}
											{formatRelativeTime(
												post.created_at,
											)}
										</Text>
									</View>
								</Pressable>

								{post.visibility === "house" && (
									<View className="rounded-sm border border-amber-500/50 bg-amber-500/10 px-2 py-0.5">
										<Text className="font-mono text-[10px] text-amber-400 uppercase">
											HOUSE ONLY
										</Text>
									</View>
								)}
							</View>

							{/* Maximized Unclipped Post Title */}
							<Text className="font-display text-xl leading-tight text-foreground sm:text-2xl">
								{post.title}
							</Text>

							{/* Maximized Full Content Body */}
							<Text className="mt-3 font-sans text-sm leading-relaxed text-muted-foreground sm:text-base">
								{post.content}
							</Text>

							{/* Full Code Snippet */}
							{post.code_snippet && (
								<View className="my-4 overflow-hidden rounded-sm border-2 border-border bg-[#0d0e12]">
									<View className="flex-row items-center justify-between border-b-2 border-border bg-secondary px-3 py-1.5">
										<View className="flex-row items-center gap-1.5">
											<View className="size-2 rounded-none bg-destructive" />
											<View className="size-2 rounded-none bg-amber-400" />
											<View className="size-2 rounded-none bg-primary" />
										</View>
										<View className="rounded-sm border border-border bg-card px-2 py-0.5">
											<Text className="font-mono text-[10px] tracking-wider text-primary uppercase">
												{post.code_language ||
													"terminal"}
											</Text>
										</View>
									</View>
									<ScrollView
										horizontal
										contentContainerStyle={{ padding: 12 }}>
										<Text className="font-mono text-xs leading-relaxed text-primary">
											{post.code_snippet}
										</Text>
									</ScrollView>
								</View>
							)}

							{/* Full Media Image */}
							{post.image_url && (
								<View className="my-4 overflow-hidden rounded-sm border-2 border-border bg-black shadow-neo-sm">
									<ExpoImage
										source={{ uri: post.image_url }}
										style={{
											width: "100%",
											height: 260,
										}}
										contentFit="cover"
									/>
								</View>
							)}

							{/* Topic Tags */}
							{normalizedTags.length > 0 && (
								<View className="mt-3 flex-row flex-wrap items-center gap-1.5">
									{normalizedTags.map((tag) => (
										<View
											key={tag}
											className="rounded-sm border border-border bg-secondary px-2.5 py-1">
											<Text className="font-mono text-xs text-primary">
												{tag.startsWith("#")
													? tag
													: `#${tag}`}
											</Text>
										</View>
									))}
								</View>
							)}

							{/* Action Bar: Reddit-style Vote Pill & Reply stats */}
							<View className="mt-5 flex-row items-center justify-between border-t-2 border-border pt-4">
								<View className="flex-row items-center rounded-sm border-2 border-border bg-secondary p-0.5">
									<Pressable
										accessibilityLabel="Upvote"
										onPress={() => handleVote(1)}
										className={`size-9 items-center justify-center rounded-sm ${
											isUpvoted
												? "bg-primary"
												: "active:bg-card"
										}`}>
										<ArrowUp
											size={18}
											color={
												isUpvoted
													? "#0a0a0c"
													: "#9aa1b2"
											}
											strokeWidth={isUpvoted ? 3 : 2.2}
										/>
									</Pressable>
									<View className="min-w-8 items-center justify-center px-2">
										<Text
											className={`font-mono text-sm tabular-nums ${
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
										onPress={() => handleVote(-1)}
										className={`size-9 items-center justify-center rounded-sm ${
											isDownvoted
												? "bg-sky-400"
												: "active:bg-card"
										}`}>
										<ArrowDown
											size={18}
											color={
												isDownvoted
													? "#0a0a0c"
													: "#9aa1b2"
											}
											strokeWidth={isDownvoted ? 3 : 2.2}
										/>
									</Pressable>
								</View>

								<View className="flex-row items-center gap-2 rounded-sm border-2 border-border bg-secondary px-3 py-1.5 shadow-neo-sm">
									<MessageSquare
										size={15}
										color="#9aa1b2"
										strokeWidth={2.2}
									/>
									<Text className="font-display text-xs text-foreground tabular-nums">
										{post.comments_count}
									</Text>
									<Text className="font-display text-xs text-muted-foreground uppercase">
										RESPONSES
									</Text>
								</View>
							</View>
						</NeoCard>

						{/* Threaded Comments Section */}
						<View className="gap-3">
							<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
								TRANSMISSION LOGS ({comments.length})
							</Text>

							{comments.length === 0 ? (
								<View className="items-center justify-center rounded-sm border-2 border-border bg-card p-6">
									<Text className="font-mono text-xs text-muted-foreground">
										No responses recorded yet. Be the first
										to reply!
									</Text>
								</View>
							) : (
								comments.map((comment) => {
									const isReply = Boolean(comment.parent_id);
									const cInitials = (
										comment.author?.display_name ||
										comment.author?.username ||
										"ST"
									)
										.slice(0, 2)
										.toUpperCase();

									return (
										<View
											key={comment.id}
											className={`rounded-sm border-2 border-border bg-card p-3 shadow-neo-sm ${
												isReply
													? "ml-6 border-l-4 border-l-primary"
													: ""
											}`}>
											<View className="flex-row items-center justify-between">
												<View className="flex-row items-center gap-2">
													<View className="size-6 items-center justify-center overflow-hidden rounded-xs bg-secondary">
														{comment.author?.avatar_url?.startsWith(
															"http",
														) ? (
															<ExpoImage
																source={{
																	uri: comment
																		.author
																		.avatar_url,
																}}
																style={{
																	width: "100%",
																	height: "100%",
																}}
																contentFit="cover"
															/>
														) : (
															<Text className="font-mono text-[10px] text-foreground">
																{cInitials}
															</Text>
														)}
													</View>
													<Text className="font-display text-xs text-foreground">
														{comment.author
															?.display_name ||
															comment.author
																?.username}
													</Text>
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

											{comment.reply_to_username && (
												<View className="mt-1 flex-row items-center gap-1">
													<CornerDownRight
														size={11}
														color="#91e6b1"
													/>
													<Text className="font-mono text-[11px] text-primary">
														@
														{
															comment.reply_to_username
														}
													</Text>
												</View>
											)}

											<Text className="mt-2 font-sans text-xs leading-relaxed text-foreground">
												{comment.content}
											</Text>

											{/* Reply Trigger */}
											<Pressable
												onPress={() =>
													setReplyingTo({
														id: comment.id,
														username:
															comment.author
																?.username ||
															"student",
													})
												}
												className="mt-2 self-start py-0.5 active:opacity-70">
												<Text className="font-mono text-[10px] text-muted-foreground uppercase">
													REPLY
												</Text>
											</Pressable>
										</View>
									);
								})
							)}
						</View>
					</ScrollView>

					{/* Pinned Bottom Comment Input Bar */}
					<View
						style={{ paddingBottom: Math.max(insets.bottom, 12) }}
						className="border-t-2 border-border bg-card p-3 shadow-neo">
						{replyingTo && (
							<View className="mb-2 flex-row items-center justify-between rounded-sm border border-primary/40 bg-primary/10 px-2.5 py-1">
								<View className="flex-row items-center gap-1.5">
									<CornerDownRight
										size={12}
										color="#91e6b1"
									/>
									<Text className="font-mono text-xs text-primary">
										Replying to @{replyingTo.username}
									</Text>
								</View>
								<Pressable
									onPress={() => setReplyingTo(null)}
									hitSlop={8}>
									<X size={13} color="#91e6b1" />
								</Pressable>
							</View>
						)}

						<View className="flex-row items-center gap-2">
							<TextInput
								value={replyText}
								onChangeText={setReplyText}
								placeholder={
									user
										? "Write a response..."
										: "Sign in to write a response..."
								}
								placeholderTextColor="#6c7284"
								multiline
								editable={Boolean(user)}
								style={{ minHeight: 40 }}
								className="max-h-24 flex-1 rounded-sm border-2 border-border bg-secondary px-3 py-2 font-mono text-xs text-foreground focus:border-primary"
							/>
							<NeoButton
								variant="primary"
								size="sm"
								loading={isSubmittingReply}
								disabled={
									isSubmittingReply ||
									!replyText.trim() ||
									!user
								}
								onPress={handleSendReply}>
								<Send size={15} color="#0a0a0c" />
							</NeoButton>
						</View>
					</View>
				</KeyboardAvoidingView>
			) : (
				<View
					style={{ flex: 1 }}
					className="flex-1 items-center justify-center p-6">
					<Text className="font-mono text-sm text-muted-foreground">
						{error || "Transmission not available."}
					</Text>
					<NeoButton
						variant="secondary"
						size="sm"
						className="mt-4"
						onPress={handleGoBack}>
						RETURN TO FEED
					</NeoButton>
				</View>
			)}
		</View>
	);
}
