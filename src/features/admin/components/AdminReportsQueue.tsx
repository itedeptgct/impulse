import { useAuthStore } from "@auth/store";
import { formatRelativeTime } from "@lib/date";
import * as Haptics from "expo-haptics";
import {
	CheckCircle,
	FileText,
	Flag,
	MessageSquare,
	RefreshCw,
	Shield,
	ShieldCheck,
	Trash2,
	XCircle,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
	ActivityIndicator,
	Platform,
	ScrollView,
	Text,
	View,
} from "react-native";

import { MobileAlertSheet, NeoButton, NeoCard } from "@/components/ui";
import { GuildBadge } from "@/features/guilds/components/GuildBadge";
import {
	useModerationReports,
	useResolveReport,
} from "@/features/moderation/hooks/useModeration";
import type {
	ModerationReport,
	ReportReason,
	ReportStatus,
} from "@/features/moderation/types";

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

const REASON_COLORS: Record<ReportReason, string> = {
	spam: "bg-neo-yellow text-foreground",
	harassment: "bg-destructive text-primary-foreground",
	misinformation: "bg-neo-magenta text-primary-foreground",
	inappropriate: "bg-destructive text-primary-foreground",
	other: "bg-secondary text-foreground",
};

export function AdminReportsQueue() {
	const profile = useAuthStore((state) => state.profile);
	const userRole = profile?.role;
	const userGuild = profile?.guild;

	const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">(
		"open",
	);
	const [reportToRemove, setReportToRemove] =
		useState<ModerationReport | null>(null);
	const [activeActionId, setActiveActionId] = useState<string | null>(null);

	const {
		data: rawReports,
		isLoading,
		isFetching,
		refetch,
	} = useModerationReports(statusFilter);
	const resolveMutation = useResolveReport();

	// If house_mod, restrict to user's guild
	const reports = useMemo(() => {
		const list = rawReports || [];
		if (userRole === "house_mod" && userGuild) {
			return list.filter((r) => r.guild === userGuild);
		}
		return list;
	}, [rawReports, userRole, userGuild]);

	const handleDismiss = async (reportId: string) => {
		triggerHaptic();
		setActiveActionId(reportId);
		try {
			await resolveMutation.mutateAsync({
				reportId,
				action: "dismiss",
			});
		} finally {
			setActiveActionId(null);
		}
	};

	const handleConfirmRemove = async () => {
		if (!reportToRemove) return;
		triggerHaptic();
		setActiveActionId(reportToRemove.id);
		try {
			await resolveMutation.mutateAsync({
				reportId: reportToRemove.id,
				action: "remove_content",
			});
			setReportToRemove(null);
		} finally {
			setActiveActionId(null);
		}
	};

	return (
		<View className="gap-4">
			{/* Guild Scoping Notification for House Mods */}
			{userRole === "house_mod" && userGuild && (
				<View className="bg-neo-yellow/20 flex-row items-center gap-2 border-2 border-border p-3 shadow-neo-xs">
					<Shield size={16} color="#000000" strokeWidth={2.4} />
					<Text className="flex-1 font-bold text-xs text-foreground uppercase">
						SCOPED TO HOUSE {userGuild.toUpperCase()} DISPATCHES
						&amp; POSTS
					</Text>
				</View>
			)}

			{/* Filter Tabs & Refresh Button */}
			<View className="flex-row items-center justify-between gap-2">
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ gap: 6 }}
					className="flex-1">
					{(
						[
							{ key: "open", label: "Open Reports" },
							{ key: "resolved", label: "Resolved" },
							{ key: "dismissed", label: "Dismissed" },
							{ key: "all", label: "All" },
						] as const
					).map((tab) => {
						const isActive = statusFilter === tab.key;
						return (
							<NeoButton
								key={tab.key}
								size="sm"
								variant={isActive ? "primary" : "outline"}
								onPress={() => {
									triggerHaptic();
									setStatusFilter(tab.key);
								}}>
								{tab.label}
							</NeoButton>
						);
					})}
				</ScrollView>

				<NeoButton
					size="sm"
					variant="outline"
					className="size-9 px-0"
					accessibilityLabel="Refresh reports list"
					loading={isFetching}
					onPress={() => void refetch()}>
					<RefreshCw size={14} color="#000000" strokeWidth={2.5} />
				</NeoButton>
			</View>

			{/* List Content */}
			{isLoading ? (
				<View className="items-center justify-center py-12">
					<ActivityIndicator size="large" color="#000000" />
					<Text className="mt-3 font-mono text-xs text-muted-foreground uppercase">
						Scanning incident reports...
					</Text>
				</View>
			) : reports.length === 0 ? (
				<NeoCard
					variant="default"
					className="items-center justify-center p-8 text-center shadow-neo">
					<ShieldCheck size={36} color="#000000" strokeWidth={2.2} />
					<Text className="mt-2 font-display text-base text-foreground uppercase">
						ZERO INCIDENTS
					</Text>
					<Text className="mt-1 max-w-xs font-mono text-xs text-muted-foreground">
						No {statusFilter === "all" ? "" : statusFilter}{" "}
						moderation reports found. The network is currently
						compliant, for now.
					</Text>
				</NeoCard>
			) : (
				<View className="gap-3">
					{reports.map((report) => {
						const isActionPending = activeActionId === report.id;
						const isOpen = report.status === "open";
						const isPost = report.target_type === "post";

						return (
							<View
								key={report.id}
								className="border-2 border-border bg-card p-4 shadow-neo">
								{/* Header: Target type, Reason, House, Date */}
								<View className="mb-2.5 flex-row flex-wrap items-center justify-between gap-2 border-b-2 border-border/20 pb-2.5">
									<View className="flex-row flex-wrap items-center gap-1.5">
										<View
											className={`flex-row items-center gap-1 border border-border px-1.5 py-0.5 ${
												isPost
													? "bg-primary"
													: "bg-neo-magenta"
											}`}>
											{isPost ? (
												<FileText
													size={10}
													color="#faf9f5"
													strokeWidth={2.5}
												/>
											) : (
												<MessageSquare
													size={10}
													color="#faf9f5"
													strokeWidth={2.5}
												/>
											)}
											<Text className="font-bold text-3xs text-primary-foreground uppercase">
												{report.target_type}
											</Text>
										</View>

										<View
											className={`border border-border px-1.5 py-0.5 ${REASON_COLORS[report.reason]}`}>
											<Text className="font-bold text-3xs uppercase">
												{report.reason}
											</Text>
										</View>

										{report.guild && (
											<GuildBadge
												guildId={report.guild}
												size="sm"
											/>
										)}

										<View
											className={`border border-border px-1.5 py-0.5 ${
												isOpen
													? "bg-neo-yellow"
													: report.status ===
														  "resolved"
														? "bg-neo-green"
														: "bg-secondary"
											}`}>
											<Text className="font-bold text-3xs uppercase">
												{report.status}
											</Text>
										</View>
									</View>

									<Text className="font-mono text-2xs text-muted-foreground">
										{formatRelativeTime(report.created_at)}
									</Text>
								</View>

								{/* Content Snippet */}
								<View className="mb-3 border-2 border-border bg-secondary p-3 shadow-neo-xs">
									<Text className="font-mono text-3xs tracking-wider text-muted-foreground uppercase">
										TARGET CONTENT REFERENCE
									</Text>
									<Text
										numberOfLines={3}
										className="mt-1 font-mono text-xs leading-relaxed text-foreground select-text">
										{report.target_snippet ||
											"[Content unavailable or deleted]"}
									</Text>
								</View>

								{/* Additional Details */}
								{report.details && (
									<View className="mb-3 border border-border/40 bg-card p-2.5">
										<Text className="font-mono text-3xs tracking-wider text-muted-foreground uppercase">
											REPORTER CONTEXT &amp; DETAILS
										</Text>
										<Text className="mt-0.5 font-mono text-xs text-foreground italic">
											"{report.details}"
										</Text>
									</View>
								)}

								{/* Reporter info */}
								<View className="mb-3 flex-row items-center gap-1">
									<Flag
										size={12}
										color="#000000"
										strokeWidth={2}
									/>
									<Text className="font-mono text-2xs text-muted-foreground">
										Reported by{" "}
										<Text className="font-bold text-foreground">
											@
											{report.reporter?.username ||
												"student"}
										</Text>
									</Text>
								</View>

								{/* Actions if Open */}
								{isOpen && (
									<View className="flex-row gap-2 border-t border-border/20 pt-3">
										<NeoButton
											size="sm"
											variant="destructive"
											className="flex-1"
											loading={
												isActionPending &&
												resolveMutation.isPending
											}
											disabled={
												isActionPending ||
												resolveMutation.isPending
											}
											startContent={
												<Trash2
													size={13}
													color="#faf9f5"
													strokeWidth={2.4}
												/>
											}
											onPress={() =>
												setReportToRemove(report)
											}>
											PURGE CONTENT
										</NeoButton>

										<NeoButton
											size="sm"
											variant="outline"
											className="flex-1"
											loading={
												isActionPending &&
												resolveMutation.isPending
											}
											disabled={
												isActionPending ||
												resolveMutation.isPending
											}
											startContent={
												<XCircle
													size={13}
													color="#000000"
													strokeWidth={2.4}
												/>
											}
											onPress={() =>
												handleDismiss(report.id)
											}>
											DISMISS REPORT
										</NeoButton>
									</View>
								)}

								{/* Resolved Info */}
								{!isOpen && report.resolved_at && (
									<View className="flex-row items-center gap-1 border-t border-border/20 pt-2 font-mono text-2xs text-muted-foreground">
										<CheckCircle
											size={12}
											color="#00aa33"
											strokeWidth={2.2}
										/>
										<Text className="font-mono text-2xs text-muted-foreground">
											Resolved{" "}
											{formatRelativeTime(
												report.resolved_at,
											)}
										</Text>
									</View>
								)}
							</View>
						);
					})}
				</View>
			)}

			{/* Remove Confirmation Sheet */}
			<MobileAlertSheet
				open={Boolean(reportToRemove)}
				onOpenChange={(open) => {
					if (!open) setReportToRemove(null);
				}}
				type="error"
				title="PURGE REPORTED CONTENT"
				description={`Are you certain you want to permanently delete this ${reportToRemove?.target_type}? This will delete the content from impulse and resolve all matching open reports.`}
				actions={[
					{
						label: "PURGE IMMEDIATELY",
						variant: "destructive",
						loading: resolveMutation.isPending,
						onPress: handleConfirmRemove,
					},
					{
						label: "ABORT",
						variant: "outline",
						onPress: () => setReportToRemove(null),
					},
				]}
			/>
		</View>
	);
}
