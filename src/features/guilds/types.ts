import type { ComponentType } from "react";

export type GuildId = "octagram" | "chameleon" | "blue_jays";

export interface GuildMetrics {
	col1Label: string;
	col1Val: string;
	col1Sub: string;
	col1SubColor: string;
	col2Label: string;
	col2Val: string;
	col2Sub: string;
}

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
	metrics: GuildMetrics;
}
