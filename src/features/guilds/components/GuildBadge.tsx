import { Image } from "expo-image";
import { Code2, Palette, Users } from "lucide-react-native";
import { Text } from "panelui-native";
import { View } from "react-native";

import { getGuildInfo } from "../constants";
import type { GuildId } from "../types";

interface GuildBadgeProps {
	guildId: GuildId;
	size?: "sm" | "md" | "lg";
	showTagline?: boolean;
	useLogo?: boolean;
}

export function GuildBadge({
	guildId,
	size = "sm",
	showTagline = false,
	useLogo = true,
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
		switch (guildId) {
			case "octagram":
				return (
					<Code2 size={iconSize} className="text-emerald-400" strokeWidth={2} />
				);
			case "chameleon":
				return (
					<Palette size={iconSize} className="text-pink-400" strokeWidth={2} />
				);
			case "blue_jays":
				return (
					<Users size={iconSize} className="text-sky-400" strokeWidth={2} />
				);
		}
	};

	if (size === "lg") {
		return (
			<View
				className={`flex-row items-center gap-2 rounded-xl border px-3 py-1.5 ${info.badgeBorderColor} ${info.badgeBgColor}`}>
				{renderIcon(18)}
				<View>
					<Text weight="semibold" className={`text-xs ${info.badgeTextColor}`}>
						{info.name}
					</Text>
					{showTagline && (
						<Text className="text-[10px] text-muted-foreground">
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
				className={`flex-row items-center gap-1.5 rounded-full border px-2.5 py-0.5 ${info.badgeBorderColor} ${info.badgeBgColor}`}>
				{renderIcon(14)}
				<Text
					weight="semibold"
					className={`text-[11px] ${info.badgeTextColor}`}>
					{info.name}
				</Text>
			</View>
		);
	}

	// "sm"
	return (
		<View
			className={`flex-row items-center gap-1 rounded-full border px-2 py-0.5 ${info.badgeBorderColor} ${info.badgeBgColor}`}>
			{renderIcon(12)}
			<Text weight="semibold" className={`text-[10px] ${info.badgeTextColor}`}>
				{info.name}
			</Text>
		</View>
	);
}
