import { supabase } from "@lib/supabase";

import type { GuildId } from "@/features/guilds/types";
import { deleteComment, deletePost } from "@/features/posts/api";

import type {
	ModerationActionRecord,
	ModerationActionType,
	ModerationQueueFilters,
	ModerationReport,
	ReportContextAuthor,
	ReportContextComment,
	ReportContextData,
	ReportContextPost,
	ReportInput,
	ReportReason,
	ReportReporter,
	ReportStatus,
	ReportTargetType,
	ResolveReportInput,
	StaffModerator,
} from "./types";
import {
	buildReportedUserOutcomeNotification,
	buildReporterOutcomeNotification,
} from "./utils/outcomes";
import { filterModerationReports, isUserRestricted } from "./utils/queue";

export {
	buildReportedUserOutcomeNotification,
	buildReporterOutcomeNotification,
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

interface CallerModerationScope {
	id: string;
	role: string | null;
	guild: GuildId | null;
}

async function getCallerModerationScope(): Promise<CallerModerationScope> {
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error("Authentication required.");
	}

	const { data: profile, error } = await supabase
		.from("profiles")
		.select("id, role, guild")
		.eq("id", user.id)
		.maybeSingle();

	if (error) throw error;

	const row = profile as {
		id: string;
		role?: string | null;
		guild?: GuildId | null;
	} | null;

	return {
		id: user.id,
		role: row?.role ?? null,
		guild: row?.guild ?? null,
	};
}

function unwrapSingle<T>(value: T | T[] | null | undefined): T | null {
	if (Array.isArray(value)) {
		return value[0] ?? null;
	}
	return value ?? null;
}

export function validateReportInput(input: {
	targetType: ReportTargetType;
	targetId: string;
	reason: ReportReason;
	details?: string;
}): string | null {
	if (!input.targetId || !input.targetId.trim()) {
		return "Target identifier is required.";
	}
	if (
		!input.targetType ||
		(input.targetType !== "post" && input.targetType !== "comment")
	) {
		return "Invalid target type.";
	}
	if (input.reason === "other") {
		if (!input.details || !input.details.trim()) {
			return "Please provide details for your report.";
		}
	}
	return null;
}

export async function submitReport(
	input: ReportInput,
): Promise<ModerationReport> {
	const validationError = validateReportInput(input);
	if (validationError) {
		throw new Error(validationError);
	}

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error("Authentication required to submit report.");
	}

	let guild = input.guild ?? null;
	if (!guild) {
		try {
			if (input.targetType === "post") {
				const { data: post } = await supabase
					.from("posts")
					.select("guild")
					.eq("id", input.targetId)
					.single();
				guild =
					(post as { guild?: GuildId | null } | null)?.guild ?? null;
			} else if (input.targetType === "comment") {
				const { data: comment } = await supabase
					.from("comments")
					.select("post_id")
					.eq("id", input.targetId)
					.single();
				const commentPostId = (
					comment as { post_id?: string | null } | null
				)?.post_id;
				if (commentPostId) {
					const { data: post } = await supabase
						.from("posts")
						.select("guild")
						.eq("id", commentPostId)
						.single();
					guild =
						(post as { guild?: GuildId | null } | null)?.guild ??
						null;
				}
			}
		} catch {
			// Ignore guild resolution failure
		}
	}

	const { data, error } = await supabase
		.from("reports")
		.insert({
			reporter_id: user.id,
			target_type: input.targetType,
			target_id: input.targetId,
			guild,
			reason: input.reason,
			details: input.details?.trim() || null,
			status: "open",
		})
		.select()
		.single();

	if (error) {
		if (
			error.code === "23505" ||
			error.message?.includes("23505") ||
			error.message?.toLowerCase().includes("unique")
		) {
			throw new Error("You have already reported this content.");
		}
		throw new Error(error.message || "Failed to submit report.");
	}

	return data as ModerationReport;
}

