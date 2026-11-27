import type { GuildId } from "@/features/guilds/types";

export type ReportTargetType = "post" | "comment";

export type ReportReason =
	| "spam"
	| "harassment"
	| "misinformation"
	| "inappropriate"
	| "other";

export type ReportStatus = "open" | "resolved" | "dismissed";

export type ModerationActionType =
	| "dismiss"
	| "warn"
	| "restrict_24h"
	| "restrict_7d"
	| "remove_content";

export type ReportSortBy = "newest" | "oldest" | "most_reported";

export type ReportAssigneeFilter = "all" | "unassigned" | "mine";

export interface ModerationQueueFilters {
	status?: ReportStatus | "all";
	search?: string;
	reason?: ReportReason | "all";
	targetType?: ReportTargetType | "all";
	assignee?: ReportAssigneeFilter;
	currentUserId?: string;
	sortBy?: ReportSortBy;
}

export interface ReportInput {
	targetType: ReportTargetType;
	targetId: string;
	reason: ReportReason;
	details?: string;
	guild?: GuildId | null;
}

export interface ReportReporter {
	id: string;
	username?: string | null;
	display_name?: string | null;
	avatar_url?: string | null;
}

export interface ModerationReport {
	id: string;
	reporter_id: string;
	target_type: ReportTargetType;
	target_id: string;
	guild?: GuildId | null;
	reason: ReportReason;
	details?: string | null;
	status: ReportStatus;
	resolved_by?: string | null;
	resolved_at?: string | null;
	created_at: string;
	reporter?: ReportReporter | null;
	target_snippet?: string | null;
	target_post_id?: string | null;
	moderator_note?: string | null;
	resolution_action?: ModerationActionType | null;
	assigned_to?: string | null;
	assigned_at?: string | null;
	resolver?: ReportReporter | null;
	assignee?: ReportReporter | null;
	target_author?:
		| (ReportReporter & {
				guild?: GuildId | null;
				role?: string | null;
				restricted_until?: string | null;
		  })
		| null;
}

export interface GroupedModerationReport {
	key: string;
	target_type: ReportTargetType;
	target_id: string;
	target_post_id: string | null;
	target_snippet: string | null;
	target_author: ModerationReport["target_author"];
	guild: GuildId | null;
	status: ReportStatus;
	count: number;
	reasons: ReportReason[];
	primary_reason: ReportReason;
	reports: ModerationReport[];
	oldest_created_at: string;
	latest_created_at: string;
	assigned_to: string | null;
	assignee: ReportReporter | null;
	resolved_by: string | null;
	resolver: ReportReporter | null;
	resolved_at: string | null;
	resolution_action: ModerationActionType | null;
	moderator_note: string | null;
}

export interface ModerationQueueMetrics {
	totalOpen: number;
	uniqueOpenTargets: number;
	unassignedOpen: number;
	byAge: {
		under24h: number;
		oneToThreeDays: number;
		overThreeDays: number;
	};
	byReason: Record<ReportReason, number>;
	byHouse: Record<GuildId | "global", number>;
}

export interface ModerationActionRecord {
	id: string;
	actor_id: string | null;
	target_user_id: string | null;
	target_type: ReportTargetType | "user";
	target_id: string;
	guild?: GuildId | null;
	action: ModerationActionType;
	moderator_note?: string | null;
	public_explanation?: string | null;
	report_ids: string[];
	created_at: string;
	actor?: ReportReporter | null;
}

export type ModerationAppealStatus = "pending" | "approved" | "rejected";

export interface ModerationAppeal {
	id: string;
	action_id: string;
	appellant_id: string;
	reason: string;
	status: ModerationAppealStatus;
	reviewed_by?: string | null;
	review_note?: string | null;
	reviewed_at?: string | null;
	created_at: string;
}

export interface StaffModerator {
	id: string;
	username?: string | null;
	display_name?: string | null;
	avatar_url?: string | null;
	role: "admin" | "mod" | "house_mod";
	guild?: GuildId | null;
}

export interface ReportContextAuthor {
	id: string;
	username?: string | null;
	display_name?: string | null;
	avatar_url?: string | null;
	guild?: GuildId | null;
	role?: string | null;
	karma?: number | null;
	is_verified?: boolean | null;
	restricted_until?: string | null;
	created_at?: string | null;
}

export interface ReportContextPost {
	id: string;
	author_id: string;
	title: string;
	content: string;
	guild?: GuildId | null;
	image_url?: string | null;
	image_urls?: string[] | null;
	code_snippet?: string | null;
	code_language?: string | null;
	tags?: string[] | null;
	upvotes_count?: number | null;
	downvotes_count?: number | null;
	comments_count?: number | null;
	created_at: string;
	author?: ReportReporter | null;
}

export interface ReportContextComment {
	id: string;
	post_id: string;
	author_id: string;
	parent_id?: string | null;
	content: string;
	is_deleted?: boolean | null;
	created_at: string;
	author?: ReportReporter | null;
}

export interface ReportContextData {
	targetType: ReportTargetType;
	targetId: string;
	targetPost: ReportContextPost | null;
	targetComment: ReportContextComment | null;
	nearbyComments: ReportContextComment[];
	author: ReportContextAuthor | null;
	authorRecentPosts: ReportContextPost[];
	authorRecentActions: ModerationActionRecord[];
	isAuthorRestricted: boolean;
}

export interface ResolveReportInput {
	reportId: string;
	action: ModerationActionType;
	moderatorNote?: string;
	publicExplanation?: string;
	applyToGroup?: boolean;
}

export interface OutcomeNotificationPayload {
	title: string;
	body: string;
	data: Record<string, unknown>;
}

export const REPORT_REASONS: {
	value: ReportReason;
	label: string;
	description: string;
}[] = [
	{
		value: "spam",
		label: "Spam",
		description: "Repeated, irrelevant, or promotional broadcasts.",
	},
	{
		value: "harassment",
		label: "Harassment",
		description: "Targeted hostility, bullying, or abusive behavior.",
	},
	{
		value: "misinformation",
		label: "Misinformation",
		description: "False, deceptive, or misleading campus information.",
	},
	{
		value: "inappropriate",
		label: "Inappropriate",
		description: "Explicit, hateful, or conduct-violating content.",
	},
	{
		value: "other",
		label: "Other Violation",
		description: "Requires specific explanation in report details.",
	},
];
