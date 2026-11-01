import type { Post } from "../types";

/**
 * Filter posts by audience visibility for a specific user house affiliation.
 * Returns public posts plus posts belonging to the user's house.
 */
export function filterPostsForUser(
	posts: Post[],
	userGuild?: string | null,
): Post[] {
	return posts.filter((p) => {
		if (p.visibility === "house") {
			return Boolean(userGuild && p.guild === userGuild);
		}
		return true; // public
	});
}