export async function fetchModerationReports(
	options?: ReportStatus | "all" | ModerationQueueFilters,
): Promise<ModerationReport[]> {
	const caller = await getCallerModerationScope();
	if (caller.role === "house_mod" && !caller.guild) {
		return [];
	}

	const filters: ModerationQueueFilters =
		typeof options === "string" || options === undefined
			? { status: options }
			: options;

	let query = supabase
		.from("reports")
		.select(
			"*, reporter:profiles!reporter_id(id, username, display_name, avatar_url), resolver:profiles!resolved_by(id, username, display_name, avatar_url), assignee:profiles!assigned_to(id, username, display_name, avatar_url)",
		)
		.order("created_at", { ascending: false });

	if (caller.role === "house_mod" && caller.guild) {
		query = query.eq("guild", caller.guild);
	}
	if (filters.status && filters.status !== "all") {
		query = query.eq("status", filters.status);
	}
	if (filters.reason && filters.reason !== "all") {
		query = query.eq("reason", filters.reason);
	}
	if (filters.targetType && filters.targetType !== "all") {
		query = query.eq("target_type", filters.targetType);
	}
	if (filters.assignee === "unassigned") {
		query = query.is("assigned_to", null);
	} else if (filters.assignee === "mine" && filters.currentUserId) {
		query = query.eq("assigned_to", filters.currentUserId);
	}

	const { data, error } = await query;
	if (error) throw error;

	const rawReports = (data || []) as Array<
		ModerationReport & {
			reporter?: ReportReporter | ReportReporter[] | null;
			resolver?: ReportReporter | ReportReporter[] | null;
			assignee?: ReportReporter | ReportReporter[] | null;
		}
	>;
	if (rawReports.length === 0) return [];

	const reports: ModerationReport[] = rawReports.map((r) => ({
		...r,
		reporter: unwrapSingle(r.reporter),
		resolver: unwrapSingle(r.resolver),
		assignee: unwrapSingle(r.assignee),
	}));

	const postIds = Array.from(
		new Set(
			reports
				.filter((r) => r.target_type === "post")
				.map((r) => r.target_id),
		),
	);
	const commentIds = Array.from(
		new Set(
			reports
				.filter((r) => r.target_type === "comment")
				.map((r) => r.target_id),
		),
	);

	const postSnippetMap = new Map<string, string>();
	const postAuthorMap = new Map<string, ModerationReport["target_author"]>();
	const commentSnippetMap = new Map<string, string>();
	const commentPostIdMap = new Map<string, string>();
	const commentAuthorMap = new Map<
		string,
		ModerationReport["target_author"]
	>();

	await Promise.all([
		postIds.length > 0
			? (async () => {
					try {
						const { data: posts } = await supabase
							.from("posts")
							.select(
								"id, title, content, author:profiles!author_id(id, username, display_name, avatar_url, guild, role, restricted_until)",
							)
							.in("id", postIds);
						if (posts) {
							for (const p of posts as Array<{
								id: string;
								title?: string | null;
								content?: string | null;
								author?:
									| NonNullable<
											ModerationReport["target_author"]
									  >
									| NonNullable<
											ModerationReport["target_author"]
									  >[]
									| null;
							}>) {
								const snippet =
									p.title || p.content || "(No text)";
								postSnippetMap.set(p.id, snippet);
								const author = unwrapSingle(p.author);
								if (author) {
									postAuthorMap.set(p.id, author);
								}
							}
						}
					} catch {
						// Ignore target post enrichment failures
					}
				})()
			: Promise.resolve(),
		commentIds.length > 0
			? (async () => {
					try {
						const { data: comments } = await supabase
							.from("comments")
							.select(
								"id, post_id, content, is_deleted, author:profiles!author_id(id, username, display_name, avatar_url, guild, role, restricted_until)",
							)
							.in("id", commentIds);
						if (comments) {
							for (const c of comments as Array<{
								id: string;
								post_id?: string | null;
								content?: string | null;
								is_deleted?: boolean | null;
								author?:
									| NonNullable<
											ModerationReport["target_author"]
									  >
									| NonNullable<
											ModerationReport["target_author"]
									  >[]
									| null;
							}>) {
								const snippet = c.is_deleted
									? "[deleted comment]"
									: c.content || "(Empty comment)";
								commentSnippetMap.set(c.id, snippet);
								if (c.post_id) {
									commentPostIdMap.set(c.id, c.post_id);
								}
								const author = unwrapSingle(c.author);
								if (author) {
									commentAuthorMap.set(c.id, author);
								}
							}
						}
					} catch {
						// Ignore target comment enrichment failures
					}
				})()
			: Promise.resolve(),
	]);

	const enriched = reports.map((r) => ({
		...r,
		target_snippet:
			r.target_type === "post"
				? (postSnippetMap.get(r.target_id) ?? "[content unavailable]")
				: (commentSnippetMap.get(r.target_id) ??
					"[content unavailable]"),
		target_post_id:
			r.target_type === "post"
				? postSnippetMap.has(r.target_id)
					? r.target_id
					: null
				: (commentPostIdMap.get(r.target_id) ?? null),
		target_author:
			r.target_type === "post"
				? (postAuthorMap.get(r.target_id) ?? null)
				: (commentAuthorMap.get(r.target_id) ?? null),
	}));

	if (typeof options === "object" && options !== null) {
		return filterModerationReports(enriched, filters);
	}

	return enriched;
}

