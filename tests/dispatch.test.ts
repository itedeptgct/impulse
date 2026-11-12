import { describe, expect, it } from "bun:test";
import { filterDispatches } from "@/features/dispatch/utils/filter";
import type { Post } from "@/features/posts/types";

describe("Dispatch Filtering", () => {
	const sample: Post[] = [
		{
			id: "1",
			title: "Campus Gala",
			content: "Details",
			post_type: "dispatch",
			guild: null,
			event_date: "2026-11-20",
			author_id: "u1",
			author: { id: "u1", username: "admin" },
			visibility: "public",
			tags: [],
			upvotes_count: 0,
			downvotes_count: 0,
			comments_count: 0,
			created_at: "",
		},
		{
			id: "2",
			title: "Octagram Meet",
			content: "Details",
			post_type: "dispatch",
			guild: "octagram",
			event_date: null,
			author_id: "u2",
			author: { id: "u2", username: "mod1" },
			visibility: "public",
			tags: [],
			upvotes_count: 0,
			downvotes_count: 0,
			comments_count: 0,
			created_at: "",
		},
		{
			id: "3",
			title: "Chameleon Hackathon",
			content: "Details",
			post_type: "dispatch",
			guild: "chameleon",
			event_date: "2026-11-25",
			author_id: "u3",
			author: { id: "u3", username: "mod2" },
			visibility: "public",
			tags: [],
			upvotes_count: 0,
			downvotes_count: 0,
			comments_count: 0,
			created_at: "",
		},
	];

	it("filters global dispatches", () => {
		expect(filterDispatches(sample, "global", false)).toHaveLength(1);
		expect(filterDispatches(sample, "global", false)[0]?.id).toBe("1");
	});

	it("filters events only", () => {
		expect(filterDispatches(sample, "all", true)).toHaveLength(2);
		expect(filterDispatches(sample, "all", true).map((p) => p.id)).toEqual([
			"1",
			"3",
		]);
	});

	it("filters specific house dispatches", () => {
		expect(filterDispatches(sample, "octagram", false)).toHaveLength(1);
		expect(filterDispatches(sample, "octagram", false)[0]?.id).toBe("2");
	});

	it("filters house events only", () => {
		expect(filterDispatches(sample, "chameleon", true)).toHaveLength(1);
		expect(filterDispatches(sample, "chameleon", true)[0]?.id).toBe("3");
		expect(filterDispatches(sample, "octagram", true)).toHaveLength(0);
	});

	it("returns all dispatches when filter is all and eventsOnly is false", () => {
		expect(filterDispatches(sample, "all", false)).toHaveLength(3);
	});

	it("handles empty post list", () => {
		expect(filterDispatches([], "all", false)).toHaveLength(0);
	});
});
