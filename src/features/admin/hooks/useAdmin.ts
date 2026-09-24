import type { UserRole } from "@auth/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
	approveVerification,
	fetchAdminStats,
	fetchAdminUsers,
	fetchAdminVerifications,
	rejectVerification,
	updateUserRole,
} from "../api";
import type { VerificationFilter } from "../types";

export function useAdminStats() {
	return useQuery({
		queryKey: ["admin", "stats"],
		queryFn: fetchAdminStats,
		refetchInterval: 15000, // Poll every 15 seconds for real-time dashboard feel
	});
}

export function useAdminVerifications(
	filter: VerificationFilter = "all",
	search = "",
) {
	return useQuery({
		queryKey: ["admin", "verifications", filter, search],
		queryFn: () => fetchAdminVerifications(filter, search),
		refetchInterval: 10000,
	});
}

export function useAdminUsers(search = "", roleFilter?: string) {
	return useQuery({
		queryKey: ["admin", "users", search, roleFilter],
		queryFn: () => fetchAdminUsers(search, roleFilter),
	});
}

export function useApproveVerification() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			verificationId,
			adminId,
		}: {
			verificationId: string;
			adminId: string;
		}) => approveVerification(verificationId, adminId),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["admin"] });
		},
	});
}

export function useRejectVerification() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			verificationId,
			adminId,
			reason,
		}: {
			verificationId: string;
			adminId: string;
			reason: string;
		}) => rejectVerification(verificationId, adminId, reason),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["admin"] });
		},
	});
}

export function useUpdateUserRole() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
			updateUserRole(userId, role),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["admin"] });
		},
	});
}