export async function fetchReportContext(
	targetType: ReportTargetType,
	targetId: string,
): Promise<ReportContextData> {
	let targetPost: ReportContextPost | null = null;
	let targetComment: ReportContextComment | null = null;
	let parentPostId: string | null = null;
	let authorId: string | null = null;

	if (targetType === "post") {
		const { data: post } = await supabase
			.from("posts")
			.select(
				"id, author_id, title, content, guild, image_url, code_snippet, code_language, tags, upvotes_count, downvotes_count, comments_count, created_at, author:profiles!author_id(id, username, display_name, avatar_url)",
			)
			.eq("id", targetId)
			.maybeSingle();

		if (post) {
			const row = post as ReportContextPost & {
				author?: ReportReporter | ReportReporter[] | null;
			};
			targetPost = {
				...row,
				author: unwrapSingle(row.author),
			};
			parentPostId = row.id;
			authorId = row.author_id;
		}
	} else {
		const { data: comment } = await supabase
			.from("comments")
			.select(
				"id, post_id, author_id, parent_id, content, is_deleted, created_at, author:profiles!author_id(id, username, display_name, avatar_url)",
			)
			.eq("id", targetId)
			.maybeSingle();

		if (comment) {
			const row = comment as ReportContextComment & {
				author?: ReportReporter | ReportReporter[] | null;
			};
			targetComment = {
				...row,
				author: unwrapSingle(row.author),
			};
			parentPostId = row.post_id;
			authorId = row.author_id;
		}
	}

	const [
		parentPostResult,
		nearbyCommentsResult,
		authorResult,
		recentPostsResult,
		recentActionsResult,
	] = await Promise.all([
		targetType === "comment" && parentPostId
			? supabase
					.from("posts")
					.select(
						"id, author_id, title, content, guild, image_url, code_snippet, code_language, tags, upvotes_count, downvotes_count, comments_count, created_at, author:profiles!author_id(id, username, display_name, avatar_url)",
					)
					.eq("id", parentPostId)
					.maybeSingle()
			: Promise.resolve({ data: null }),
		parentPostId
			? supabase
					.from("comments")
					.select(
						"id, post_id, author_id, parent_id, content, is_deleted, created_at, author:profiles!author_id(id, username, display_name, avatar_url)",
					)
					.eq("post_id", parentPostId)
					.order("created_at", { ascending: true })
					.limit(50)
			: Promise.resolve({ data: [] }),
		authorId
			? supabase
					.from("profiles")
					.select(
						"id, username, display_name, avatar_url, guild, role, karma, restricted_until, created_at",
					)
					.eq("id", authorId)
					.maybeSingle()
			: Promise.resolve({ data: null }),
		authorId
			? supabase
					.from("posts")
					.select(
						"id, author_id, title, content, guild, image_url, code_snippet, code_language, tags, upvotes_count, downvotes_count, comments_count, created_at",
					)
					.eq("author_id", authorId)
					.order("created_at", { ascending: false })
					.limit(5)
			: Promise.resolve({ data: [] }),
		authorId
			? (async () => {
					try {
						const { data } = await supabase
							.from("moderation_actions")
							.select(
								"*, actor:profiles!actor_id(id, username, display_name, avatar_url)",
							)
							.eq("target_user_id", authorId)
							.order("created_at", { ascending: false })
							.limit(10);
						return { data: data || [] };
					} catch {
						return { data: [] };
					}
				})()
			: Promise.resolve({ data: [] }),
	]);

	if (targetType === "comment" && parentPostResult.data) {
		const row = parentPostResult.data as ReportContextPost & {
			author?: ReportReporter | ReportReporter[] | null;
		};
		targetPost = {
			...row,
			author: unwrapSingle(row.author),
		};
	}

	const allComments: ReportContextComment[] = (
		(nearbyCommentsResult.data || []) as Array<
			ReportContextComment & {
				author?: ReportReporter | ReportReporter[] | null;
			}
		>
	).map((c) => ({
		...c,
		author: unwrapSingle(c.author),
	}));

	let nearbyComments: ReportContextComment[];
	if (targetType === "comment" && targetComment) {
		const idx = allComments.findIndex((c) => c.id === targetComment.id);
		if (idx >= 0) {
			const start = Math.max(0, idx - 5);
			const end = Math.min(allComments.length, idx + 6);
			nearbyComments = allComments.slice(start, end);
		} else {
			nearbyComments = allComments.slice(-10);
		}
	} else {
		nearbyComments = allComments.slice(-10);
	}

	const author = (authorResult.data as ReportContextAuthor | null) ?? null;
	const authorRecentPosts = (recentPostsResult.data ||
		[]) as ReportContextPost[];
	const authorRecentActions: ModerationActionRecord[] = (
		(recentActionsResult.data || []) as Array<
			ModerationActionRecord & {
				actor?: ReportReporter | ReportReporter[] | null;
			}
		>
	).map((a) => ({
		...a,
		actor: unwrapSingle(a.actor),
	}));

	return {
		targetType,
		targetId,
		targetPost,
		targetComment,
		nearbyComments,
		author,
		authorRecentPosts,
		authorRecentActions,
		isAuthorRestricted: isUserRestricted(author?.restricted_until),
	};
}

