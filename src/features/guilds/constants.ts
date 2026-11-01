import type { GuildId, GuildInfo } from "./types";

export const GUILD_LOGOS = {
	octagram: require("../../../assets/guilds/octagram.svg"),
	chameleon: require("../../../assets/guilds/chameleon.svg"),
	blue_jays: require("../../../assets/guilds/bluejays.svg"),
};

export const GUILDS: Record<GuildId, GuildInfo> = {
	octagram: {
		id: "octagram",
		name: "Octogram",
		tagline: "Developers & Coders",
		badgeLabel: "Octogram",
		description:
			"The developers and coders building resilient software, tools, and computing infrastructure.",
		manifesto:
			"We turn hard problems into durable systems. From product code and tooling to systems engineering, we build with relentless technical precision.",
		accentColor: "#91e6b1", // Neon Signal Mint
		gradientBg: ["#0a2f1c", "#0a0a0c"],
		badgeBorderColor: "border-primary/40",
		badgeBgColor: "bg-primary/15",
		badgeTextColor: "text-primary",
		emblem: "Terminal",
		logo: GUILD_LOGOS.octagram,
		badge: "DEVELOPERS & CODERS",
		featured: false,
		memberCount: "",
		activeTopics: "",
		perks: ["Lorem Ipsum", "Dolor Sit Amet", "perk 3", "perk 4"],
	},
	chameleon: {
		id: "chameleon",
		name: "Chameleon",
		tagline: "GFX & Artists",
		badgeLabel: "Chameleon",
		description:
			"The artists, GFX designers, and visual creators shaping vivid digital worlds.",
		manifesto:
			"We make ideas visible. Through illustration, GFX, motion, 3D, and expressive interfaces, we turn creative direction into memorable digital work.",
		accentColor: "#a78bfa", // Purple Accent
		gradientBg: ["#3b0764", "#0a0a0c"],
		badgeBorderColor: "border-purple-400/40",
		badgeBgColor: "bg-purple-500/15",
		badgeTextColor: "text-purple-300",
		emblem: "Palette",
		logo: GUILD_LOGOS.chameleon,
		badge: "GFX & ARTISTS",
		featured: false,
		memberCount: "",
		activeTopics: "920 posts",
		perks: ["Lorem Ipsum", "Dolor Sit Amet", "perk 3", "perk 4"],
	},
	blue_jays: {
		id: "blue_jays",
		name: "Blue Jays",
		tagline: "Influencers & Media",
		badgeLabel: "Blue Jays",
		description:
			"The influencers, content creators, and media makers shaping conversations across campus and beyond.",
		manifesto:
			"Reach is a craft. We build thoughtful campaigns, sharp editorial voices, and media that moves people to participate.",
		accentColor: "#38bdf8", // Sky Accent
		gradientBg: ["#082f49", "#0a0a0c"],
		badgeBorderColor: "border-sky-400/40",
		badgeBgColor: "bg-sky-500/15",
		badgeTextColor: "text-sky-300",
		emblem: "Radio",
		logo: GUILD_LOGOS.blue_jays,
		badge: "INFLUENCERS & MEDIA",
		featured: false,
		memberCount: "",
		activeTopics: "1.5k posts",
		perks: ["Lorem Ipsum", "Dolor Sit Amet", "perk 3", "perk 4"],
	},
};

// Backwards-compatible lookup with hyphen and spelling aliases
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
