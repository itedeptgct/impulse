import type { NeoBadgeVariant } from "@/components/ui";
import type { UserRole } from "@/features/auth/types";
import type { GuildId } from "@/features/guilds/types";

export type BadgeTierId =
	| "admin"
	| "mod"
	| "house_mod"
	| "verified"
	| "house_member";

export interface UserBadgeInfo {
	id: BadgeTierId;
	label: string;
	variant: NeoBadgeVariant;
	colorHex: string;
	iconName: "ShieldCheck" | "Shield" | "Award" | "CheckCircle2" | "Building2";
}

export interface BadgeResolverParams {
	role?: UserRole | (string & {}) | null;
	isVerified?: boolean | null;
	guild?: GuildId | (string & {}) | null;
}

interface HouseBadgeMetadata {
	label: string;
	colorHex: string;
	variant: NeoBadgeVariant;
}

const HOUSE_METADATA: Record<string, HouseBadgeMetadata> = {
	octagram: { label: "0x", colorHex: "#FFFFFF", variant: "primary" },
	octogram: { label: "0x", colorHex: "#FFFFFF", variant: "primary" },
	chameleon: { label: "RGB", colorHex: "#000000", variant: "green" },
	blue_jays: { label: "PRESS", colorHex: "#000000", variant: "cyan" },
	"blue-jays": { label: "PRESS", colorHex: "#000000", variant: "cyan" },
	bluejays: { label: "PRESS", colorHex: "#000000", variant: "cyan" },
};

function normalizeGuild(guild: string): string {
	return guild.toLowerCase().trim().replace("-", "_");
}

export function getAllBadges(params: BadgeResolverParams): UserBadgeInfo[] {
	const badges: UserBadgeInfo[] = [];

	if (params.role === "admin") {
		badges.push({
			id: "admin",
			label: "ADMIN",
			variant: "primary",
			colorHex: "#ff2a00",
			iconName: "ShieldCheck",
		});
	} else if (params.role === "mod") {
		badges.push({
			id: "mod",
			label: "MOD",
			variant: "primary",
			colorHex: "#8b5cf6",
			iconName: "Shield",
		});
	} else if (params.role === "house_mod") {
		const normalized = params.guild
			? normalizeGuild(String(params.guild))
			: null;
		let colorHex = "#f59e0b"; // Octagram amber/gold
		if (normalized === "chameleon") {
			colorHex = "#ff007a";
		} else if (normalized === "blue_jays") {
			colorHex = "#10b981";
		}

		badges.push({
			id: "house_mod",
			label: "HOUSE MOD",
			variant: "default",
			colorHex,
			iconName: "Award",
		});
	}

	if (params.isVerified) {
		badges.push({
			id: "verified",
			label: "VERIFIED",
			variant: "outline",
			colorHex: "#00E599",
			iconName: "CheckCircle2",
		});
	}

	if (params.guild) {
		const normalized = normalizeGuild(String(params.guild));
		const metadata = HOUSE_METADATA[normalized] ?? {
			label: String(params.guild).toUpperCase(),
			colorHex: "#000000",
			variant: "outline" as const,
		};

		badges.push({
			id: "house_member",
			label: metadata.label,
			variant: metadata.variant,
			colorHex: metadata.colorHex,
			iconName: "Building2",
		});
	}

	return badges;
}

export function getHighestBadge(
	params: BadgeResolverParams,
): UserBadgeInfo | null {
	const badges = getAllBadges(params);
	return badges[0] ?? null;
}
