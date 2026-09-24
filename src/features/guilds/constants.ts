import type { GuildId, GuildInfo } from "./types";

export const GUILD_LOGOS = {
	octagram: require("../../../assets/guilds/octagram.svg"),
	chameleon: require("../../../assets/guilds/chameleon.svg"),
	blue_jays: require("../../../assets/guilds/bluejays.svg"),
};

export const GUILDS: Record<GuildId, GuildInfo> = {
	octagram: {
		id: "octagram",
		name: "Octagram",
		tagline: "Software Developers & Hackers",
		badgeLabel: "Octagram",
		description:
			"The digital architects, competitive programmers, and security researchers forging system infrastructure.",
		manifesto:
			"We write the code that powers the world. From low-level memory optimizations to distributed cloud services and cyber defense, we engineer solutions through logic and execution.",
		accentColor: "#10b981", // Emerald
		gradientBg: ["#064e3b", "#022c22"],
		badgeBorderColor: "border-emerald-500/30",
		badgeBgColor: "bg-emerald-500/10",
		badgeTextColor: "text-emerald-400",
		emblem: "Terminal",
		logo: GUILD_LOGOS.octagram,
		badge: "SOFTWARE DEVELOPERS",
		featured: false,
		perks: [
			"whn I was a",
			"a young boy, my father",
			"took me into the city to see a marching band",
			'he said, "son, when you grow up, would you be the savior of the broken, the beaten and the damned?"',
		],
		skills: [
			"Systems Dev",
			"Web & Mobile",
			"Cybersecurity",
			"Algorithms",
			"Backend",
		],
		topics: [
			"#algorithms",
			"#webdev",
			"#cybersecurity",
			"#rust",
			"#systemdesign",
		],
	},
	chameleon: {
		id: "chameleon",
		name: "Chameleon",
		tagline: "GFX Artists & UI/UX Designers",
		badgeLabel: "Chameleon",
		description:
			"The visual visionaries, product designers, and 3D animators breathing life into digital interaction.",
		manifesto:
			"Every system needs a soul. We bridge human perception and technical function through typography, tactile motion, 3D rendering, and aesthetic discipline.",
		accentColor: "#ec4899", // Fuchsia / Pink
		gradientBg: ["#701a75", "#4a044e"],
		badgeBorderColor: "border-pink-500/30",
		badgeBgColor: "bg-pink-500/10",
		badgeTextColor: "text-pink-400",
		emblem: "Palette",
		logo: GUILD_LOGOS.chameleon,
		badge: "GRAPHIC & VISUAL ARTISTS",
		featured: false,
		perks: ["this", "needs", "to be", "filled up"],
		skills: [
			"UI/UX Design",
			"3D Blender",
			"Motion & Animation",
			"Brand Identity",
			"Figma",
		],
		topics: [
			"#uidesign",
			"#3drender",
			"#designsystems",
			"#motion",
			"#typography",
		],
	},
	blue_jays: {
		id: "blue_jays",
		name: "Blue Jays",
		tagline: "Social & Community Champions",
		badgeLabel: "Blue Jays",
		description:
			"The community builders, event organizers, and student advocates driving campus tech culture.",
		manifesto:
			"Code means nothing without the humans behind it. We rally hackathon teams, curate campus tech lore, mentor peers, and ensure no student builds in isolation.",
		accentColor: "#3b82f6", // Royal Blue
		gradientBg: ["#1e3a8a", "#172554"],
		badgeBorderColor: "border-sky-500/30",
		badgeBgColor: "bg-sky-500/10",
		badgeTextColor: "text-sky-400",
		emblem: "Users",
		logo: GUILD_LOGOS.blue_jays,
		badge: "SOCIAL & COMMUNITY",
		featured: false,
		perks: ["with actual", "perks", "for each faction"],
		skills: [
			"Community Management",
			"Event Organizing",
			"Tech Evangelism",
			"Mentorship",
			"Content",
		],
		topics: [
			"#campusculture",
			"#hackathons",
			"#studygroup",
			"#careers",
			"#memes",
		],
	},
};

export const GUILD_LIST: GuildInfo[] = [
	GUILDS.octagram,
	GUILDS.chameleon,
	GUILDS.blue_jays,
];

export function getGuildInfo(guildId?: GuildId | null): GuildInfo | null {
	if (!guildId) return null;
	return GUILDS[guildId] || null;
}
