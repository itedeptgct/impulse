import type { GuildId } from "@/features/guilds/types";

import type { UserRole } from "./types";

export function canManagePost(
	post: { author_id: string; guild?: GuildId | null },
	userId?: string | null,
	userRole?: UserRole | (string & {}) | null,
	userGuild?: GuildId | null,
): boolean {
	if (!userId) return false;
	if (post.author_id === userId) return true;
	if (userRole === "admin" || userRole === "mod") return true;
	if (userRole === "house_mod") {
		return Boolean(post.guild && userGuild && post.guild === userGuild);
	}
	return false;
}

export function canCreateDispatch(
	userRole?: UserRole | (string & {}) | null,
	userGuild?: GuildId | null,
	targetGuild?: GuildId | null,
): boolean {
	if (userRole === "admin" || userRole === "mod") return true;
	if (userRole === "house_mod") {
		return Boolean(targetGuild && userGuild && targetGuild === userGuild);
	}
	return false;
}

export function canSwitchGuild(
	userRole?: UserRole | (string & {}) | null,
): boolean {
	return userRole !== "house_mod";
}