export async function resolveReport(input: ResolveReportInput): Promise<void>;
export async function resolveReport(
	reportId: string,
	action: ModerationActionType,
): Promise<void>;
export async function resolveReport(
	inputOrReportId: ResolveReportInput | string,
	legacyAction?: ModerationActionType,
): Promise<void> {
	const input: ResolveReportInput =
		typeof inputOrReportId === "string"
			? {
					reportId: inputOrReportId,
					action: legacyAction ?? "dismiss",
				}
			: inputOrReportId;

	const { reportId, action } = input;
	const trimmedNote = input.moderatorNote?.trim() || null;
	const trimmedExplanation = input.publicExplanation?.trim() || null;
	const shouldApplyToGroup = input.applyToGroup ?? action !== "dismiss";

	const caller = await getCallerModerationScope();

	const { data: reportRow, error: reportError } = await supabase
		.from("reports")
		.select(
			"id, reporter_id, target_type, target_id, guild, reason, status",
		)
		.eq("id", reportId)
		.single();

	if (reportError || !reportRow) {
		throw reportError || new Error("Report not found.");
	}

	const report = reportRow as {
		id: string;
		reporter_id: string;
		target_type: ReportTargetType;
		target_id: string;
		guild?: GuildId | null;
		reason: ReportReason;
		status: ReportStatus;
	};

	// Resolve target author, guild, and parent post before any destructive deletion
	let targetUserId: string | null = null;
	let postId: string | null = null;
	let commentId: string | null = null;
	let resolvedGuild: GuildId | null = report.guild ?? null;

	try {
		if (report.target_type === "post") {
			const { data: post } = await supabase
				.from("posts")
				.select("id, author_id, guild")
				.eq("id", report.target_id)
				.maybeSingle();
			if (post) {
				const p = post as {
					id: string;
					author_id?: string | null;
					guild?: GuildId | null;
				};
				targetUserId = p.author_id ?? null;
				postId = p.id;
				if (!resolvedGuild) {
					resolvedGuild = p.guild ?? null;
				}
			}
		} else {
			const { data: comment } = await supabase
				.from("comments")
				.select("id, post_id, author_id")
				.eq("id", report.target_id)
				.maybeSingle();
			if (comment) {
				const c = comment as {
					id: string;
					post_id?: string | null;
					author_id?: string | null;
				};
				targetUserId = c.author_id ?? null;
				postId = c.post_id ?? null;
				commentId = c.id;
				if (!resolvedGuild && postId) {
					const { data: parentPost } = await supabase
						.from("posts")
						.select("guild")
						.eq("id", postId)
						.maybeSingle();
					resolvedGuild =
						(parentPost as { guild?: GuildId | null } | null)
							?.guild ?? null;
				}
			}
		}
	} catch {
		// Content may already be deleted
	}

	// Enforce house_mod guild scope before any enforcement action
	if (caller.role === "house_mod") {
		if (
			!caller.guild ||
			report.guild !== caller.guild ||
			resolvedGuild !== caller.guild
		) {
			throw new Error(
				"House moderators can only moderate reports within their assigned house.",
			);
		}
	}

	let affectedReports: Array<{ id: string; reporter_id: string }> = [];

	if (shouldApplyToGroup) {
		let siblingsQuery = supabase
			.from("reports")
			.select("id, reporter_id")
			.eq("target_type", report.target_type)
			.eq("target_id", report.target_id)
			.eq("status", "open");

		if (caller.role === "house_mod" && caller.guild) {
			siblingsQuery = siblingsQuery.eq("guild", caller.guild);
		}

		const { data: openSiblings } = await siblingsQuery;

		if (openSiblings && openSiblings.length > 0) {
			affectedReports = openSiblings as Array<{
				id: string;
				reporter_id: string;
			}>;
		} else if (report.status === "open") {
			affectedReports = [
				{ id: report.id, reporter_id: report.reporter_id },
			];
		}
	} else if (report.status === "open") {
		affectedReports = [{ id: report.id, reporter_id: report.reporter_id }];
	}

	// Guard against re-actioning or re-notifying already-closed reports
	if (affectedReports.length === 0) {
		return;
	}

	const affectedReportIds = Array.from(
		new Set(affectedReports.map((r) => r.id)),
	);

	// 1. Execute enforcement action
	if (action === "remove_content") {
		if (report.target_type === "post") {
			await deletePost(report.target_id);
		} else if (report.target_type === "comment") {
			await deleteComment(report.target_id);
		}
	} else if (
		action === "warn" ||
		action === "restrict_24h" ||
		action === "restrict_7d"
	) {
		if (!targetUserId) {
			throw new Error(
				"Cannot warn or restrict user: target author could not be resolved.",
			);
		}
		if (action === "restrict_24h" || action === "restrict_7d") {
			const durationMs = action === "restrict_24h" ? DAY_MS : 7 * DAY_MS;
			const restrictedUntil = new Date(
				Date.now() + durationMs,
			).toISOString();

			const { error: restrictError } = await supabase
				.from("profiles")
				.update({ restricted_until: restrictedUntil })
				.eq("id", targetUserId);

			if (restrictError) throw restrictError;
		}
	}

	// 2. Record moderation action audit row
	const { data: actionRow, error: actionError } = await supabase
		.from("moderation_actions")
		.insert({
			actor_id: caller.id,
			target_user_id: targetUserId,
			target_type: report.target_type,
			target_id: report.target_id,
			guild: resolvedGuild,
			action,
			moderator_note: trimmedNote,
			public_explanation: trimmedExplanation,
			report_ids: affectedReportIds,
		})
		.select("id")
		.single();

	if (actionError) throw actionError;

	const actionId = (actionRow as { id: string }).id;
	const now = new Date().toISOString();
	const nextStatus: ReportStatus =
		action === "dismiss" ? "dismissed" : "resolved";

	// 3. Update matching report rows
	let updateQuery = supabase
		.from("reports")
		.update({
			status: nextStatus,
			resolution_action: action,
			moderator_note: trimmedNote,
			resolved_by: caller.id,
			resolved_at: now,
		})
		.in("id", affectedReportIds);

	if (caller.role === "house_mod" && caller.guild) {
		updateQuery = updateQuery.eq("guild", caller.guild);
	}

	const { error: updateError } = await updateQuery;

	if (updateError) throw updateError;

	// 4. Send sanitized notifications via SECURITY DEFINER RPC (best-effort)
	const safePostId =
		action === "remove_content" && report.target_type === "post"
			? null
			: postId;
	const safeCommentId =
		action === "remove_content" && report.target_type === "comment"
			? null
			: commentId;

	const uniqueReporterIds = Array.from(
		new Set(affectedReports.map((r) => r.reporter_id).filter(Boolean)),
	);
	const reporterPayload = buildReporterOutcomeNotification({
		targetType: report.target_type,
		action,
	});

	const notificationTasks: Promise<unknown>[] = uniqueReporterIds.map(
		async (recipientId) => {
			try {
				await supabase.rpc("notify_moderation_outcome", {
					p_recipient_id: recipientId,
					p_title: reporterPayload.title,
					p_body: reporterPayload.body,
					p_post_id: safePostId,
					p_comment_id: safeCommentId,
					p_data: reporterPayload.data,
				});
			} catch {
				// Best-effort notification delivery
			}
		},
	);

	if (targetUserId && action !== "dismiss") {
		const reportedUserPayload = buildReportedUserOutcomeNotification({
			targetType: report.target_type,
			action,
			reason: report.reason,
			publicExplanation: trimmedExplanation,
			actionId,
			postId: safePostId,
			commentId: safeCommentId,
		});

		notificationTasks.push(
			(async () => {
				try {
					await supabase.rpc("notify_moderation_outcome", {
						p_recipient_id: targetUserId,
						p_title: reportedUserPayload.title,
						p_body: reportedUserPayload.body,
						p_post_id: safePostId,
						p_comment_id: safeCommentId,
						p_data: reportedUserPayload.data,
					});
				} catch {
					// Best-effort notification delivery
				}
			})(),
		);
	}

	await Promise.all(notificationTasks);
}

