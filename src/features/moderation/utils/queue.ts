import type { GuildId } from "@/features/guilds/types";

import type {
	GroupedModerationReport,
	ModerationQueueFilters,
	ModerationQueueMetrics,
	ModerationReport,
	ReportReason,
	ReportSortBy,
} from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

function toTimestamp(iso?: string | null): number {
	if (!iso) return 0;
	const parsed = Date.parse(iso);
	return Number.isNaN(parsed) ? 0 : parsed;
}

function matchesSearch(report: ModerationReport, query: string): boolean {
	const candidates = [
		report.reporter?.username,
		report.reporter?.display_name,
		report.target_author?.username,
		report.target_author?.display_name,
		report.details,
		report.target_snippet,
	];

	return candidates.some(
		(value) =>
			typeof value === "string" && value.toLowerCase().includes(query),
	);
}

/**
 * Filter moderation reports by status, reason, target type, assignee, and search query.
 */
export function filterModerationReports(
	reports: ModerationReport[],
	filters: ModerationQueueFilters,
): ModerationReport[] {
	const searchQuery = filters.search?.trim().toLowerCase() ?? "";

	return reports.filter((report) => {
		if (
			filters.status &&
			filters.status !== "all" &&
			report.status !== filters.status
		) {
			return false;
		}
		if (
			filters.reason &&
			filters.reason !== "all" &&
			report.reason !== filters.reason
		) {
			return false;
		}
		if (
			filters.targetType &&
			filters.targetType !== "all" &&
			report.target_type !== filters.targetType
		) {
			return false;
		}
		if (filters.assignee === "unassigned" && report.assigned_to) {
			return false;
		}
		if (
			filters.assignee === "mine" &&
			(!filters.currentUserId ||
				report.assigned_to !== filters.currentUserId)
		) {
			return false;
		}
		if (searchQuery && !matchesSearch(report, searchQuery)) {
			return false;
		}
		return true;
	});
}

/**
 * Group reports by target_type:target_id:status so active reports aggregate cleanly
 * without merging past resolved history from earlier incidents.
 */
export function groupModerationReports(
	reports: ModerationReport[],
): GroupedModerationReport[] {
	const buckets = new Map<string, ModerationReport[]>();

	for (const report of reports) {
		const key = `${report.target_type}:${report.target_id}:${report.status}`;
		const existing = buckets.get(key);
		if (existing) {
			existing.push(report);
		} else {
			buckets.set(key, [report]);
		}
	}

	const groups: GroupedModerationReport[] = [];

	for (const [key, groupReports] of buckets) {
		const first = groupReports[0];
		if (!first) continue;

		const reasons: ReportReason[] = [];
		const reasonCounts = new Map<ReportReason, number>();

		let oldestCreatedAt = first.created_at;
		let latestCreatedAt = first.created_at;

		for (const report of groupReports) {
			if (!reasonCounts.has(report.reason)) {
				reasons.push(report.reason);
			}
			reasonCounts.set(
				report.reason,
				(reasonCounts.get(report.reason) ?? 0) + 1,
			);

			if (toTimestamp(report.created_at) < toTimestamp(oldestCreatedAt)) {
				oldestCreatedAt = report.created_at;
			}
			if (toTimestamp(report.created_at) > toTimestamp(latestCreatedAt)) {
				latestCreatedAt = report.created_at;
			}
		}

		let primaryReason = first.reason;
		let maxReasonCount = 0;
		for (const reason of reasons) {
			const count = reasonCounts.get(reason) ?? 0;
			if (count > maxReasonCount) {
				maxReasonCount = count;
				primaryReason = reason;
			}
		}

		const byLatest = [...groupReports].sort(
			(a, b) => toTimestamp(b.created_at) - toTimestamp(a.created_at),
		);
		const assignedReport = byLatest.find((r) => Boolean(r.assigned_to));
		const assignedTo = assignedReport?.assigned_to ?? null;
		const assignee = assignedTo
			? (byLatest.find(
					(r) => r.assigned_to === assignedTo && r.assignee != null,
				)?.assignee ?? null)
			: null;

		const resolvedReport = byLatest.find(
			(r) => Boolean(r.resolved_at) || Boolean(r.resolved_by),
		);
		const resolvedBy = resolvedReport?.resolved_by ?? null;
		const resolver = resolvedBy
			? (byLatest.find(
					(r) => r.resolved_by === resolvedBy && r.resolver != null,
				)?.resolver ?? null)
			: null;

		groups.push({
			key,
			target_type: first.target_type,
			target_id: first.target_id,
			target_post_id:
				byLatest.find((r) => r.target_post_id != null)
					?.target_post_id ?? null,
			target_snippet:
				byLatest.find((r) => r.target_snippet != null)
					?.target_snippet ?? null,
			target_author:
				byLatest.find((r) => r.target_author != null)?.target_author ??
				null,
			guild: byLatest.find((r) => r.guild != null)?.guild ?? null,
			status: first.status,
			count: groupReports.length,
			reasons,
			primary_reason: primaryReason,
			reports: byLatest,
			oldest_created_at: oldestCreatedAt,
			latest_created_at: latestCreatedAt,
			assigned_to: assignedTo,
			assignee,
			resolved_by: resolvedBy,
			resolver,
			resolved_at: resolvedReport?.resolved_at ?? null,
			resolution_action:
				byLatest.find((r) => r.resolution_action != null)
					?.resolution_action ?? null,
			moderator_note:
				byLatest.find((r) => r.moderator_note != null)
					?.moderator_note ?? null,
		});
	}

	return groups;
}

