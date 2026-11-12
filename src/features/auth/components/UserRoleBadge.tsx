import React from "react";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import {
	Award,
	Building2,
	CheckCircle2,
	Shield,
	ShieldCheck,
} from "lucide-react-native";

import {
	NeoBadge,
	type NeoBadgeSize,
	type NeoBadgeVariant,
} from "@/components/ui";
import type { UserRole } from "@/features/auth/types";
import {
	getHighestBadge,
	type UserBadgeInfo,
} from "@/features/auth/utils/badges";
import type { GuildId } from "@/features/guilds/types";

export interface UserRoleBadgeProps {
	badge?: UserBadgeInfo | null;
	role?: UserRole | (string & {}) | null;
	isVerified?: boolean | null;
	guild?: GuildId | (string & {}) | null;
	size?: NeoBadgeSize;
	variant?: NeoBadgeVariant;
	className?: string;
	textClassName?: string;
	style?: StyleProp<ViewStyle>;
	textStyle?: StyleProp<TextStyle>;
	showIcon?: boolean;
	iconColor?: string;
}

const renderBadgeIcon = (
	iconName: UserBadgeInfo["iconName"],
	size: number,
	color: string,
) => {
	switch (iconName) {
		case "ShieldCheck":
			return <ShieldCheck size={size} color={color} strokeWidth={2.5} />;
		case "Shield":
			return <Shield size={size} color={color} strokeWidth={2.5} />;
		case "Award":
			return <Award size={size} color={color} strokeWidth={2.5} />;
		case "CheckCircle2":
			return <CheckCircle2 size={size} color={color} strokeWidth={2.5} />;
		case "Building2":
			return <Building2 size={size} color={color} strokeWidth={2.5} />;
		default:
			return null;
	}
};

export const UserRoleBadge = React.memo(function UserRoleBadge({
	badge,
	role,
	isVerified,
	guild,
	size = "sm",
	variant,
	className = "",
	textClassName = "",
	style,
	textStyle,
	showIcon = true,
	iconColor,
}: UserRoleBadgeProps) {
	const resolvedBadge =
		badge ??
		getHighestBadge({
			role,
			isVerified,
			guild,
		});

	if (!resolvedBadge) {
		return null;
	}

	const iconSize = size === "md" ? 12 : 10;
	const resolvedIconColor = iconColor ?? resolvedBadge.colorHex;
	const resolvedVariant = variant ?? resolvedBadge.variant;

	const startIcon = showIcon
		? renderBadgeIcon(resolvedBadge.iconName, iconSize, resolvedIconColor)
		: null;

	const combinedContainerClass = [
		"border-2 border-border shadow-neo-xs",
		className,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<NeoBadge
			variant={resolvedVariant}
			size={size}
			className={combinedContainerClass}
			textClassName={textClassName}
			style={style}
			textStyle={textStyle}
			startContent={startIcon}>
			{resolvedBadge.label}
		</NeoBadge>
	);
});

UserRoleBadge.displayName = "UserRoleBadge";
