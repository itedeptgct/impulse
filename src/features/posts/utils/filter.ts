import type { Post } from "../types";

/**
 * Check if a post is restricted from being viewed by a user.
 * House-only transmissions can only be viewed by members of that house or the author.
 */
export function isPostRestricted(
	post: Pick<Post, "visibility" | "guild" | "author_id">,
	userId?: string,
	userGuild?: string | null,
): boolean {
	const isAuthor = Boolean(userId && post.author_id === userId);
	if (isAuthor) return false;

	if (post.visibility === "house") {
		const normPostGuild = (post.guild || "")
			.replace("-", "_")
			.toLowerCase();
		const normUserGuild = (userGuild || "").replace("-", "_").toLowerCase();
		return (
			!normUserGuild ||
			(Boolean(normPostGuild) && normPostGuild !== normUserGuild)
		);
	}

	return false;
}

/**
 * Filter posts by audience visibility for a specific user house affiliation.
 * Returns public posts plus posts belonging to the user's house, or all posts if author is viewing.
 */
export function filterPostsForUser(
	posts: Post[],
	userGuild?: string | null,
	userId?: string,
): Post[] {
	return posts.filter((p) => !isPostRestricted(p, userId, userGuild));
}
