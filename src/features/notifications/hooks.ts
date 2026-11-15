import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

import {
	DEFAULT_NOTIFICATION_PREFERENCES,
	fetchNotificationPreferences,
	fetchNotifications,
	fetchUnreadNotificationCount,
	markAllNotificationsRead,
	markNotificationRead,
	updateNotificationPreferences,
} from "./api";
import type {
	NotificationItem,
	NotificationPreferences,
	NotificationPreferencesPatch,
} from "./types";

export const notificationKeys = {
	all: ["notifications"] as const,
	list: (userId?: string | null) =>
		["notifications", "list", userId] as const,
	unreadCount: (userId?: string | null) =>
		["notifications", "unread-count", userId] as const,
	preferences: (userId?: string | null) =>
		["notifications", "preferences", userId] as const,
};

export function useNotifications(
	userId?: string | null,
	options?: { limit?: number; enabled?: boolean },
) {
	const limit = options?.limit ?? 25;
	const isEnabled = Boolean(userId) && (options?.enabled ?? true);

	return useInfiniteQuery({
		queryKey: notificationKeys.list(userId),
		queryFn: ({ pageParam }: { pageParam?: string }) => {
			if (!userId) return Promise.resolve([]);
			return fetchNotifications(userId, {
				limit,
				cursor: pageParam,
			});
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage: NotificationItem[]) => {
			if (!lastPage || lastPage.length < limit) {
				return undefined;
			}
			return lastPage[lastPage.length - 1]?.created_at;
		},
		enabled: isEnabled,
	});
}

export function useUnreadNotificationCount(userId?: string | null) {
	return useQuery({
		queryKey: notificationKeys.unreadCount(userId),
		queryFn: () => {
			if (!userId) return Promise.resolve(0);
			return fetchUnreadNotificationCount(userId);
		},
		enabled: Boolean(userId),
		refetchInterval: 30000,
	});
}

export function useMarkNotificationRead(userId?: string | null) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (notificationId: string) =>
			markNotificationRead(notificationId),
		onMutate: async (notificationId: string) => {
			const now = new Date().toISOString();
			if (userId) {
				await queryClient.cancelQueries({
					queryKey: notificationKeys.list(userId),
				});
				await queryClient.cancelQueries({
					queryKey: notificationKeys.unreadCount(userId),
				});

				queryClient.setQueryData(
					notificationKeys.unreadCount(userId),
					(oldCount: number | undefined) => {
						if (typeof oldCount !== "number") return oldCount;
						return Math.max(0, oldCount - 1);
					},
				);

				queryClient.setQueriesData(
					{ queryKey: notificationKeys.list(userId) },
					(old: unknown) => {
						if (!old || typeof old !== "object") return old;
						const record = old as Record<string, unknown>;
						if (Array.isArray(record.pages)) {
							return {
								...record,
								pages: record.pages.map((page: unknown) =>
									Array.isArray(page)
										? (page as NotificationItem[]).map(
												(item) =>
													item.id === notificationId
														? {
																...item,
																read_at:
																	item.read_at ??
																	now,
															}
														: item,
											)
										: page,
								),
							};
						}
						if (Array.isArray(old)) {
							return (old as NotificationItem[]).map((item) =>
								item.id === notificationId
									? { ...item, read_at: item.read_at ?? now }
									: item,
							);
						}
						return old;
					},
				);
			}
		},
		onSettled: () => {
			if (userId) {
				void queryClient.invalidateQueries({
					queryKey: notificationKeys.unreadCount(userId),
				});
				void queryClient.invalidateQueries({
					queryKey: notificationKeys.list(userId),
				});
			} else {
				void queryClient.invalidateQueries({
					queryKey: notificationKeys.all,
				});
			}
		},
	});
}

export function useMarkAllNotificationsRead(userId?: string | null) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => {
			if (!userId) {
				throw new Error(
					"User ID is required to mark all notifications read",
				);
			}
			return markAllNotificationsRead(userId);
		},
		onMutate: async () => {
			const now = new Date().toISOString();
			if (userId) {
				await queryClient.cancelQueries({
					queryKey: notificationKeys.list(userId),
				});
				await queryClient.cancelQueries({
					queryKey: notificationKeys.unreadCount(userId),
				});

				queryClient.setQueryData(
					notificationKeys.unreadCount(userId),
					0,
				);

				queryClient.setQueriesData(
					{ queryKey: notificationKeys.list(userId) },
					(old: unknown) => {
						if (!old || typeof old !== "object") return old;
						const record = old as Record<string, unknown>;
						if (Array.isArray(record.pages)) {
							return {
								...record,
								pages: record.pages.map((page: unknown) =>
									Array.isArray(page)
										? (page as NotificationItem[]).map(
												(item) =>
													item.read_at
														? item
														: {
																...item,
																read_at: now,
															},
											)
										: page,
								),
							};
						}
						if (Array.isArray(old)) {
							return (old as NotificationItem[]).map((item) =>
								item.read_at ? item : { ...item, read_at: now },
							);
						}
						return old;
					},
				);
			}
		},
		onSettled: () => {
			if (userId) {
				void queryClient.invalidateQueries({
					queryKey: notificationKeys.unreadCount(userId),
				});
				void queryClient.invalidateQueries({
					queryKey: notificationKeys.list(userId),
				});
			} else {
				void queryClient.invalidateQueries({
					queryKey: notificationKeys.all,
				});
			}
		},
	});
}

export function useNotificationPreferences(userId?: string | null) {
	return useQuery({
		queryKey: notificationKeys.preferences(userId),
		queryFn: () => {
			if (!userId) {
				return Promise.resolve({
					user_id: "",
					...DEFAULT_NOTIFICATION_PREFERENCES,
					updated_at: new Date().toISOString(),
				});
			}
			return fetchNotificationPreferences(userId);
		},
		enabled: Boolean(userId),
	});
}

export function useUpdateNotificationPreferences(userId?: string | null) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (patch: NotificationPreferencesPatch) => {
			if (!userId) {
				throw new Error(
					"User ID is required to update notification preferences",
				);
			}
			return updateNotificationPreferences(userId, patch);
		},
		onMutate: async (patch) => {
			if (!userId) return;
			await queryClient.cancelQueries({
				queryKey: notificationKeys.preferences(userId),
			});
			const previous = queryClient.getQueryData<NotificationPreferences>(
				notificationKeys.preferences(userId),
			);
			if (previous) {
				queryClient.setQueryData<NotificationPreferences>(
					notificationKeys.preferences(userId),
					{
						...previous,
						...patch,
						updated_at: new Date().toISOString(),
					},
				);
			}
			return { previous };
		},
		onError: (_err, _variables, context) => {
			if (userId && context?.previous) {
				queryClient.setQueryData(
					notificationKeys.preferences(userId),
					context.previous,
				);
			}
		},
		onSettled: () => {
			if (userId) {
				void queryClient.invalidateQueries({
					queryKey: notificationKeys.preferences(userId),
				});
			}
		},
	});
}

export function useNotificationRealtime(userId?: string | null) {
	const queryClient = useQueryClient();

	useEffect(() => {
		if (!isSupabaseConfigured || !userId) {
			return;
		}

		const channel = supabase
			.channel(`notifications:${userId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "notifications",
					filter: `recipient_id=eq.${userId}`,
				},
				() => {
					void queryClient.invalidateQueries({
						queryKey: notificationKeys.list(userId),
					});
					void queryClient.invalidateQueries({
						queryKey: notificationKeys.unreadCount(userId),
					});
				},
			)
			.subscribe();

		return () => {
			void supabase.removeChannel(channel);
		};
	}, [userId, queryClient]);
}
