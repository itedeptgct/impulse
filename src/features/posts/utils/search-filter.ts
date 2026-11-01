import type { Post } from "../types";
import { filterPostsForUser } from "./filter.ts";

/**
 * Filter posts by a search term, matching against title, content, or tags,
 * while strictly observing house audience boundaries.
 */
export function filterPostsByQuery(
	posts: Post[],
	query: string,
	userGuild?: string | null,
): Post[] {
	const normalized = query.trim().toLowerCase();
	if (!normalized) {
		return [];
	}

	// 1. Audience filter first
	const accessiblePosts = filterPostsForUser(posts, userGuild);

	// 2. Search match
	return accessiblePosts.filter((post) => {
		const matchTitle = post.title.toLowerCase().includes(normalized);
		const matchContent = post.content.toLowerCase().includes(normalized);
		const matchTags =
			post.tags &&
			post.tags.some((tag) =>
				tag.toLowerCase().includes(normalized.replace(/^#*/, "")),
			);
		return matchTitle || matchContent || matchTags;
	});
}
