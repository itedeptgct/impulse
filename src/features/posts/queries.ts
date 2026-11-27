import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";

import { queryClient } from "@/lib/queryClient";

import { fetchFeedPosts } from "./api";
import type { FeedGuildFilter, FeedSort, PaginatedPosts, Post } from "./types";
import {
	flattenUniquePosts,
	patchPostInInfinitePages,
	removePostFromInfinitePages,
	replacePostInInfinitePages,
} from "./utils/feed-cache";

export {
	flattenUniquePosts,
	patchPostInInfinitePages,
	removePostFromInfinitePages,
	replacePostInInfinitePages,
};

export const postKeys = {
	all: ["posts"] as const,
	feeds: () => ["posts", "feed"] as const,
	feed: (
		filter: FeedGuildFilter,
		sort: FeedSort,
		userId?: string,
		profileGuild?: string | null,
		isAdmin?: boolean,
	) =>
		[
			"posts",
			"feed",
			filter,
			sort,
			userId ?? "anon",
			profileGuild ?? "none",
			Boolean(isAdmin),
		] as const,
};

export interface UseFeedPostsQueryParams {
	filter: FeedGuildFilter;
	sort: FeedSort;
	userId?: string;
	profileGuild?: string | null;
	isAdmin: boolean;
	pageSize?: number;
}

export function useFeedPostsQuery({
	filter,
	sort,
	userId,
	profileGuild,
	isAdmin,
	pageSize = 20,
}: UseFeedPostsQueryParams) {
	return useInfiniteQuery<
		PaginatedPosts,
		Error,
		InfiniteData<PaginatedPosts>,
		ReturnType<typeof postKeys.feed>,
		number
	>({
		queryKey: postKeys.feed(filter, sort, userId, profileGuild, isAdmin),
		enabled: Boolean(userId),
		initialPageParam: 0,
		queryFn: async ({ pageParam }) => {
			const feedResult = await fetchFeedPosts(
				filter,
				sort,
				userId,
				profileGuild ?? undefined,
				isAdmin,
				pageSize,
				pageParam,
			);
			const visibleItems =
				filter === "all"
					? feedResult.items.filter(
							(post) =>
								!(
									post.visibility === "house" &&
									post.author_id === userId
								),
						)
					: feedResult.items;
			return {
				...feedResult,
				items: visibleItems,
			};
		},
		getNextPageParam: (lastPage) =>
			lastPage.hasMore && lastPage.nextOffset !== null
				? lastPage.nextOffset
				: undefined,
	});
}

export function patchPostInFeedCaches(postId: string, patch: Partial<Post>) {
	queryClient.setQueriesData<InfiniteData<PaginatedPosts>>(
		{ queryKey: postKeys.feeds() },
		(old) => patchPostInInfinitePages(old, postId, patch),
	);
}

export function replacePostInFeedCaches(updated: Post) {
	queryClient.setQueriesData<InfiniteData<PaginatedPosts>>(
		{ queryKey: postKeys.feeds() },
		(old) => replacePostInInfinitePages(old, updated),
	);
}

export function removePostFromFeedCaches(postId: string) {
	queryClient.setQueriesData<InfiniteData<PaginatedPosts>>(
		{ queryKey: postKeys.feeds() },
		(old) => removePostFromInfinitePages(old, postId),
	);
}

export function invalidateFeedCaches() {
	return queryClient.invalidateQueries({ queryKey: postKeys.feeds() });
}
