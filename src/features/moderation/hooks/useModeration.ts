import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchModerationReports, resolveReport } from "../api";
import type { ReportStatus } from "../types";

export function useModerationReports(status?: ReportStatus | "all") {
	return useQuery({
		queryKey: ["moderation", "reports", status],
		queryFn: () => fetchModerationReports(status),
		refetchInterval: 10000,
	});
}

export function useResolveReport() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			reportId,
			action,
		}: {
			reportId: string;
			action: "dismiss" | "remove_content";
		}) => resolveReport(reportId, action),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["moderation", "reports"],
			});
			void queryClient.invalidateQueries({
				queryKey: ["admin", "posts"],
			});
			void queryClient.invalidateQueries({
				queryKey: ["posts"],
			});
		},
	});
}