/**
 * Sort grouped moderation reports without mutating the input array.
 */
export function sortReportGroups(
	groups: GroupedModerationReport[],
	sortBy: ReportSortBy,
): GroupedModerationReport[] {
	return [...groups].sort((a, b) => {
		if (sortBy === "oldest") {
			const diff =
				toTimestamp(a.oldest_created_at) -
				toTimestamp(b.oldest_created_at);
			if (diff !== 0) return diff;
			return b.count - a.count || a.key.localeCompare(b.key);
		}

		if (sortBy === "most_reported") {
			const countDiff = b.count - a.count;
			if (countDiff !== 0) return countDiff;
			const timeDiff =
				toTimestamp(b.latest_created_at) -
				toTimestamp(a.latest_created_at);
			if (timeDiff !== 0) return timeDiff;
			return a.key.localeCompare(b.key);
		}

		const diff =
			toTimestamp(b.latest_created_at) - toTimestamp(a.latest_created_at);
		if (diff !== 0) return diff;
		return b.count - a.count || a.key.localeCompare(b.key);
	});
}

/**
 * Compute open-queue metrics by age (<24h, 1-3d, >3d), reason, house, and assignment.
 */
export function computeQueueMetrics(
	reports: ModerationReport[],
	nowMs = Date.now(),
): ModerationQueueMetrics {
	const byReason: Record<ReportReason, number> = {
		spam: 0,
		harassment: 0,
		misinformation: 0,
		inappropriate: 0,
		other: 0,
	};
	const byHouse: Record<GuildId | "global", number> = {
		octagram: 0,
		chameleon: 0,
		blue_jays: 0,
		global: 0,
	};
	const byAge = {
		under24h: 0,
		oneToThreeDays: 0,
		overThreeDays: 0,
	};

	const openTargets = new Set<string>();
	let totalOpen = 0;
	let unassignedOpen = 0;

	for (const report of reports) {
		if (report.status !== "open") continue;

		totalOpen += 1;
		openTargets.add(`${report.target_type}:${report.target_id}`);

		if (!report.assigned_to) {
			unassignedOpen += 1;
		}

		const parsedCreated = Date.parse(report.created_at);
		const ageMs = Number.isNaN(parsedCreated)
			? 0
			: Math.max(0, nowMs - parsedCreated);
		if (ageMs < DAY_MS) {
			byAge.under24h += 1;
		} else if (ageMs <= 3 * DAY_MS) {
			byAge.oneToThreeDays += 1;
		} else {
			byAge.overThreeDays += 1;
		}

		if (report.reason in byReason) {
			byReason[report.reason] += 1;
		}

		const house: GuildId | "global" = report.guild ?? "global";
		if (house in byHouse) {
			byHouse[house] += 1;
		} else {
			byHouse.global += 1;
		}
	}

	return {
		totalOpen,
		uniqueOpenTargets: openTargets.size,
		unassignedOpen,
		byAge,
		byReason,
		byHouse,
	};
}

/**
 * Return true when a user restriction timestamp is valid and still in the future.
 */
export function isUserRestricted(
	restrictedUntil?: string | null,
	nowMs = Date.now(),
): boolean {
	if (!restrictedUntil) return false;
	const untilMs = Date.parse(restrictedUntil);
	if (Number.isNaN(untilMs)) return false;
	return untilMs > nowMs;
}
