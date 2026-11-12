import { Image } from "expo-image";
import { Code2, Palette, Radio, Terminal } from "lucide-react-native";
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
	useLogo = false,
	className = "",
}: GuildBadgeProps) {
	const info = getGuildInfo(guildId);
	if (!info) return null;

	const renderIcon = (iconSize: number) => {
		if (useLogo && info.logo) {
			return (
				<Image
					source={info.logo}
					style={{ width: iconSize + 2, height: iconSize + 2 }}
					contentFit="contain"
				/>
			);
		}
		const symbol = info.houseSymbol;
		if (symbol) {
			return (
				<Text
					className={`font-bold ${
						size === "lg"
							? "text-sm"
							: size === "md"
								? "text-xs"
								: "text-[10px]"
					} ${info.badgeTextColor}`}>
					{symbol}
				</Text>
			);
		}
		const normalizedId = info.id;
		switch (normalizedId) {
			case "octagram":
				return (
					<Code2
						size={iconSize}
						color={
							info.badgeTextColor.includes("white")
								? "#ffffff"
								: "#000000"
						}
						strokeWidth={2.5}
					/>
				);
			case "chameleon":
				return (
					<Palette
						size={iconSize}
						color={
							info.badgeTextColor.includes("white")
								? "#ffffff"
								: "#000000"
						}
						strokeWidth={2.5}
					/>
				);
			case "blue_jays":
				return (
					<Radio
						size={iconSize}
						color={
							info.badgeTextColor.includes("white")
								? "#ffffff"
								: "#000000"
						}
						strokeWidth={2.5}
					/>
				);
			default:
				return (
					<Terminal
						size={iconSize}
						color={
							info.badgeTextColor.includes("white")
								? "#ffffff"
								: "#000000"
						}
						strokeWidth={2.5}
					/>
				);
		}
	};

	if (size === "lg") {
		return (
			<View
				className={`flex-row items-center gap-2 rounded-none border-2 border-border px-2.5 py-1 ${info.badgeBgColor} shadow-neo-sm ${className}`}>
				<Text className={`font-bold text-xs ${info.badgeTextColor}`}>
					[
				</Text>
				{renderIcon(14)}
				<Text
					className={`font-bold text-xs tracking-wider uppercase ${info.badgeTextColor}`}>
					{info.name}
				</Text>
				<Text className={`font-bold text-xs ${info.badgeTextColor}`}>
					]
				</Text>
				{showTagline && (
					<Text className="ml-1 font-mono text-[10px] text-foreground/70">
						// {info.tagline}
					</Text>
				)}
			</View>
		);
	}

	if (size === "md") {
		return (
			<View
				className={`flex-row items-center gap-1.5 rounded-none border-2 border-border px-2 py-0.5 ${info.badgeBgColor} shadow-neo-sm ${className}`}>
				<Text className={`font-bold text-xs ${info.badgeTextColor}`}>
					[
				</Text>
				{renderIcon(12)}
				<Text
					className={`font-bold text-xs tracking-wider uppercase ${info.badgeTextColor}`}>
					{info.name}
				</Text>
				<Text className={`font-bold text-xs ${info.badgeTextColor}`}>
					]
				</Text>
			</View>
		);
	}

	return (
		<View
			className={`flex-row items-center gap-1 rounded-none border border-border px-1.5 py-0.5 ${info.badgeBgColor} ${className}`}>
			<Text className={`font-bold text-[10px] ${info.badgeTextColor}`}>
				[
			</Text>
			{renderIcon(10)}
			<Text
				className={`font-bold text-[10px] tracking-wider uppercase ${info.badgeTextColor}`}>
				{info.name}
			</Text>
			<Text className={`font-bold text-[10px] ${info.badgeTextColor}`}>
				]
			</Text>
		</View>
	);
}
