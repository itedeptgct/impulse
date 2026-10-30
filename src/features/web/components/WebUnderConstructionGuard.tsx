import { usePathname, useSegments } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { isExemptWebRoute } from "../utils/web-route-guard";
import { WebUnderConstructionView } from "./WebUnderConstructionView";

export interface WebUnderConstructionGuardProps {
	children: React.ReactNode;
}

export function WebUnderConstructionGuard({
	children,
}: WebUnderConstructionGuardProps) {
	// Native mobile builds (iOS and Android) pass straight through with zero overhead
	if (Platform.OS !== "web") {
		return <>{children}</>;
	}

	return (
		<WebUnderConstructionWebGuard>{children}</WebUnderConstructionWebGuard>
	);
}

function WebUnderConstructionWebGuard({
	children,
}: WebUnderConstructionGuardProps) {
	const segments = useSegments();
	const pathname = usePathname();

	if (isExemptWebRoute(segments, pathname)) {
		return <>{children}</>;
	}

	return <WebUnderConstructionView />;
}