export async function assignReportTarget(
	targetType: ReportTargetType,
	targetId: string,
	assigneeId: string | null,
): Promise<void> {
	const caller = await getCallerModerationScope();
	if (caller.role === "house_mod" && !caller.guild) {
		throw new Error(
			"House moderators must be assigned to a house to claim or assign reports.",
		);
	}

	let query = supabase
		.from("reports")
		.update({
			assigned_to: assigneeId,
			assigned_at: assigneeId ? new Date().toISOString() : null,
		})
		.eq("target_type", targetType)
		.eq("target_id", targetId)
		.eq("status", "open");

	if (caller.role === "house_mod" && caller.guild) {
		query = query.eq("guild", caller.guild);
	}

	const { error } = await query;

	if (error) throw error;
}

export async function bulkDismissReports(
	reportIds: string[],
	moderatorNote?: string,
): Promise<{ dismissedCount: number }> {
	const uniqueIds = Array.from(new Set(reportIds.filter(Boolean)));
	if (uniqueIds.length === 0) {
		return { dismissedCount: 0 };
	}

	const caller = await getCallerModerationScope();
	if (caller.role === "house_mod" && !caller.guild) {
		throw new Error(
			"House moderators must be assigned to a house to dismiss reports.",
		);
	}

	let fetchQuery = supabase
		.from("reports")
		.select("id, reporter_id, target_type, target_id, guild")
		.in("id", uniqueIds)
		.eq("status", "open");

	if (caller.role === "house_mod" && caller.guild) {
		fetchQuery = fetchQuery.eq("guild", caller.guild);
	}

	const { data: openRows, error: fetchError } = await fetchQuery;

	if (fetchError) throw fetchError;

	const openReports = (openRows || []) as Array<{
		id: string;
		reporter_id: string;
		target_type: ReportTargetType;
		target_id: string;
		guild?: GuildId | null;
	}>;

	if (openReports.length === 0) {
		return { dismissedCount: 0 };
	}

	const openReportIds = openReports.map((r) => r.id);
	const trimmedNote = moderatorNote?.trim() || null;
	const now = new Date().toISOString();

	// Group by target so each audit row has accurate target_type, target_id, guild, and report_ids
	const targetBuckets = new Map<
		string,
		{
			target_type: ReportTargetType;
			target_id: string;
			guild: GuildId | null;
			report_ids: string[];
		}
	>();

	for (const r of openReports) {
		const key = `${r.target_type}:${r.target_id}`;
		const existing = targetBuckets.get(key);
		if (existing) {
			existing.report_ids.push(r.id);
			if (!existing.guild && r.guild) {
				existing.guild = r.guild;
			}
		} else {
			targetBuckets.set(key, {
				target_type: r.target_type,
				target_id: r.target_id,
				guild: r.guild ?? null,
				report_ids: [r.id],
			});
		}
	}

	const auditRows = Array.from(targetBuckets.values()).map((bucket) => ({
		actor_id: caller.id,
		target_user_id: null,
		target_type: bucket.target_type,
		target_id: bucket.target_id,
		guild: bucket.guild,
		action: "dismiss" as const,
		moderator_note: trimmedNote,
		public_explanation: null,
		report_ids: bucket.report_ids,
	}));

	// Insert audit rows BEFORE updating reports so a failed audit write never leaves reports dismissed without an audit trail
	const { error: auditError } = await supabase
		.from("moderation_actions")
		.insert(auditRows);

	if (auditError) throw auditError;

	let updateQuery = supabase
		.from("reports")
		.update({
			status: "dismissed",
			resolution_action: "dismiss",
			moderator_note: trimmedNote,
			resolved_by: caller.id,
			resolved_at: now,
		})
		.in("id", openReportIds);

	if (caller.role === "house_mod" && caller.guild) {
		updateQuery = updateQuery.eq("guild", caller.guild);
	}

	const { error: updateError } = await updateQuery;

	if (updateError) throw updateError;

	// Notify each unique reporter once (best-effort)
	const reporterTargetTypeMap = new Map<string, ReportTargetType>();
	for (const r of openReports) {
		if (r.reporter_id && !reporterTargetTypeMap.has(r.reporter_id)) {
			reporterTargetTypeMap.set(r.reporter_id, r.target_type);
		}
	}

	await Promise.all(
		Array.from(reporterTargetTypeMap.entries()).map(
			async ([recipientId, targetType]) => {
				const payload = buildReporterOutcomeNotification({
					targetType,
					action: "dismiss",
				});
				try {
					await supabase.rpc("notify_moderation_outcome", {
						p_recipient_id: recipientId,
						p_title: payload.title,
						p_body: payload.body,
						p_post_id: null,
						p_comment_id: null,
						p_data: payload.data,
					});
				} catch {
					// Best-effort notification delivery
				}
			},
		),
	);

	return { dismissedCount: openReports.length };
}

