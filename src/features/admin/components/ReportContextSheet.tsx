import { formatRelativeTime } from "@lib/date";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import {
	AlertTriangle,
	ArrowUpRight,
	CornerDownRight,
	FileText,
	History,
	MessageSquare,
	RefreshCw,
	ShieldAlert,
	User,
} from "lucide-react-native";
import { type ReactNode, useMemo } from "react";
import {
	ActivityIndicator,
	Platform,
	Pressable,
	Text,
	View,
} from "react-native";

import { MobileSheet, NeoBadge, NeoButton } from "@/components/ui";
import { UserRoleBadge } from "@/features/auth/components/UserRoleBadge";
import { GuildBadge } from "@/features/guilds/components/GuildBadge";
import { useReportContext } from "@/features/moderation/hooks/useModeration";
import type {
	GroupedModerationReport,
	ModerationActionRecord,
	ModerationActionType,
	ReportContextAuthor,
	ReportContextComment,
	ReportContextData,
	ReportContextPost,
} from "@/features/moderation/types";

export interface ReportContextSheetProps {
	group: GroupedModerationReport | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onTakeAction: (group: GroupedModerationReport) => void;
}

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

const ACTION_META: Record<
	ModerationActionType,
	{ label: string; containerClass: string; textClass: string }
> = {
	dismiss: {
		label: "DISMISSED",
		containerClass: "bg-secondary",
		textClass: "text-foreground",
	},
	warn: {
		label: "WARNED",
		containerClass: "bg-neo-yellow",
		textClass: "text-foreground",
	},
	restrict_24h: {
		label: "RESTRICTED 24H",
		containerClass: "bg-neo-magenta",
		textClass: "text-primary-foreground",
	},
	restrict_7d: {
		label: "RESTRICTED 7D",
		containerClass: "bg-destructive",
		textClass: "text-primary-foreground",
	},
	remove_content: {
		label: "PURGED",
		containerClass: "bg-destructive",
		textClass: "text-primary-foreground",
	},
};

