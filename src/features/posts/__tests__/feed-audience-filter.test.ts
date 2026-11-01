import type { Post } from "../types.ts";
import { filterPostsForUser } from "../utils/filter.ts";

export function testAudienceFilter() {
	const posts: Partial<Post>[] = [
		{ id: "1", visibility: "public", guild: "octagram" },
		{ id: "2", visibility: "house", guild: "octagram" },
		{ id: "3", visibility: "house", guild: "chameleon" },
		{ id: "4", visibility: "public", guild: null },
	];

	// Octagram user feed should see: 1 (public octagram), 2 (house octagram), 4 (public)
	// and MUST NOT see: 3 (house chameleon)
	const octagramUserFeed = filterPostsForUser(posts as Post[], "octagram");
	const postIds = octagramUserFeed.map((p) => p.id);

	if (
		!postIds.includes("1") ||
		!postIds.includes("2") ||
		!postIds.includes("4") ||
		postIds.includes("3")
	) {
		throw new Error(
			`Feed leaked cross-house post or missed public post: ${JSON.stringify(postIds)}`,
		);
	}

	// User without house should only see public posts (1, 4)
	const unassignedFeed = filterPostsForUser(posts as Post[], null);
	const unassignedIds = unassignedFeed.map((p) => p.id);
	if (
		!unassignedIds.includes("1") ||
		!unassignedIds.includes("4") ||
		unassignedIds.includes("2") ||
		unassignedIds.includes("3")
	) {
		throw new Error(
			`Unassigned user saw house-only posts: ${JSON.stringify(unassignedIds)}`,
		);
	}

	console.log("Audience filter test passed!");
}

testAudienceFilter();
