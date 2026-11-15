import { Text, View } from "react-native";

import { getGuildInfo } from "../constants";

export interface GuildBadgeProps {
	guildId: string;
	size?: "sm" | "md" | "lg";
	showTagline?: boolean;
	useLogo?: boolean;
	className?: string;
}

export function GuildBadge({
	guildId,
	size = "sm",
	showTagline = false,
	className = "",
}: GuildBadgeProps) {
	const info = getGuildInfo(guildId);
	if (!info) return null;

	const symbol =
		info.houseSymbol ||
		(info.id === "octagram" ? "0x" : info.id === "chameleon" ? "★" : "BJ");

	if (size === "lg") {
		return (
			<View
				className={`flex-row items-center gap-1.5 rounded-none border-2 border-border px-2.5 py-1 ${info.badgeBgColor} shadow-neo-sm ${className}`}>
				<Text
					className={`font-bold text-xs tracking-wider uppercase ${info.badgeTextColor}`}>
					{symbol}
				</Text>
				{showTagline && info.tagline ? (
					<Text className="ml-1 font-mono text-[10px] text-foreground/70">
						// {info.tagline}
					</Text>
				) : null}
			</View>
		);
	}

	if (size === "md") {
		return (
			<View
				className={`flex-row items-center justify-center rounded-none border-2 border-border px-2 py-0.5 ${info.badgeBgColor} shadow-neo-xs ${className}`}>
				<Text
					className={`font-bold text-xs tracking-wider uppercase ${info.badgeTextColor}`}>
					{symbol}
				</Text>
			</View>
		);
	}

	return (
		<View
			className={`flex-row items-center justify-center rounded-none border border-border px-1.5 py-0.5 ${info.badgeBgColor} ${className}`}>
			<Text
				className={`font-bold text-[10px] tracking-wider uppercase ${info.badgeTextColor}`}>
				{symbol}
			</Text>
		</View>
	);
}
