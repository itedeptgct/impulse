import * as Haptics from "expo-haptics";
import { CheckSquare, RefreshCw, Search, X } from "lucide-react-native";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";

import { NeoButton, NeoInput } from "@/components/ui";
import type {
	ModerationQueueFilters,
	ReportAssigneeFilter,
	ReportReason,
	ReportSortBy,
	ReportStatus,
	ReportTargetType,
} from "@/features/moderation/types";

export interface ModerationFilterBarProps {
	filters: ModerationQueueFilters;
	onChange: (next: ModerationQueueFilters) => void;
	onRefresh: () => void;
	isRefreshing?: boolean;
	bulkMode: boolean;
	onToggleBulkMode: () => void;
}

interface FilterOption<T extends string> {
	key: T;
	label: string;
}

const STATUS_TABS: readonly FilterOption<ReportStatus | "all">[] = [
	{ key: "open", label: "Open" },
	{ key: "resolved", label: "Resolved" },
	{ key: "dismissed", label: "Dismissed" },
	{ key: "all", label: "All" },
];

const TARGET_TYPE_OPTIONS: readonly FilterOption<ReportTargetType | "all">[] = [
	{ key: "all", label: "All" },
	{ key: "post", label: "Posts" },
	{ key: "comment", label: "Comments" },
];

const REASON_OPTIONS: readonly FilterOption<ReportReason | "all">[] = [
	{ key: "all", label: "All" },
	{ key: "spam", label: "Spam" },
	{ key: "harassment", label: "Harassment" },
	{ key: "misinformation", label: "Misinfo" },
	{ key: "inappropriate", label: "Inappropriate" },
	{ key: "other", label: "Other" },
];

const ASSIGNEE_OPTIONS: readonly FilterOption<ReportAssigneeFilter>[] = [
	{ key: "all", label: "All" },
	{ key: "unassigned", label: "Unassigned" },
	{ key: "mine", label: "Mine" },
];

const SORT_OPTIONS: readonly FilterOption<ReportSortBy>[] = [
	{ key: "newest", label: "Newest" },
	{ key: "oldest", label: "Oldest" },
	{ key: "most_reported", label: "Most Reported" },
];

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

interface FilterChipRowProps<T extends string> {
	label: string;
	options: readonly FilterOption<T>[];
	value: T;
	onSelect: (value: T) => void;
	isFirst?: boolean;
}

function FilterChipRow<T extends string>({
	label,
	options,
	value,
	onSelect,
	isFirst = false,
}: FilterChipRowProps<T>) {
	return (
		<View
			className={`flex-row items-center gap-2 px-3 py-2 ${
				isFirst ? "" : "border-t-2 border-border"
			}`}>
			<Text className="w-16 shrink-0 font-bold text-[10px] tracking-wider text-muted-foreground uppercase">
				{label}
			</Text>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={{ gap: 6 }}
				className="flex-1">
				{options.map((opt) => {
					const isActive = value === opt.key;
					return (
						<Pressable
							key={opt.key}
							onPress={() => {
								triggerHaptic();
								onSelect(opt.key);
							}}
							accessibilityRole="button"
							accessibilityState={{ selected: isActive }}
							className={`border-2 border-border px-2.5 py-1 ${
								isActive
									? "bg-primary"
									: "bg-card active:bg-secondary"
							}`}>
							<Text
								className={`font-bold text-[11px] tracking-wider uppercase ${
									isActive
										? "text-primary-foreground"
										: "text-foreground"
								}`}>
								{opt.label}
							</Text>
						</Pressable>
					);
				})}
			</ScrollView>
		</View>
	);
}

/**
 * Search, status tabs, bulk triage toggle, and triage filter/sort bar for the moderation queue.
 */
export function ModerationFilterBar({
	filters,
	onChange,
	onRefresh,
	isRefreshing = false,
	bulkMode,
	onToggleBulkMode,
}: ModerationFilterBarProps) {
	const statusValue: ReportStatus | "all" = filters.status ?? "open";
	const searchValue = filters.search ?? "";
	const targetTypeValue: ReportTargetType | "all" =
		filters.targetType ?? "all";
	const reasonValue: ReportReason | "all" = filters.reason ?? "all";
	const assigneeValue: ReportAssigneeFilter = filters.assignee ?? "all";
	const sortByValue: ReportSortBy = filters.sortBy ?? "newest";

	return (
		<View className="gap-3">
			{/* Status tabs + Bulk Triage toggle + Refresh */}
			<View className="flex-row items-center justify-between gap-2">
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ gap: 6 }}
					className="flex-1">
					{STATUS_TABS.map((tab) => {
						const isActive = statusValue === tab.key;
						return (
							<NeoButton
								key={tab.key}
								size="sm"
								variant={isActive ? "primary" : "outline"}
								onPress={() =>
									onChange({ ...filters, status: tab.key })
								}>
								{tab.label}
							</NeoButton>
						);
					})}
				</ScrollView>

				<View className="flex-row items-center gap-1.5">
					<NeoButton
						size="sm"
						variant={bulkMode ? "primary" : "outline"}
						onPress={onToggleBulkMode}
						accessibilityLabel={
							bulkMode
								? "Exit bulk triage mode"
								: "Enable bulk triage mode"
						}
						accessibilityState={{ selected: bulkMode }}
						startContent={
							<CheckSquare
								size={14}
								color={bulkMode ? "#faf9f5" : "#000000"}
								strokeWidth={2.5}
							/>
						}>
						Bulk
					</NeoButton>

					<NeoButton
						size="sm"
						variant="outline"
						className="size-9 px-0"
						accessibilityLabel="Refresh reports queue"
						loading={isRefreshing}
						onPress={onRefresh}
						startContent={
							<RefreshCw
								size={14}
								color="#000000"
								strokeWidth={2.5}
							/>
						}
					/>
				</View>
			</View>

			{/* Search bar */}
			<NeoInput
				value={searchValue}
				onChangeText={(text) => onChange({ ...filters, search: text })}
				placeholder="Search reporter, author, or details..."
				returnKeyType="search"
				autoCapitalize="none"
				autoCorrect={false}
				startContent={
					<Search size={15} color="#000000" strokeWidth={2.5} />
				}
				endContent={
					searchValue.length > 0 ? (
						<Pressable
							onPress={() => {
								triggerHaptic();
								onChange({ ...filters, search: "" });
							}}
							hitSlop={8}
							accessibilityRole="button"
							accessibilityLabel="Clear search query">
							<X size={15} color="#000000" strokeWidth={2.5} />
						</Pressable>
					) : undefined
				}
			/>

			{/* Triage Filter & Sort Chips */}
			<View className="bg-card shadow-neo">
				<View className="overflow-hidden border-2 border-border bg-card">
					<FilterChipRow
						label="Target"
						options={TARGET_TYPE_OPTIONS}
						value={targetTypeValue}
						onSelect={(targetType) =>
							onChange({ ...filters, targetType })
						}
						isFirst
					/>
					<FilterChipRow
						label="Reason"
						options={REASON_OPTIONS}
						value={reasonValue}
						onSelect={(reason) => onChange({ ...filters, reason })}
					/>
					<FilterChipRow
						label="Owner"
						options={ASSIGNEE_OPTIONS}
						value={assigneeValue}
						onSelect={(assignee) =>
							onChange({ ...filters, assignee })
						}
					/>
					<FilterChipRow
						label="Sort"
						options={SORT_OPTIONS}
						value={sortByValue}
						onSelect={(sortBy) => onChange({ ...filters, sortBy })}
					/>
				</View>
			</View>
		</View>
	);
}
