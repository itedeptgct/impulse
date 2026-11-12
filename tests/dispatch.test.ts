import { describe, expect, it } from "bun:test";
import type { Post } from "@/features/posts/types";

export function filterDispatches(
	posts: Post[],
	filter: "all" | "global" | "octagram" | "chameleon" | "blue_jays",
	eventsOnly: boolean,
) {
	return posts.filter((p) => {
		if (eventsOnly && !p.event_date) return false;
		if (filter === "all") return true;
		if (filter === "global") return p.guild === null;
		return p.guild === filter;
	});
}

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
			content: "Chameleon building sprint",
			post_type: "dispatch",
			guild: "chameleon",
			event_date: "2026-11-25",
			author_id: "u3",
			author: { id: "u3", username: "cham_lead" },
			visibility: "public",
			tags: [],
			upvotes_count: 5,
			downvotes_count: 0,
			comments_count: 2,
			created_at: "",
		},
		{
			id: "4",
			title: "Blue Jays Assembly",
			content: "Strategy session",
			post_type: "dispatch",
			guild: "blue_jays",
			event_date: null,
			author_id: "u4",
			author: { id: "u4", username: "bj_lead" },
			visibility: "public",
			tags: [],
			upvotes_count: 3,
			downvotes_count: 0,
			comments_count: 1,
			created_at: "",
		},
	];

	it("filters global dispatches", () => {
		expect(filterDispatches(sample, "global", false)).toHaveLength(1);
		expect(filterDispatches(sample, "global", false)[0].id).toBe("1");
	});

	it("filters events only", () => {
		const events = filterDispatches(sample, "all", true);
		expect(events).toHaveLength(2);
		expect(events.map((e) => e.id)).toEqual(["1", "3"]);
	});

	it("filters specific house dispatches", () => {
		const octagram = filterDispatches(sample, "octagram", false);
		expect(octagram).toHaveLength(1);
		expect(octagram[0].id).toBe("2");

		const chameleon = filterDispatches(sample, "chameleon", false);
		expect(chameleon).toHaveLength(1);
		expect(chameleon[0].id).toBe("3");

		const blueJays = filterDispatches(sample, "blue_jays", false);
		expect(blueJays).toHaveLength(1);
		expect(blueJays[0].id).toBe("4");
	});

	it("filters house events only", () => {
		const chamEvents = filterDispatches(sample, "chameleon", true);
		expect(chamEvents).toHaveLength(1);
		expect(chamEvents[0].id).toBe("3");

		const octEvents = filterDispatches(sample, "octagram", true);
		expect(octEvents).toHaveLength(0);
	});

	it("returns all dispatches when filter is all and eventsOnly is false", () => {
		expect(filterDispatches(sample, "all", false)).toHaveLength(4);
	});

	it("handles empty post list", () => {
		expect(filterDispatches([], "all", false)).toEqual([]);
		expect(filterDispatches([], "global", true)).toEqual([]);
	});
});
