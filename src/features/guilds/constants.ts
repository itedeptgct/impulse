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
			"Quis exercitation dolor sunt laboris ex excepteur reprehenderit excepteur exercitation et.",
		accentColor: "#00FF66",
		badgeBgColor: "bg-[#00FF66]",
		badgeTextColor: "text-foreground",
		logo: GUILD_LOGOS.octagram,
		houseNumber: "01",
		houseSymbol: "○",
		sector: "HARDWARE, SOFTWARE & NETWORKING",
		actionLabel: "[ ENTER TERMINAL ]",
		HeroIcon: Cpu,
		metrics: {
			col1Label: "ACTIVE NODES",
			col1Val: "TBD",
			col1Sub: "DEVS ONLINE",
			col1SubColor: "#008033",
			col2Label: "REPO LOGS",
			col2Val: "TBD",
			col2Sub: "COMMITS",
		},
	},
	chameleon: {
		id: "chameleon",
		name: "Chameleon",
		tagline: "GFX & Artists",
		manifesto: "Magna irure veniam fugiat magna cillum deserunt.",
		accentColor: "#FF007A",
		badgeBgColor: "bg-[#FF007A]",
		badgeTextColor: "text-primary-foreground",
		logo: GUILD_LOGOS.chameleon,
		houseNumber: "02",
		houseSymbol: "◆",
		sector: "3D, GFX & TYPOGRAPHY",
		actionLabel: "[ VIEW GALLERY ]",
		HeroIcon: Palette,
		metrics: {
			col1Label: "CREATORS",
			col1Val: "TBD",
			col1Sub: "ARTISTS IN HUB",
			col1SubColor: "#FF007A",
			col2Label: "EXHIBITS",
			col2Val: "TBD",
			col2Sub: "CURATED LIVE",
		},
	},
	blue_jays: {
		id: "blue_jays",
		name: "Blue Jays",
		tagline: "Influencers & Media",
		manifesto:
			"Minim do veniam exercitation irure proident reprehenderit ipsum.",
		accentColor: "#00E5FF",
		badgeBgColor: "bg-[#00E5FF]",
		badgeTextColor: "text-foreground",
		logo: GUILD_LOGOS.blue_jays,
		houseNumber: "03",
		houseSymbol: "❖",
		sector: "JOURNALISM & MEDIA",
		actionLabel: "[ TUNE IN ]",
		HeroIcon: Radio,
		metrics: {
			col1Label: "PRODUCERS",
			col1Val: "TBD",
			col1Sub: "ON RECORD",
			col1SubColor: "#4c4546",
			col2Label: "LISTENERS",
			col2Val: "TBD",
			col2Sub: "WEEKLY AVG",
		},
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
