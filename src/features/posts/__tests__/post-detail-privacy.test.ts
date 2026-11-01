import type { Post } from "../types.ts";
import { isPostRestricted } from "../utils/filter.ts";

export function testPostDetailPrivacy() {
	const publicPost: Partial<Post> = {
		id: "p1",
		author_id: "author-123",
		visibility: "public",
		guild: "octagram",
	};

	const housePost: Partial<Post> = {
		id: "p2",
		author_id: "author-123",
		visibility: "house",
		guild: "octagram",
	};

	const hyphenGuildPost: Partial<Post> = {
		id: "p3",
		author_id: "author-456",
		visibility: "house",
		guild: "blue-jays" as any,
	};

	// 1. Public post should be accessible to everyone (authenticated or guest)
	if (isPostRestricted(publicPost as Post, undefined, undefined)) {
		throw new Error("Guest should be able to view public post");
	}
	if (isPostRestricted(publicPost as Post, "random-user", "chameleon")) {
		throw new Error(
			"Different house member should be able to view public post",
		);
	}

	// 2. House post should be accessible to the author regardless of active guild
	if (isPostRestricted(housePost as Post, "author-123", null)) {
		throw new Error(
			"Author should always be able to view their own house post",
		);
	}
	if (isPostRestricted(housePost as Post, "author-123", "chameleon")) {
		throw new Error(
			"Author should be able to view even if affiliated with different house",
		);
	}

	// 3. House post should be accessible to members of the same house
	if (isPostRestricted(housePost as Post, "other-user", "octagram")) {
		throw new Error("Same house member should be able to view house post");
	}

	// 4. House post should be restricted from guests or members of other houses
	if (!isPostRestricted(housePost as Post, undefined, undefined)) {
		throw new Error("Guest must not view house post");
	}
	if (!isPostRestricted(housePost as Post, "other-user", null)) {
		throw new Error("Unassigned user must not view house post");
	}
	if (!isPostRestricted(housePost as Post, "other-user", "chameleon")) {
		throw new Error("Different house member must not view house post");
	}

	// 5. Hyphen and underscore house names should match interchangeably
	if (isPostRestricted(hyphenGuildPost as Post, "member-1", "blue_jays")) {
		throw new Error("blue_jays user should be able to view blue-jays post");
	}
	if (isPostRestricted(hyphenGuildPost as Post, "member-2", "Blue-Jays")) {
		throw new Error(
			"Case-insensitive match should work for house clearance",
		);
	}

	console.log("Post detail privacy test passed!");
}

testPostDetailPrivacy();
