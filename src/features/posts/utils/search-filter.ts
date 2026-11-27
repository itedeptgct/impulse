import type { Post } from "../types";
import { filterPostsForUser, normalizePostTags } from "./filter";

export function formatHashtag(tag: string): string {
	const clean = tag.trim().replace(/^#+/, "").toUpperCase();
	return clean ? `#${clean}` : "";
}

export function buildPostSearchOrFilter(query: string): string {
	const safeIlike = query
		.trim()
		.replace(/[,()"'{}]/g, " ")
		.trim();
	const clauses = [
		`title.ilike.%${safeIlike}%`,
		`content.ilike.%${safeIlike}%`,
	];

	const rawTag = query
		.trim()
		.replace(/^#+/, "")
		.replace(/[^a-zA-Z0-9_-]/g, "");
	if (rawTag.length > 0) {
		const upper = rawTag.toUpperCase();
		const lower = rawTag.toLowerCase();
		const candidates = Array.from(
			new Set([`#${upper}`, upper, `#${lower}`, lower]),
		);
		const quoted = candidates.map((c) => `"${c}"`).join(",");
		clauses.push(`tags.ov.{${quoted}}`);
	}

	return clauses.join(",");
}

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
