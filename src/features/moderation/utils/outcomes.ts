import type {
	ModerationActionType,
	OutcomeNotificationPayload,
	ReportReason,
	ReportTargetType,
} from "../types";

const REASON_EXPLANATIONS: Record<ReportReason, string> = {
	spam: "it was flagged as spam or unsolicited promotion.",
	harassment: "it violated our community guidelines against harassment.",
	misinformation: "it was flagged for misleading or false information.",
	inappropriate:
		"it was flagged as inappropriate or conduct-violating content.",
	other: "it violated campus community guidelines.",
};

function getTargetLabel(targetType: ReportTargetType): string {
	return targetType === "post" ? "post" : "comment";
}

/**
 * Pure builder for reporter-facing moderation outcome notifications.
 * Intentionally never accepts or embeds internal moderator notes.
 */
export function buildReporterOutcomeNotification(params: {
	targetType: ReportTargetType;
	action: ModerationActionType;
}): OutcomeNotificationPayload {
	const targetLabel = getTargetLabel(params.targetType);
	const data: Record<string, unknown> = {
		kind: "moderation_reporter_outcome",
		targetType: params.targetType,
		action: params.action,
	};

	switch (params.action) {
		case "dismiss":
			return {
				title: "Report Reviewed",
				body: `Thank you for your report. After reviewing the reported ${targetLabel}, our moderation team found no violation of community guidelines.`,
				data,
			};
		case "warn":
			return {
				title: "Report Update: Action Taken",
				body: `Thank you for your report. Our moderation team reviewed the reported ${targetLabel} and issued a warning to the author.`,
				data,
			};
		case "restrict_24h":
			return {
				title: "Report Update: Action Taken",
				body: `Thank you for your report. Our moderation team reviewed the reported ${targetLabel} and temporarily restricted the author for 24 hours.`,
				data,
			};
		case "restrict_7d":
			return {
				title: "Report Update: Action Taken",
				body: `Thank you for your report. Our moderation team reviewed the reported ${targetLabel} and temporarily restricted the author for 7 days.`,
				data,
			};
		case "remove_content":
			return {
				title: "Report Update: Content Removed",
				body: `Thank you for your report. Our moderation team reviewed the reported ${targetLabel} and removed the content.`,
				data,
			};
	}
}

/**
 * Pure builder for reported-user-facing moderation outcome notifications.
 * Includes appeal metadata when action is not "dismiss" and never embeds internal moderator notes.
 */
export function buildReportedUserOutcomeNotification(params: {
	targetType: ReportTargetType;
	action: ModerationActionType;
	reason: ReportReason;
	publicExplanation?: string | null;
	actionId: string;
	postId?: string | null;
	commentId?: string | null;
}): OutcomeNotificationPayload {
	const targetLabel = getTargetLabel(params.targetType);
	const explanation =
		params.publicExplanation?.trim() ||
		REASON_EXPLANATIONS[params.reason] ||
		REASON_EXPLANATIONS.other;

	const data: Record<string, unknown> = {
		kind: "moderation_subject_outcome",
		targetType: params.targetType,
		action: params.action,
		reason: params.reason,
		actionId: params.actionId,
		canAppeal: params.action !== "dismiss",
	};

	if (params.postId) {
		data.postId = params.postId;
	}
	if (params.commentId) {
		data.commentId = params.commentId;
	}

	switch (params.action) {
		case "dismiss":
			return {
				title: "Moderation Review Complete",
				body: `A report on your ${targetLabel} was reviewed and dismissed. No action was taken.`,
				data,
			};
		case "warn":
			return {
				title: "Community Guidelines Warning",
				body: `A moderator issued a warning regarding your ${targetLabel}: ${explanation}`,
				data,
			};
		case "restrict_24h":
			return {
				title: "Posting Restricted (24 Hours)",
				body: `Your account has been restricted from posting and commenting for 24 hours due to your ${targetLabel}: ${explanation}`,
				data,
			};
		case "restrict_7d":
			return {
				title: "Posting Restricted (7 Days)",
				body: `Your account has been restricted from posting and commenting for 7 days due to your ${targetLabel}: ${explanation}`,
				data,
			};
		case "remove_content":
			return {
				title: "Content Removed by Moderators",
				body: `Your ${targetLabel} was removed by moderators: ${explanation}`,
				data,
			};
	}
}
