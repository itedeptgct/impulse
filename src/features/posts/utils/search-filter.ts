import type { Post } from "../types";
import { filterPostsForUser, normalizePostTags } from "./filter";

export function filterPostsByQuery(
	posts: Post[],
	query: string,
	userGuild?: string | null,
	userId?: string,
	isAdmin?: boolean,
): Post[] {
	const normalized = query.trim().toLowerCase();
	if (!normalized) {
		return [];
	}

	const accessiblePosts = filterPostsForUser(
		posts,
		userGuild,
		userId,
		isAdmin,
	);
	const cleanTagQuery = normalized.replace(/^#*/, "");

	return accessiblePosts.filter((post) => {
		const matchTitle = post.title.toLowerCase().includes(normalized);
		const matchContent = post.content.toLowerCase().includes(normalized);
		const matchAuthor =
			post.author?.username?.toLowerCase().includes(normalized) ||
			post.author?.display_name?.toLowerCase().includes(normalized);
		const tags = normalizePostTags(post.tags);
		const matchTags = tags.some((tag) =>
			tag.toLowerCase().replace(/^#*/, "").includes(cleanTagQuery),
		);
		return matchTitle || matchContent || matchAuthor || matchTags;
	});
}
