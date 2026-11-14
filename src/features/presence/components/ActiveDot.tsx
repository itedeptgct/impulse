import { View } from "react-native";

import { usePresenceStore } from "../store";

interface ActiveDotProps {
	userId?: string | null;
	targetShowActiveStatus?: boolean;
	size?: "sm" | "md";
	className?: string;
}

export function ActiveDot({
	userId,
	targetShowActiveStatus = true,
	size = "sm",
	className = "",
}: ActiveDotProps) {
	const isOnline = usePresenceStore((s) =>
		s.isUserOnline(userId, targetShowActiveStatus),
	);

	if (!isOnline) return null;

	const dimensions = size === "md" ? "size-3" : "size-2.5";

	return (
		<View
			accessibilityLabel="Active now"
			className={`rounded-full border border-border bg-neo-green ${dimensions} ${className}`}
		/>
	);
}
