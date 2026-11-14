import { Cpu, Palette, Radio } from "lucide-react-native";

import type { GuildId, GuildInfo } from "./types";

const GUILD_LOGOS = {
	octagram: require("../../../assets/guilds/octagram.svg"),
	chameleon: require("../../../assets/guilds/chameleon.svg"),
	blue_jays: require("../../../assets/guilds/bluejays.svg"),
};

const GUILDS: Record<GuildId, GuildInfo> = {
	octagram: {
		id: "octagram",
		name: "Octagram",
		tagline: "Developers & Coders",
		manifesto:
			"Building ideas through code, creating solutions through technology, and connecting people through innovation.",
		accentColor: "#00FF66",
		badgeBgColor: "bg-[#00FF66]",
		badgeTextColor: "text-foreground",
		logo: GUILD_LOGOS.octagram,
		houseNumber: "01",
		houseSymbol: "○",
		sector: "HARDWARE, SOFTWARE & NETWORKING",
		actionLabel: "[ ENTER TERMINAL ]",
		HeroIcon: Cpu,
	},
	chameleon: {
		id: "chameleon",
		name: "Chameleon",
		tagline: "GFX & Artists",
		manifesto:
			"Bringing ideas to life through creative designs, colorful visuals, and engaging media.",
		accentColor: "#FF007A",
		badgeBgColor: "bg-[#FF007A]",
		badgeTextColor: "text-primary-foreground",
		logo: GUILD_LOGOS.chameleon,
		houseNumber: "02",
		houseSymbol: "◆",
		sector: "3D, GFX & TYPOGRAPHY",
		actionLabel: "[ VIEW GALLERY ]",
		HeroIcon: Palette,
	},
	blue_jays: {
		id: "blue_jays",
		name: "Blue Jays",
		tagline: "Influencers & Media",
		manifesto:
			"Creating meaningful content, connecting people, and sharing stories that inspire.",
		accentColor: "#00E5FF",
		badgeBgColor: "bg-[#00E5FF]",
		badgeTextColor: "text-foreground",
		logo: GUILD_LOGOS.blue_jays,
		houseNumber: "03",
		houseSymbol: "❖",
		sector: "JOURNALISM & MEDIA",
		actionLabel: "[ TUNE IN ]",
		HeroIcon: Radio,
	},
};

const GUILDS_RECORD = GUILDS as Record<string, GuildInfo>;
GUILDS_RECORD["blue-jays"] = GUILDS.blue_jays;
GUILDS_RECORD["bluejays"] = GUILDS.blue_jays;
GUILDS_RECORD["octogram"] = GUILDS.octagram;

export const GUILD_LIST: GuildInfo[] = [
	GUILDS.octagram,
	GUILDS.chameleon,
	GUILDS.blue_jays,
];

export function getGuildInfo(guildId?: string | null): GuildInfo | null {
	if (!guildId || typeof guildId !== "string") return null;
	const normalized = guildId.replace("-", "_") as GuildId;
	return GUILDS[normalized] || GUILDS_RECORD[guildId] || null;
}
