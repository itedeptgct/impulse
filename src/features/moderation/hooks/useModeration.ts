import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { GuildId } from "@/features/guilds/types";

import {
	assignReportTarget,
	bulkDismissReports,
	fetchModerationReports,
	fetchReportContext,
	fetchStaffModerators,
	resolveReport,
	submitModerationAppeal,
} from "../api";
import type {
	ModerationQueueFilters,
	ReportStatus,
	ReportTargetType,
	ResolveReportInput,
} from "../types";

export function useModerationReports(
	options?: ReportStatus | "all" | ModerationQueueFilters,
) {
	return useQuery({
		queryKey: ["moderation", "reports", options ?? "all"],
		queryFn: () => fetchModerationReports(options),
		refetchInterval: 10000,
	});
}

export function useReportContext(
	targetType: ReportTargetType | null | undefined,
	targetId: string | null | undefined,
	enabled = true,
) {
	return useQuery({
		queryKey: ["moderation", "context", targetType, targetId],
		queryFn: () =>
			fetchReportContext(
				targetType as ReportTargetType,
				targetId as string,
			),
		enabled: Boolean(enabled && targetType && targetId),
	});
}

export function useStaffModerators(guild?: GuildId | null, enabled = true) {
	return useQuery({
		queryKey: ["moderation", "staff", guild ?? "all"],
		queryFn: () => fetchStaffModerators(guild),
		enabled,
	});
}

export function useResolveReport() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: ResolveReportInput) => resolveReport(input),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["moderation", "reports"],
			});
			void queryClient.invalidateQueries({
				queryKey: ["moderation", "context"],
			});
			void queryClient.invalidateQueries({
				queryKey: ["admin", "posts"],
			});
			void queryClient.invalidateQueries({
				queryKey: ["posts"],
			});
			void queryClient.invalidateQueries({
				queryKey: ["notifications"],
			});
		},
	});
}

export function useAssignReportTarget() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			targetType,
			targetId,
			assigneeId,
		}: {
			targetType: ReportTargetType;
			targetId: string;
			assigneeId: string | null;
		}) => assignReportTarget(targetType, targetId, assigneeId),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["moderation", "reports"],
			});
		},
	});
}

export function useBulkDismissReports() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			reportIds,
			moderatorNote,
		}: {
			reportIds: string[];
			moderatorNote?: string;
		}) => bulkDismissReports(reportIds, moderatorNote),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["moderation", "reports"],
			});
			void queryClient.invalidateQueries({
				queryKey: ["moderation", "context"],
			});
			void queryClient.invalidateQueries({
				queryKey: ["notifications"],
			});
		},
	});
}

export function useSubmitAppeal() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			actionId,
			reason,
		}: {
			actionId: string;
			reason: string;
		}) => submitModerationAppeal(actionId, reason),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["moderation", "appeals"],
			});
			void queryClient.invalidateQueries({
				queryKey: ["notifications"],
			});
		},
	});
}
