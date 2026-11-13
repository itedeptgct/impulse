import { supabase } from "@lib/supabase";

import { deleteComment, deletePost } from "@/features/posts/api";

import type {
	ModerationReport,
	ReportInput,
	ReportReason,
	ReportStatus,
	ReportTargetType,
} from "./types";

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
				guild = (post as any)?.guild ?? null;
			} else if (input.targetType === "comment") {
				const { data: comment } = await supabase
					.from("comments")
					.select("post_id")
					.eq("id", input.targetId)
					.single();
				if ((comment as any)?.post_id) {
					const { data: post } = await supabase
						.from("posts")
						.select("guild")
						.eq("id", (comment as any).post_id)
						.single();
					guild = (post as any)?.guild ?? null;
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
	status?: ReportStatus | "all",
): Promise<ModerationReport[]> {
	let query = supabase
		.from("reports")
		.select(
			"*, reporter:profiles!reporter_id(id, username, display_name, avatar_url)",
		)
		.order("created_at", { ascending: false });

	if (status && status !== "all") {
		query = query.eq("status", status);
	}

	const { data, error } = await query;
	if (error) throw error;

	const reports = (data || []) as ModerationReport[];
	if (reports.length === 0) return [];

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
	const commentSnippetMap = new Map<string, string>();

	if (postIds.length > 0) {
		try {
			const { data: posts } = await supabase
				.from("posts")
				.select("id, title, content")
				.in("id", postIds);
			if (posts) {
				for (const p of posts as any[]) {
					const snippet = p.title || p.content || "(No text)";
					postSnippetMap.set(p.id, snippet);
				}
			}
		} catch {}
	}

	if (commentIds.length > 0) {
		try {
			const { data: comments } = await supabase
				.from("comments")
				.select("id, content, is_deleted")
				.in("id", commentIds);
			if (comments) {
				for (const c of comments as any[]) {
					const snippet = c.is_deleted
						? "[deleted comment]"
						: c.content || "(Empty comment)";
					commentSnippetMap.set(c.id, snippet);
				}
			}
		} catch {}
	}

	return reports.map((r) => ({
		...r,
		target_snippet:
			r.target_type === "post"
				? (postSnippetMap.get(r.target_id) ?? "[content unavailable]")
				: (commentSnippetMap.get(r.target_id) ??
					"[content unavailable]"),
	}));
}

export async function resolveReport(
	reportId: string,
	action: "dismiss" | "remove_content",
): Promise<void> {
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error("Authentication required to resolve report.");
	}

	const { data: report, error: reportError } = await supabase
		.from("reports")
		.select("id, target_type, target_id, status")
		.eq("id", reportId)
		.single();

	if (reportError || !report) {
		throw reportError || new Error("Report not found.");
	}

	const now = new Date().toISOString();

	if (action === "dismiss") {
		const { error: updateError } = await supabase
			.from("reports")
			.update({
				status: "dismissed",
				resolved_by: user.id,
				resolved_at: now,
			})
			.eq("id", reportId);

		if (updateError) throw updateError;
		return;
	}

	if (action === "remove_content") {
		if (report.target_type === "post") {
			await deletePost(report.target_id);
		} else if (report.target_type === "comment") {
			await deleteComment(report.target_id);
		}

		const { error: updateError } = await supabase
			.from("reports")
			.update({
				status: "resolved",
				resolved_by: user.id,
				resolved_at: now,
			})
			.eq("target_type", report.target_type)
			.eq("target_id", report.target_id)
			.eq("status", "open");

		if (updateError) throw updateError;
	}
}
