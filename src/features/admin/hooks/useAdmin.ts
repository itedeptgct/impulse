import type { UserRole } from "@auth/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deletePost } from "@/features/posts/api";

import {
	approveVerification,
	fetchAdminPosts,
	fetchAdminStats,
	fetchAdminUsers,
	fetchAdminVerifications,
	rejectVerification,
	updateUserRole,
} from "../api";
import type { AdminPostVisibilityFilter, VerificationFilter } from "../types";

export function useAdminStats() {
	return useQuery({
		queryKey: ["admin", "stats"],
		queryFn: fetchAdminStats,
		refetchInterval: 15000,
	});
}

export function useAdminVerifications(
	filter: VerificationFilter = "all",
	search = "",
	limit = 50,
	offset = 0,
) {
	return useQuery({
		queryKey: ["admin", "verifications", filter, search, limit, offset],
		queryFn: () => fetchAdminVerifications(filter, search, limit, offset),
		refetchInterval: 10000,
	});
}

export function useAdminUsers(
	search = "",
	roleFilter?: string,
	limit = 50,
	offset = 0,
) {
	return useQuery({
		queryKey: ["admin", "users", search, roleFilter, limit, offset],
		queryFn: () => fetchAdminUsers(search, roleFilter, limit, offset),
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
			void queryClient.invalidateQueries({
				queryKey: ["admin", "verifications"],
			});
			void queryClient.invalidateQueries({
				queryKey: ["admin", "stats"],
			});
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
			void queryClient.invalidateQueries({
				queryKey: ["admin", "verifications"],
			});
			void queryClient.invalidateQueries({
				queryKey: ["admin", "stats"],
			});
		},
	});
}

export function useUpdateUserRole() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
			updateUserRole(userId, role),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["admin", "users"],
			});
			void queryClient.invalidateQueries({
				queryKey: ["admin", "stats"],
			});
		},
	});
}

export function useAdminPosts(
	search = "",
	visibilityFilter: AdminPostVisibilityFilter = "all",
) {
	return useQuery({
		queryKey: ["admin", "posts", search, visibilityFilter],
		queryFn: () => fetchAdminPosts(search, visibilityFilter),
	});
}

export function useDeleteAdminPost() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (postId: string) => deletePost(postId),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["admin", "posts"],
			});
			void queryClient.invalidateQueries({
				queryKey: ["admin", "stats"],
			});
		},
	});
}
