import type { Post } from "@/features/posts/types";

export type DispatchFilterType =
	| "all"
	| "global"
	| "my_house"
	| "octagram"
	| "chameleon"
	| "blue_jays";

export function filterDispatches(
	posts: Post[],
	filter: DispatchFilterType,
	eventsOnly: boolean,
	userGuild?: string | null,
): Post[] {
	return posts.filter((p) => {
		if (eventsOnly && !p.event_date) return false;
		if (filter === "all") return true;
		if (filter === "global") return p.guild === null;
		if (filter === "my_house") return userGuild ? p.guild === userGuild : true;
		return p.guild === filter;
	});
}
