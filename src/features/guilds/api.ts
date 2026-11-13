import { supabase } from "@/lib/supabase";

import type { GuildId } from "./types";

export interface GuildMetricsCounts {
	users: number;
	posts: number;
}

export async function fetchGuildMetrics(
	guild: GuildId,
): Promise<GuildMetricsCounts> {
	const [usersResult, postsResult] = await Promise.all([
		supabase
			.from("profiles")
			.select("id", { count: "exact", head: true })
			.eq("guild", guild),
		supabase
			.from("posts")
			.select("id", { count: "exact", head: true })
			.eq("guild", guild),
	]);

	if (usersResult.error) throw usersResult.error;
	if (postsResult.error) throw postsResult.error;

	return {
		users: usersResult.count ?? 0,
		posts: postsResult.count ?? 0,
	};
}
