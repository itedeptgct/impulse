import * as Haptics from "expo-haptics";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import type { GuildId } from "@/features/guilds/types";
import type {
	ModerationQueueMetrics as ModerationQueueMetricsData,
	ReportReason,
} from "@/features/moderation/types";

export interface ModerationQueueMetricsProps {
	metrics: ModerationQueueMetricsData;
	isHouseScoped?: boolean;
}

const REASON_LABELS: Record<ReportReason, string> = {
	spam: "SPAM",
	harassment: "HARASSMENT",
	misinformation: "MISINFO",
	inappropriate: "INAPPROPRIATE",
	other: "OTHER",
};

const HOUSE_ITEMS: readonly { key: GuildId | "global"; label: string }[] = [
	{ key: "octagram", label: "0x" },
	{ key: "chameleon", label: "RGB" },
	{ key: "blue_jays", label: "PRESS" },
	{ key: "global", label: "GLOBAL" },
];

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

/**
 * Compact, collapsible neo-brutalist telemetry card for moderation queue metrics.
 */
export function ModerationQueueMetrics({
	metrics,
	isHouseScoped = false,
}: ModerationQueueMetricsProps) {
	const [expanded, setExpanded] = useState(false);

	const hasAgingAlert = metrics.byAge.overThreeDays > 0;
	const nonZeroReasons = (
		Object.entries(metrics.byReason) as [ReportReason, number][]
	)
		.filter(([, count]) => count > 0)
		.sort((a, b) => b[1] - a[1]);

	return (
		<View className="bg-card shadow-neo">
			<View className="overflow-hidden border-2 border-border bg-card">
				{/* Top 3-column summary strip */}
				<View className="flex-row">
					<View className="flex-1 border-r-2 border-border px-3 py-2.5">
						<Text className="font-bold text-[10px] tracking-wider text-muted-foreground uppercase">
							OPEN TARGETS
						</Text>
						<Text className="mt-0.5 font-display text-2xl text-foreground tabular-nums">
							{metrics.uniqueOpenTargets}
						</Text>
					</View>

					<View className="flex-1 border-r-2 border-border px-3 py-2.5">
						<Text className="font-bold text-[10px] tracking-wider text-muted-foreground uppercase">
							UNASSIGNED
						</Text>
						<Text className="mt-0.5 font-display text-2xl text-foreground tabular-nums">
							{metrics.unassignedOpen}
						</Text>
					</View>

					<View className="flex-1 px-3 py-2.5">
						<Text className="font-bold text-[10px] tracking-wider text-muted-foreground uppercase">
							&gt;3D AGING
						</Text>
						<Text
							className={`mt-0.5 font-display text-2xl tabular-nums ${
								hasAgingAlert
									? "text-destructive"
									: "text-foreground"
							}`}>
							{metrics.byAge.overThreeDays}
						</Text>
					</View>
				</View>

				{/* Collapsible toggle bar */}
				<Pressable
					onPress={() => {
						triggerHaptic();
						setExpanded((prev) => !prev);
					}}
					accessibilityRole="button"
					accessibilityState={{ expanded }}
					accessibilityLabel="Toggle queue telemetry breakdown"
					className="flex-row items-center justify-between border-t-2 border-border bg-secondary px-3 py-2 active:bg-card">
					<Text className="font-bold text-[11px] tracking-wider text-foreground uppercase">
						QUEUE BREAKDOWN · {metrics.totalOpen} OPEN
					</Text>
					<View className="flex-row items-center gap-1">
						<Text className="font-mono text-[11px] text-muted-foreground uppercase">
							{expanded ? "HIDE" : "DETAILS"}
						</Text>
						{expanded ? (
							<ChevronUp
								size={14}
								color="#000000"
								strokeWidth={2.5}
							/>
						) : (
							<ChevronDown
								size={14}
								color="#000000"
								strokeWidth={2.5}
							/>
						)}
					</View>
				</Pressable>

				{/* Expandable breakdown rows */}
				{expanded ? (
					<View className="border-t-2 border-border bg-card">
						{/* Age buckets */}
						<View className="px-3 py-2.5">
							<Text className="font-bold text-[10px] tracking-wider text-muted-foreground uppercase">
								AGE BUCKETS
							</Text>
							<View className="mt-1.5 flex-row flex-wrap gap-x-4 gap-y-1">
								<Text className="font-mono text-xs text-foreground tabular-nums">
									&lt;24H: {metrics.byAge.under24h}
								</Text>
								<Text className="font-mono text-xs text-foreground tabular-nums">
									1-3D: {metrics.byAge.oneToThreeDays}
								</Text>
								<Text
									className={`font-mono text-xs tabular-nums ${
										hasAgingAlert
											? "text-destructive"
											: "text-foreground"
									}`}>
									&gt;3D: {metrics.byAge.overThreeDays}
								</Text>
							</View>
						</View>

						{/* Top non-zero reasons */}
						<View className="border-t-2 border-border px-3 py-2.5">
							<Text className="font-bold text-[10px] tracking-wider text-muted-foreground uppercase">
								TOP REASONS
							</Text>
							{nonZeroReasons.length === 0 ? (
								<Text className="mt-1 font-mono text-xs text-muted-foreground uppercase">
									NO OPEN REPORTS
								</Text>
							) : (
								<View className="mt-1.5 flex-row flex-wrap gap-x-4 gap-y-1">
									{nonZeroReasons.map(([reason, count]) => (
										<Text
											key={reason}
											className="font-mono text-xs text-foreground tabular-nums">
											{REASON_LABELS[reason]}: {count}
										</Text>
									))}
								</View>
							)}
						</View>

						{/* House breakdown unless scoped to a single house */}
						{!isHouseScoped ? (
							<View className="border-t-2 border-border px-3 py-2.5">
								<Text className="font-bold text-[10px] tracking-wider text-muted-foreground uppercase">
									BY HOUSE
								</Text>
								<View className="mt-1.5 flex-row flex-wrap gap-x-4 gap-y-1">
									{HOUSE_ITEMS.map(({ key, label }) => (
										<Text
											key={key}
											className="font-mono text-xs text-foreground tabular-nums">
											{label}: {metrics.byHouse[key]}
										</Text>
									))}
								</View>
							</View>
						) : null}
					</View>
				) : null}
			</View>
		</View>
	);
}
