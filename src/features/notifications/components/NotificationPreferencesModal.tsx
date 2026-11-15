import * as Haptics from "expo-haptics";
import React from "react";
import { ActivityIndicator, Platform, Switch, Text, View } from "react-native";

import { MobileSheet, NeoButton } from "@/components/ui";
import {
	useNotificationPreferences,
	useUpdateNotificationPreferences,
} from "@/features/notifications/hooks";
import type { NotificationPreferencesPatch } from "@/features/notifications/types";

export interface NotificationPreferencesModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	userId?: string | null;
}

type PreferenceKey = keyof NotificationPreferencesPatch;

interface PreferenceRowConfig {
	key: PreferenceKey;
	label: string;
	description: string;
}

const PREFERENCE_ROWS: PreferenceRowConfig[] = [
	{
		key: "push_enabled",
		label: "Push Notifications",
		description: "Master switch for device push alerts.",
	},
	{
		key: "comments_enabled",
		label: "Comments on your posts",
		description: "Notify when someone comments on a post you created.",
	},
	{
		key: "replies_enabled",
		label: "Replies to your comments",
		description: "Notify when someone replies directly to your comment.",
	},
	{
		key: "mentions_enabled",
		label: "@Mentions",
		description: "Notify when another user mentions your @username.",
	},
	{
		key: "messages_enabled",
		label: "Direct & group messages",
		description: "Notify when you receive new chat messages.",
	},
];

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.selectionAsync().catch(() => {});
	}
};

export function NotificationPreferencesModal({
	open,
	onOpenChange,
	userId,
}: NotificationPreferencesModalProps) {
	const {
		data: preferences,
		isLoading,
		isError,
		refetch,
	} = useNotificationPreferences(userId);
	const updatePreferences = useUpdateNotificationPreferences(userId);

	const handleToggle = (key: PreferenceKey, nextValue: boolean) => {
		if (!userId) return;
		triggerHaptic();
		updatePreferences.mutate({ [key]: nextValue });
	};

	return (
		<MobileSheet
			open={open}
			onOpenChange={onOpenChange}
			title="Notification Preferences"
			subtitle="Control push & in-app alerts">
			<MobileSheet.Body className="gap-3 pb-2">
				{isLoading ? (
					<View className="items-center justify-center py-8">
						<ActivityIndicator size="small" color="#000000" />
						<Text className="mt-2 font-mono text-xs text-muted-foreground">
							Loading preferences...
						</Text>
					</View>
				) : isError ? (
					<View className="border-2 border-border bg-surface p-4">
						<Text className="font-bold text-xs text-foreground uppercase">
							Failed to load preferences
						</Text>
						<Text className="mt-1 font-mono text-xs text-muted-foreground">
							Unable to sync notification settings right now.
						</Text>
						<View className="mt-3">
							<NeoButton
								variant="outline"
								size="sm"
								onPress={() => refetch()}>
								Retry
							</NeoButton>
						</View>
					</View>
				) : (
					<View className="gap-2.5">
						{PREFERENCE_ROWS.map((row) => {
							const value = preferences?.[row.key] ?? true;
							const isPushRow = row.key === "push_enabled";
							return (
								<View
									key={row.key}
									className={`flex-row items-center justify-between gap-3 border-2 border-border p-3 ${
										isPushRow ? "bg-card" : "bg-surface"
									}`}>
									<View className="min-w-0 flex-1">
										<Text className="font-bold text-xs text-foreground uppercase">
											{row.label}
										</Text>
										<Text className="mt-0.5 font-mono text-xs text-muted-foreground">
											{row.description}
										</Text>
									</View>
									<Switch
										value={value}
										disabled={!userId}
										trackColor={{
											false: "#d4d4d8",
											true: "#00ff66",
										}}
										thumbColor="#000000"
										accessibilityLabel={row.label}
										onValueChange={(nextValue) =>
											handleToggle(row.key, nextValue)
										}
									/>
								</View>
							);
						})}
					</View>
				)}
			</MobileSheet.Body>

			<MobileSheet.Footer className="pt-2">
				<NeoButton
					variant="primary"
					onPress={() => onOpenChange(false)}>
					Done
				</NeoButton>
			</MobileSheet.Footer>
		</MobileSheet>
	);
}
