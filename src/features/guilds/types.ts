export type GuildId = "octagram" | "chameleon" | "blue_jays";

export interface GuildInfo {
	id: GuildId;
	name: string;
	tagline: string;
	badgeLabel: string;
	description: string;
	manifesto: string;
	accentColor: string;
	gradientBg: [string, string];
	badgeBorderColor: string;
	badgeBgColor: string;
	badgeTextColor: string;
	emblem: string;
	logo: any;
	badge: string;
	perks: string[];
	featured?: boolean;
	memberCount: string;
	activeTopics: string;
}
