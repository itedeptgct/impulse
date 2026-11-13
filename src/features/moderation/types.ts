import type { GuildId } from "@/features/guilds/types";

export type ReportTargetType = "post" | "comment";

export type ReportReason =
	| "spam"
	| "harassment"
	| "misinformation"
	| "inappropriate"
	| "other";

export type ReportStatus = "open" | "resolved" | "dismissed";

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
