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
	useLogo = true,
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
		const normalizedId = info.id;
		switch (normalizedId) {
			case "octagram":
				return (
					<Code2
						size={iconSize}
						color={info.accentColor}
						strokeWidth={2.2}
					/>
				);
			case "chameleon":
				return (
					<Palette
						size={iconSize}
						color={info.accentColor}
						strokeWidth={2.2}
					/>
				);
			case "blue_jays":
				return (
					<Radio
						size={iconSize}
						color={info.accentColor}
						strokeWidth={2.2}
					/>
				);
			default:
				return (
					<Terminal
						size={iconSize}
						color={info.accentColor}
						strokeWidth={2.2}
					/>
				);
		}
	};

	if (size === "lg") {
		return (
			<View
				className={`flex-row items-center gap-2 rounded-sm border-2 px-3 py-1.5 ${info.badgeBorderColor} ${info.badgeBgColor} ${className}`}>
				{renderIcon(18)}
				<View>
					<Text
						className={`font-mono text-xs tracking-wider uppercase ${info.badgeTextColor}`}>
						{info.name}
					</Text>
					{showTagline && (
						<Text className="font-mono text-[10px] text-muted-foreground">
							{info.tagline}
						</Text>
					)}
				</View>
			</View>
		);
	}

	if (size === "md") {
		return (
			<View
				className={`flex-row items-center gap-1.5 rounded-sm border-2 px-2 py-0.5 ${info.badgeBorderColor} ${info.badgeBgColor} ${className}`}>
				{renderIcon(14)}
				<Text
					className={`font-mono text-xs tracking-wider uppercase ${info.badgeTextColor}`}>
					{info.name}
				</Text>
			</View>
		);
	}

	// "sm"
	return (
		<View
			className={`flex-row items-center gap-1 rounded-sm border-2 px-1.5 py-0.5 ${info.badgeBorderColor} ${info.badgeBgColor} ${className}`}>
			{renderIcon(12)}
			<Text
				className={`font-mono text-[10px] tracking-wider uppercase ${info.badgeTextColor}`}>
				{info.name}
			</Text>
		</View>
	);
}
