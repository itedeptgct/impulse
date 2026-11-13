import type { ComponentType } from "react";

export type GuildId = "octagram" | "chameleon" | "blue_jays";

export interface GuildInfo {
	id: GuildId;
	name: string;
	tagline: string;
	manifesto: string;
	accentColor: string;
	badgeBgColor: string;
	badgeTextColor: string;
	logo: any;
	banner?: any;
	houseNumber?: string;
	houseSymbol?: string;
	sector?: string;
	actionLabel: string;
	HeroIcon: ComponentType<{
		size?: number;
		color?: string;
		strokeWidth?: number;
	}>;
}
