import { WifiOff } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";

import { NeoButton } from "./NeoButton";
import { NeoCard } from "./NeoCard";

export interface NetworkErrorCardProps {
	title?: string;
	message?: string;
	onRetry: () => void;
	isRetrying?: boolean;
	className?: string;
	compact?: boolean;
}

export const DEFAULT_NETWORK_ERROR_TITLE = "CONNECTION ERROR";
export const DEFAULT_NETWORK_ERROR_MESSAGE =
	"Unable to reach the server. Check your connection and try again.";

export function NetworkErrorCard({
	title = DEFAULT_NETWORK_ERROR_TITLE,
	message = DEFAULT_NETWORK_ERROR_MESSAGE,
	onRetry,
	isRetrying = false,
	className = "",
	compact = false,
}: NetworkErrorCardProps) {
	const normalizedTitle = title.toUpperCase();

	if (compact) {
		return (
			<NeoCard
				className={`flex-row items-center justify-between border-2 border-border bg-card p-3 shadow-neo-sm ${className}`}
				accessibilityRole="alert">
				<View className="mr-3 flex-1 flex-row items-center gap-2.5">
					<View className="size-8 items-center justify-center border-2 border-border bg-secondary shadow-neo-xs">
						<WifiOff size={16} color="#000000" strokeWidth={2.5} />
					</View>
					<View className="flex-1">
						<Text
							className="font-bold text-xs text-foreground uppercase"
							numberOfLines={1}>
							{normalizedTitle}
						</Text>
						<Text
							className="font-mono text-2xs text-foreground/70"
							numberOfLines={1}>
							{message}
						</Text>
					</View>
				</View>
				<NeoButton
					variant="primary"
					size="sm"
					loading={isRetrying}
					disabled={isRetrying}
					onPress={onRetry}
					accessibilityLabel="Retry connection">
					RETRY
				</NeoButton>
			</NeoCard>
		);
	}

	return (
		<NeoCard
			className={`items-center justify-center border-2 border-border bg-surface p-6 text-center shadow-neo ${className}`}
			accessibilityRole="alert">
			<View className="mb-3.5 size-12 items-center justify-center border-2 border-border bg-secondary shadow-neo-xs">
				<WifiOff size={22} color="#000000" strokeWidth={2.5} />
			</View>
			<Text className="mb-2 text-center font-display text-base tracking-tight text-foreground uppercase">
				{normalizedTitle}
			</Text>
			<Text className="mb-4 text-center font-mono text-xs leading-relaxed text-foreground/70">
				{message}
			</Text>
			<NeoButton
				variant="primary"
				size="sm"
				loading={isRetrying}
				disabled={isRetrying}
				onPress={onRetry}
				accessibilityLabel="Retry connection">
				RETRY
			</NeoButton>
		</NeoCard>
	);
}