export async function submitModerationAppeal(
	actionId: string,
	reason: string,
): Promise<void> {
	const trimmedActionId = actionId?.trim();
	const trimmedReason = reason?.trim();

	if (!trimmedActionId) {
		throw new Error("Moderation action identifier is required.");
	}
	if (!trimmedReason) {
		throw new Error("Please explain why you are appealing this decision.");
	}

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error("Authentication required to submit an appeal.");
	}

	const { error } = await supabase.from("moderation_appeals").insert({
		action_id: trimmedActionId,
		appellant_id: user.id,
		reason: trimmedReason,
		status: "pending",
	});

	if (error) {
		if (
			error.code === "23505" ||
			error.message?.includes("23505") ||
			error.message?.toLowerCase().includes("unique")
		) {
			throw new Error(
				"You have already submitted an appeal for this moderation action.",
			);
		}
		throw new Error(error.message || "Failed to submit appeal.");
	}
}

export async function fetchStaffModerators(
	guild?: GuildId | null,
): Promise<StaffModerator[]> {
	const roles = guild ? ["admin", "mod", "house_mod"] : ["admin", "mod"];
	const { data, error } = await supabase
		.from("profiles")
		.select("id, username, display_name, avatar_url, role, guild")
		.in("role", roles)
		.order("username", { ascending: true });

	if (error) throw error;

	const staff = (data || []) as StaffModerator[];
	if (!guild) {
		return staff.filter(
			(member) => member.role === "admin" || member.role === "mod",
		);
	}

	return staff.filter(
		(member) =>
			member.role === "admin" ||
			member.role === "mod" ||
			member.guild === guild,
	);
}