function formatShortDate(isoString?: string | null): string | null {
	if (!isoString) return null;
	const parsed = new Date(isoString);
	if (Number.isNaN(parsed.getTime())) return null;
	return parsed.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function getInitials(username?: string | null, displayName?: string | null) {
	const raw = (username || displayName || "ST").trim();
	return raw.slice(0, 2).toUpperCase() || "ST";
}

function SectionHeading({
	icon,
	title,
	trailing,
}: {
	icon: ReactNode;
	title: string;
	trailing?: ReactNode;
}) {
	return (
		<View className="flex-row items-center justify-between gap-2 border-b-2 border-border bg-secondary px-3.5 py-2">
			<View className="flex-row items-center gap-1.5">
				{icon}
				<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
					{title}
				</Text>
			</View>
			{trailing}
		</View>
	);
}

function UnavailableContentBox({
	label,
	archivedSnippet,
}: {
	label: string;
	archivedSnippet?: string | null;
}) {
	const hasUsefulSnippet =
		Boolean(archivedSnippet?.trim()) &&
		archivedSnippet?.trim() !== "[content unavailable]";

	return (
		<View className="gap-2.5 border-2 border-dashed border-border bg-secondary p-3.5">
			<View className="flex-row items-center gap-2">
				<AlertTriangle size={16} color="#ff2a00" strokeWidth={2.5} />
				<Text className="flex-1 font-bold text-xs tracking-wider text-foreground uppercase">
					{label}
				</Text>
			</View>
			<Text className="font-mono text-xs text-muted-foreground">
				The original record could not be loaded because it was deleted
				or is no longer accessible.
			</Text>
			{hasUsefulSnippet ? (
				<View className="border border-border bg-card p-2.5">
					<Text className="font-bold text-3xs tracking-wider text-muted-foreground uppercase">
						ARCHIVED REPORT SNIPPET
					</Text>
					<Text className="mt-1 font-mono text-xs leading-relaxed text-foreground select-text">
						{archivedSnippet?.trim()}
					</Text>
				</View>
			) : null}
		</View>
	);
}

function AuthorSection({
	author,
	fallbackAuthor,
	isAuthorRestricted,
	recentActions,
	onNavigate,
}: {
	author: ReportContextAuthor | null;
	fallbackAuthor: GroupedModerationReport["target_author"];
	isAuthorRestricted: boolean;
	recentActions: ModerationActionRecord[];
	onNavigate: (href: string) => void;
}) {
	const username = author?.username ?? fallbackAuthor?.username ?? null;
	const displayName =
		author?.display_name ?? fallbackAuthor?.display_name ?? null;
	const avatarUrl = author?.avatar_url ?? fallbackAuthor?.avatar_url ?? null;
	const guild = author?.guild ?? fallbackAuthor?.guild ?? null;
	const role = author?.role ?? fallbackAuthor?.role ?? null;
	const isVerified = author?.is_verified ?? null;
	const restrictedUntil =
		author?.restricted_until ?? fallbackAuthor?.restricted_until ?? null;
	const restrictedUntilLabel = isAuthorRestricted
		? formatShortDate(restrictedUntil)
		: null;

	const hasAnyAuthor = Boolean(author || fallbackAuthor);
	const canOpenProfile = Boolean(username && username !== "unknown");
	const showSeparateVerifiedBadge = Boolean(
		isVerified && role && role !== "user",
	);

	return (
		<View className="bg-card shadow-neo">
			<View className="overflow-hidden border-2 border-border bg-card">
				<SectionHeading
					icon={<User size={13} color="#000000" strokeWidth={2.5} />}
					title="REPORTED AUTHOR"
					trailing={
						<View className="border border-border bg-surface px-1.5 py-0.5">
							<Text className="font-bold text-3xs tracking-wider text-foreground uppercase tabular-nums">
								{recentActions.length} PRIOR ACTION
								{recentActions.length === 1 ? "" : "S"}
							</Text>
						</View>
					}
				/>

				<View className="gap-3 p-3.5">
					{!hasAnyAuthor ? (
						<Text className="font-mono text-xs text-muted-foreground">
							Author profile is unavailable or has been removed.
						</Text>
					) : (
						<View className="flex-row items-start gap-3">
							<View className="size-12 shrink-0 items-center justify-center overflow-hidden border-2 border-border bg-secondary">
								{avatarUrl && avatarUrl.startsWith("http") ? (
									<ExpoImage
										source={{ uri: avatarUrl }}
										style={{
											width: "100%",
											height: "100%",
										}}
										contentFit="cover"
									/>
								) : (
									<Text className="font-bold text-sm text-foreground">
										{getInitials(username, displayName)}
									</Text>
								)}
							</View>

							<View className="min-w-0 flex-1 gap-1.5">
								<View className="flex-row flex-wrap items-center justify-between gap-2">
									<View className="min-w-0 flex-1">
										<Text
											numberOfLines={1}
											className="font-bold text-sm text-foreground">
											@{username || "unknown"}
										</Text>
										{displayName &&
										displayName !== username ? (
											<Text
												numberOfLines={1}
												className="font-mono text-xs text-muted-foreground">
												{displayName}
											</Text>
										) : null}
									</View>

									{canOpenProfile && username ? (
										<Pressable
											onPress={() => {
												triggerHaptic();
												onNavigate(
													`/u/${encodeURIComponent(username)}`,
												);
											}}
											accessibilityRole="button"
											accessibilityLabel={`View profile for @${username}`}
											className="shrink-0 flex-row items-center gap-1 border-2 border-border bg-surface px-2 py-1 shadow-neo-xs active:bg-secondary">
											<Text className="font-bold text-3xs tracking-wider text-foreground uppercase">
												PROFILE
											</Text>
											<ArrowUpRight
												size={11}
												color="#000000"
												strokeWidth={2.5}
											/>
										</Pressable>
									) : null}
								</View>

								<View className="flex-row flex-wrap items-center gap-1.5">
									{guild ? (
										<GuildBadge guildId={guild} size="sm" />
									) : null}
									<UserRoleBadge
										role={role}
										isVerified={isVerified}
										guild={guild}
										size="sm"
									/>
									{showSeparateVerifiedBadge ? (
										<NeoBadge variant="outline" size="sm">
											VERIFIED
										</NeoBadge>
									) : null}
									{isAuthorRestricted ? (
										<View className="border border-border bg-destructive px-1.5 py-0.5">
											<Text className="font-bold text-3xs tracking-wider text-primary-foreground uppercase">
												RESTRICTED
											</Text>
										</View>
									) : null}
								</View>

								{typeof author?.karma === "number" ? (
									<Text className="font-mono text-2xs text-muted-foreground uppercase tabular-nums">
										{author.karma} KARMA
									</Text>
								) : null}
							</View>
						</View>
					)}

					{isAuthorRestricted ? (
						<View className="flex-row items-center gap-2 border-2 border-destructive bg-destructive/10 px-2.5 py-2">
							<AlertTriangle
								size={14}
								color="#ff2a00"
								strokeWidth={2.5}
							/>
							<Text className="flex-1 font-bold text-2xs tracking-wider text-destructive uppercase">
								{restrictedUntilLabel
									? `CURRENTLY RESTRICTED UNTIL ${restrictedUntilLabel.toUpperCase()}`
									: "ACCOUNT CURRENTLY RESTRICTED"}
							</Text>
						</View>
					) : null}

					{/* Prior Moderation History */}
					<View className="border-t-2 border-border/20 pt-2.5">
						<View className="flex-row items-center gap-1.5">
							<History
								size={12}
								color="#4c4546"
								strokeWidth={2.4}
							/>
							<Text className="font-bold text-3xs tracking-wider text-muted-foreground uppercase">
								PRIOR MODERATION HISTORY
							</Text>
						</View>

						{recentActions.length === 0 ? (
							<Text className="mt-1.5 font-mono text-xs text-muted-foreground">
								No prior moderation actions recorded for this
								account.
							</Text>
						) : (
							<View className="mt-2 gap-1.5">
								{recentActions.slice(0, 5).map((record) => {
									const actionMeta =
										ACTION_META[record.action];
									const actorName =
										record.actor?.username || "staff";
									return (
										<View
											key={record.id}
											className="border border-border bg-surface p-2">
											<View className="flex-row items-center justify-between gap-2">
												<View className="flex-row flex-wrap items-center gap-1.5">
													<View
														className={`border border-border px-1.5 py-0.5 ${actionMeta.containerClass}`}>
														<Text
															className={`font-bold text-3xs tracking-wider uppercase ${actionMeta.textClass}`}>
															{actionMeta.label}
														</Text>
													</View>
													<Text className="font-mono text-2xs text-muted-foreground">
														by @{actorName}
													</Text>
												</View>
												<Text className="shrink-0 font-mono text-2xs text-muted-foreground uppercase tabular-nums">
													{formatRelativeTime(
														record.created_at,
													)}
												</Text>
											</View>
											{record.moderator_note?.trim() ? (
												<Text
													numberOfLines={2}
													className="mt-1 font-mono text-xs text-foreground">
													{record.moderator_note.trim()}
												</Text>
											) : record.public_explanation?.trim() ? (
												<Text
													numberOfLines={2}
													className="mt-1 font-mono text-xs text-foreground">
													{record.public_explanation.trim()}
												</Text>
											) : null}
										</View>
									);
								})}
							</View>
						)}
					</View>
				</View>
			</View>
		</View>
	);
}

function CommentThreadRow({
	comment,
	badgeLabel,
	highlighted = false,
}: {
	comment: ReportContextComment;
	badgeLabel?: string;
	highlighted?: boolean;
}) {
	const authorName = comment.author?.username || "student";
	const isDeleted = Boolean(comment.is_deleted);

	return (
		<View
			className={`border-2 p-2.5 ${
				highlighted
					? "border-destructive bg-neo-yellow/20 shadow-neo-xs"
					: "border-border bg-surface"
			}`}>
			<View className="flex-row items-center justify-between gap-2">
				<View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-1.5">
					<Text
						numberOfLines={1}
						className="font-bold text-xs text-foreground">
						@{authorName}
					</Text>
					{badgeLabel ? (
						<View
							className={`border border-border px-1.5 py-0.5 ${
								highlighted ? "bg-destructive" : "bg-secondary"
							}`}>
							<Text
								className={`font-bold text-3xs tracking-wider uppercase ${
									highlighted
										? "text-primary-foreground"
										: "text-foreground"
								}`}>
								{badgeLabel}
							</Text>
						</View>
					) : null}
				</View>
				<Text className="shrink-0 font-mono text-2xs text-muted-foreground uppercase tabular-nums">
					{formatRelativeTime(comment.created_at)}
				</Text>
			</View>

			<Text
				className={`mt-1.5 font-mono text-xs leading-relaxed select-text ${
					isDeleted ? "text-muted-foreground" : "text-foreground"
				}`}>
				{isDeleted
					? "Content was deleted or is unavailable"
					: comment.content}
			</Text>
		</View>
	);
}

function DiscussionSection({
	group,
	context,
	onNavigate,
}: {
	group: GroupedModerationReport;
	context: ReportContextData;
	onNavigate: (href: string) => void;
}) {
	const isCommentReport = group.target_type === "comment";
	const targetPost = context.targetPost;
	const targetComment = context.targetComment;

	const parentComment = useMemo(() => {
		if (!targetComment?.parent_id) return null;
		return (
			context.nearbyComments.find(
				(c) => c.id === targetComment.parent_id,
			) ?? null
		);
	}, [context.nearbyComments, targetComment?.parent_id]);

	const siblingComments = useMemo(() => {
		const excludedIds = new Set<string>();
		if (targetComment?.id) excludedIds.add(targetComment.id);
		if (parentComment?.id) excludedIds.add(parentComment.id);
		return context.nearbyComments
			.filter((c) => !excludedIds.has(c.id))
			.slice(0, 5);
	}, [context.nearbyComments, parentComment?.id, targetComment?.id]);

	if (isCommentReport) {
		const resolvedPostId = targetPost?.id ?? null;
		const resolvedCommentId = targetComment?.id ?? group.target_id;
		const isCommentMissingOrDeleted =
			!targetComment || Boolean(targetComment.is_deleted);

		return (
			<View className="bg-card shadow-neo">
				<View className="overflow-hidden border-2 border-border bg-card">
					<SectionHeading
						icon={
							<MessageSquare
								size={13}
								color="#000000"
								strokeWidth={2.5}
							/>
						}
						title="SURROUNDING DISCUSSION"
					/>

					<View className="gap-3 p-3.5">
						{/* Parent Post Excerpt */}
						{targetPost ? (
							<View className="border-2 border-border bg-secondary p-3">
								<View className="flex-row items-center justify-between gap-2">
									<Text className="font-bold text-3xs tracking-wider text-muted-foreground uppercase">
										PARENT POST · @
										{targetPost.author?.username ||
											"student"}
									</Text>
									<Text className="font-mono text-2xs text-muted-foreground uppercase tabular-nums">
										{formatRelativeTime(
											targetPost.created_at,
										)}
									</Text>
								</View>
								<Text className="mt-1 font-bold text-sm text-foreground">
									{targetPost.title || "Untitled Post"}
								</Text>
								{targetPost.content?.trim() ? (
									<Text
										numberOfLines={3}
										className="mt-1 font-mono text-xs leading-relaxed text-muted-foreground">
										{targetPost.content.trim()}
									</Text>
								) : null}
							</View>
						) : (
							<View className="border border-dashed border-border bg-secondary p-2.5">
								<Text className="font-mono text-xs text-muted-foreground">
									Parent post was deleted or is unavailable.
								</Text>
							</View>
						)}

						{/* Parent Comment (if reply) */}
						{targetComment?.parent_id ? (
							<View className="gap-1.5">
								<View className="flex-row items-center gap-1">
									<CornerDownRight
										size={12}
										color="#4c4546"
										strokeWidth={2.5}
									/>
									<Text className="font-bold text-3xs tracking-wider text-muted-foreground uppercase">
										REPLYING TO PARENT COMMENT
									</Text>
								</View>
								{parentComment ? (
									<CommentThreadRow
										comment={parentComment}
										badgeLabel="PARENT"
									/>
								) : (
									<View className="border border-dashed border-border bg-surface p-2.5">
										<Text className="font-mono text-xs text-muted-foreground">
											Parent comment was deleted or is
											outside the nearby window.
										</Text>
									</View>
								)}
							</View>
						) : null}

						{/* Highlighted Reported Comment */}
						{isCommentMissingOrDeleted ? (
							<UnavailableContentBox
								label="Content was deleted or is unavailable"
								archivedSnippet={group.target_snippet}
							/>
						) : targetComment ? (
							<CommentThreadRow
								comment={targetComment}
								badgeLabel="REPORTED COMMENT"
								highlighted
							/>
						) : null}

						{/* Nearby Sibling Comments */}
						{siblingComments.length > 0 ? (
							<View className="gap-2 border-t-2 border-border/20 pt-2.5">
								<Text className="font-bold text-3xs tracking-wider text-muted-foreground uppercase">
									NEARBY COMMENTS ({siblingComments.length})
								</Text>
								<View className="gap-1.5">
									{siblingComments.map((comment) => (
										<CommentThreadRow
											key={comment.id}
											comment={comment}
										/>
									))}
								</View>
							</View>
						) : null}

						{resolvedPostId && resolvedCommentId ? (
							<NeoButton
								variant="outline"
								size="sm"
								endContent={
									<ArrowUpRight
										size={14}
										color="#000000"
										strokeWidth={2.5}
									/>
								}
								onPress={() =>
									onNavigate(
										`/post/${resolvedPostId}?commentId=${encodeURIComponent(resolvedCommentId)}`,
									)
								}>
								OPEN FULL THREAD
							</NeoButton>
						) : null}
					</View>
				</View>
			</View>
		);
	}

	// Post Report View
	const topComments = context.nearbyComments.slice(0, 5);
	const postTags = targetPost?.tags?.filter(Boolean) ?? [];

	return (
		<View className="bg-card shadow-neo">
			<View className="overflow-hidden border-2 border-border bg-card">
				<SectionHeading
					icon={
						<FileText size={13} color="#000000" strokeWidth={2.5} />
					}
					title="REPORTED POST & DISCUSSION"
				/>

				<View className="gap-3 p-3.5">
					{!targetPost ? (
						<UnavailableContentBox
							label="Content was deleted or is unavailable"
							archivedSnippet={group.target_snippet}
						/>
					) : (
						<View className="gap-2.5 border-2 border-border bg-surface p-3">
							<View className="flex-row items-center justify-between gap-2">
								<View className="flex-row flex-wrap items-center gap-1.5">
									{targetPost.guild ? (
										<GuildBadge
											guildId={targetPost.guild}
											size="sm"
										/>
									) : null}
									<Text className="font-mono text-2xs text-muted-foreground">
										@{targetPost.author?.username || "user"}
									</Text>
								</View>
								<Text className="font-mono text-2xs text-muted-foreground uppercase tabular-nums">
									{formatRelativeTime(targetPost.created_at)}
								</Text>
							</View>

							<Text className="font-bold text-base text-foreground select-text">
								{targetPost.title || "Untitled Post"}
							</Text>

							{targetPost.content?.trim() ? (
								<Text className="font-mono text-xs leading-relaxed text-foreground select-text">
									{targetPost.content.trim()}
								</Text>
							) : null}

							{targetPost.code_snippet?.trim() ? (
								<View className="border border-border bg-secondary p-2.5">
									<Text className="font-bold text-3xs tracking-wider text-muted-foreground uppercase">
										CODE SNIPPET
										{targetPost.code_language
											? ` · ${targetPost.code_language.toUpperCase()}`
											: ""}
									</Text>
									<Text
										numberOfLines={6}
										className="mt-1 font-code text-xs text-foreground select-text">
										{targetPost.code_snippet.trim()}
									</Text>
								</View>
							) : null}

							{postTags.length > 0 ? (
								<View className="flex-row flex-wrap gap-1.5">
									{postTags.map((tag) => (
										<NeoBadge
											key={tag}
											variant="default"
											size="sm">
											#{tag}
										</NeoBadge>
									))}
								</View>
							) : null}

							<View className="flex-row flex-wrap items-center justify-between gap-2 border-t border-border/20 pt-2">
								<Text className="font-mono text-2xs text-muted-foreground uppercase tabular-nums">
									{targetPost.upvotes_count ?? 0} UP ·{" "}
									{targetPost.downvotes_count ?? 0} DOWN ·{" "}
									{targetPost.comments_count ?? 0} COMMENTS
								</Text>
								<Pressable
									onPress={() => {
										triggerHaptic();
										onNavigate(`/post/${targetPost.id}`);
									}}
									accessibilityRole="button"
									accessibilityLabel="Open full post"
									className="flex-row items-center gap-1 border border-border bg-card px-2 py-1 active:bg-secondary">
									<Text className="font-bold text-3xs tracking-wider text-foreground uppercase">
										OPEN POST
									</Text>
									<ArrowUpRight
										size={11}
										color="#000000"
										strokeWidth={2.5}
									/>
								</Pressable>
							</View>
						</View>
					)}

					<View className="gap-2 border-t-2 border-border/20 pt-2.5">
						<Text className="font-bold text-3xs tracking-wider text-muted-foreground uppercase">
							TOP COMMENTS PREVIEW ({topComments.length})
						</Text>
						{topComments.length === 0 ? (
							<Text className="font-mono text-xs text-muted-foreground">
								No comments on this post yet.
							</Text>
						) : (
							<View className="gap-1.5">
								{topComments.map((comment) => (
									<CommentThreadRow
										key={comment.id}
										comment={comment}
									/>
								))}
							</View>
						)}
					</View>
				</View>
			</View>
		</View>
	);
}

function RecentPostsSection({
	posts,
	reportedPostId,
	parentPostId,
	onNavigate,
}: {
	posts: ReportContextPost[];
	reportedPostId: string | null;
	parentPostId: string | null;
	onNavigate: (href: string) => void;
}) {
	const visiblePosts = posts.slice(0, 5);

	return (
		<View className="bg-card shadow-neo">
			<View className="overflow-hidden border-2 border-border bg-card">
				<SectionHeading
					icon={
						<FileText size={13} color="#000000" strokeWidth={2.5} />
					}
					title="AUTHOR'S RECENT POSTS"
					trailing={
						<View className="border border-border bg-surface px-1.5 py-0.5">
							<Text className="font-bold text-3xs tracking-wider text-foreground uppercase tabular-nums">
								{visiblePosts.length} SHOWN
							</Text>
						</View>
					}
				/>

				<View className="gap-2 p-3.5">
					{visiblePosts.length === 0 ? (
						<Text className="font-mono text-xs text-muted-foreground">
							No recent posts found for this author.
						</Text>
					) : (
						visiblePosts.map((post) => {
							const isReportedPost = Boolean(
								reportedPostId && post.id === reportedPostId,
							);
							const isParentPost = Boolean(
								!isReportedPost &&
								parentPostId &&
								post.id === parentPostId,
							);
							return (
								<Pressable
									key={post.id}
									onPress={() => {
										triggerHaptic();
										onNavigate(`/post/${post.id}`);
									}}
									accessibilityRole="button"
									accessibilityLabel={`Open post ${post.title || "untitled"}`}
									className={`border-2 p-2.5 active:opacity-80 ${
										isReportedPost
											? "border-destructive bg-neo-yellow/15"
											: "border-border bg-surface"
									}`}>
									<View className="flex-row items-center justify-between gap-2">
										<View className="min-w-0 flex-1 flex-row items-center gap-1.5">
											{post.guild ? (
												<GuildBadge
													guildId={post.guild}
													size="sm"
												/>
											) : null}
											{isReportedPost ? (
												<View className="border border-border bg-destructive px-1.5 py-0.5">
													<Text className="font-bold text-3xs tracking-wider text-primary-foreground uppercase">
														REPORTED
													</Text>
												</View>
											) : isParentPost ? (
												<View className="border border-border bg-neo-yellow px-1.5 py-0.5">
													<Text className="font-bold text-3xs tracking-wider text-foreground uppercase">
														THREAD POST
													</Text>
												</View>
											) : null}
										</View>
										<View className="shrink-0 flex-row items-center gap-1">
											<Text className="font-mono text-2xs text-muted-foreground uppercase tabular-nums">
												{formatRelativeTime(
													post.created_at,
												)}
											</Text>
											<ArrowUpRight
												size={11}
												color="#000000"
												strokeWidth={2.5}
											/>
										</View>
									</View>

									<Text
										numberOfLines={1}
										className="mt-1 font-bold text-xs text-foreground">
										{post.title || "Untitled Post"}
									</Text>

									{post.content?.trim() ? (
										<Text
											numberOfLines={2}
											className="mt-0.5 font-mono text-xs text-muted-foreground">
											{post.content.trim()}
										</Text>
									) : null}

									<Text className="mt-1.5 font-mono text-2xs text-muted-foreground uppercase tabular-nums">
										{post.upvotes_count ?? 0} UP ·{" "}
										{post.comments_count ?? 0} COMMENTS
									</Text>
								</Pressable>
							);
						})
					)}
				</View>
			</View>
		</View>
	);
}

/**
 * In-queue moderation context inspector displaying author history,
 * surrounding post/comment thread context, and recent author posts.
 */
export function ReportContextSheet({
	group,
	open,
	onOpenChange,
	onTakeAction,
}: ReportContextSheetProps) {
	const {
		data: context,
		isLoading,
		isError,
		error,
		refetch,
	} = useReportContext(
		group?.target_type,
		group?.target_id,
		open && Boolean(group),
	);

	const handleNavigate = (href: string) => {
		onOpenChange(false);
		router.push(href as any);
	};

	const subtitle = group
		? `${group.target_type.toUpperCase()} · ${group.count} REPORT${
				group.count === 1 ? "" : "S"
			} · ${group.status.toUpperCase()}`
		: undefined;

	return (
		<MobileSheet
			open={open}
			onOpenChange={onOpenChange}
			size="full"
			title="CONTEXT INSPECTOR"
			subtitle={subtitle}>
			<MobileSheet.Body contentContainerStyle={{ paddingBottom: 20 }}>
				{!group ? null : isLoading ? (
					<View className="items-center justify-center py-12">
						<ActivityIndicator size="large" color="#000000" />
						<Text className="mt-3 font-mono text-xs text-muted-foreground uppercase">
							Loading moderation context...
						</Text>
					</View>
				) : isError || !context ? (
					<View className="gap-3 border-2 border-border bg-card p-4 shadow-neo">
						<View className="flex-row items-center gap-2">
							<AlertTriangle
								size={18}
								color="#ff2a00"
								strokeWidth={2.5}
							/>
							<Text className="font-bold text-sm text-foreground uppercase">
								FAILED TO LOAD CONTEXT
							</Text>
						</View>
						<Text className="font-mono text-xs text-muted-foreground">
							{error instanceof Error && error.message
								? error.message
								: "Unable to load surrounding discussion and author history right now."}
						</Text>
						<NeoButton
							variant="outline"
							size="sm"
							startContent={
								<RefreshCw
									size={13}
									color="#000000"
									strokeWidth={2.5}
								/>
							}
							onPress={() => void refetch()}>
							RETRY
						</NeoButton>
					</View>
				) : (
					<View className="gap-4 pt-1">
						<AuthorSection
							author={context.author}
							fallbackAuthor={group.target_author}
							isAuthorRestricted={context.isAuthorRestricted}
							recentActions={context.authorRecentActions}
							onNavigate={handleNavigate}
						/>

						<DiscussionSection
							group={group}
							context={context}
							onNavigate={handleNavigate}
						/>

						<RecentPostsSection
							posts={context.authorRecentPosts}
							reportedPostId={
								group.target_type === "post"
									? group.target_id
									: null
							}
							parentPostId={
								group.target_type === "comment"
									? (context.targetPost?.id ?? null)
									: null
							}
							onNavigate={handleNavigate}
						/>
					</View>
				)}
			</MobileSheet.Body>

			{group && group.status === "open" ? (
				<MobileSheet.Footer className="pt-3 pb-2">
					<NeoButton
						variant="primary"
						startContent={
							<ShieldAlert
								size={16}
								color="#faf9f5"
								strokeWidth={2.5}
							/>
						}
						onPress={() => {
							onOpenChange(false);
							onTakeAction(group);
						}}>
						TAKE MODERATION ACTION
					</NeoButton>
				</MobileSheet.Footer>
			) : null}
		</MobileSheet>
	);
}
