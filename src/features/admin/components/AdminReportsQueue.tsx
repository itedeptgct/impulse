import { useAuthStore } from "@auth/store";
import * as Haptics from "expo-haptics";
import {
	AlertTriangle,
	Check,
	CheckSquare,
	Lock,
	RefreshCw,
	Shield,
	ShieldCheck,
	UserMinus,
	Users,
	XCircle,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";

import { MobileSheet, NeoButton, NeoCard } from "@/components/ui";
import { GuildBadge } from "@/features/guilds/components/GuildBadge";
import {
	useAssignReportTarget,
	useBulkDismissReports,
	useModerationReports,
	useResolveReport,
	useStaffModerators,
} from "@/features/moderation/hooks/useModeration";
import type {
	GroupedModerationReport,
	ModerationActionType,
	ModerationQueueFilters,
	ModerationReport,
	ReportStatus,
	StaffModerator,
} from "@/features/moderation/types";
import {
	computeQueueMetrics,
	filterModerationReports,
	groupModerationReports,
	sortReportGroups,
} from "@/features/moderation/utils/queue";
import { toast } from "@/lib/toast";

import { GroupedReportCard } from "./GroupedReportCard";
import {
	type ModerationDecisionPayload,
	ModerationDecisionSheet,
} from "./ModerationDecisionSheet";
import { ModerationFilterBar } from "./ModerationFilterBar";
import { ModerationQueueMetrics } from "./ModerationQueueMetrics";
import { ReportContextSheet } from "./ReportContextSheet";

const DEFAULT_FILTERS: ModerationQueueFilters = {
	status: "open",
	search: "",
	reason: "all",
	targetType: "all",
	assignee: "all",
	sortBy: "newest",
};

const ACTION_TOAST_COPY: Record<
	ModerationActionType,
	{ title: string; message: string }
> = {
	dismiss: {
		title: "Report dismissed",
		message: "Matching open reports were closed with no enforcement.",
	},
	warn: {
		title: "Warning issued",
		message:
			"Author notified with an official warning and reports resolved.",
	},
	restrict_24h: {
		title: "Author restricted (24h)",
		message:
			"Posting and commenting locked for 24 hours; reports resolved.",
	},
	restrict_7d: {
		title: "Author restricted (7d)",
		message: "Posting and commenting locked for 7 days; reports resolved.",
	},
	remove_content: {
		title: "Content purged",
		message: "Reported content deleted and matching open reports resolved.",
	},
};

const ROLE_LABELS: Record<StaffModerator["role"], string> = {
	admin: "ADMIN",
	mod: "MOD",
	house_mod: "HOUSE MOD",
};

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

function getErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message.trim();
	}
	return fallback;
}

function scopeReportsForRole(
	reports: ModerationReport[] | undefined,
	userRole: string | null | undefined,
	userGuild: string | null | undefined,
): ModerationReport[] {
	const list = reports ?? [];
	if (userRole === "house_mod") {
		if (!userGuild) return [];
		return list.filter((report) => report.guild === userGuild);
	}
	return list;
}

export function AdminReportsQueue() {
	const profile = useAuthStore((state) => state.profile);
	const currentUserId = profile?.id ?? null;
	const userRole = profile?.role;
	const userGuild = profile?.guild;

	const isHouseMod = userRole === "house_mod";
	const canAssignOthers = userRole === "admin" || userRole === "mod";

	const [filters, setFilters] =
		useState<ModerationQueueFilters>(DEFAULT_FILTERS);
	const [bulkMode, setBulkMode] = useState(false);
	const [selectedGroupKeys, setSelectedGroupKeys] = useState<string[]>([]);
	const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
	const [bulkNote, setBulkNote] = useState("");

	const [inspectGroup, setInspectGroup] =
		useState<GroupedModerationReport | null>(null);
	const [decisionGroup, setDecisionGroup] =
		useState<GroupedModerationReport | null>(null);
	const [assignGroup, setAssignGroup] =
		useState<GroupedModerationReport | null>(null);
	const [busyGroupKey, setBusyGroupKey] = useState<string | null>(null);

	const statusFilter: ReportStatus | "all" = filters.status ?? "open";

	const reportsQuery = useModerationReports(statusFilter);
	const openReportsQuery = useModerationReports("open");
	const staffQuery = useStaffModerators(
		assignGroup?.guild ?? null,
		Boolean(assignGroup && canAssignOthers),
	);

	const resolveMutation = useResolveReport();
	const assignMutation = useAssignReportTarget();
	const bulkDismissMutation = useBulkDismissReports();

	const scopedReports = useMemo(
		() => scopeReportsForRole(reportsQuery.data, userRole, userGuild),
		[reportsQuery.data, userRole, userGuild],
	);

	const scopedOpenReports = useMemo(
		() => scopeReportsForRole(openReportsQuery.data, userRole, userGuild),
		[openReportsQuery.data, userRole, userGuild],
	);

	const metrics = useMemo(
		() => computeQueueMetrics(scopedOpenReports),
		[scopedOpenReports],
	);

	const sortedGroups = useMemo(() => {
		const filtered = filterModerationReports(scopedReports, {
			...filters,
			currentUserId: currentUserId ?? undefined,
		});
		const grouped = groupModerationReports(filtered);
		return sortReportGroups(grouped, filters.sortBy ?? "newest");
	}, [scopedReports, filters, currentUserId]);

	const openSelectableGroups = useMemo(
		() => sortedGroups.filter((group) => group.status === "open"),
		[sortedGroups],
	);

	const selectedKeySet = useMemo(
		() => new Set(selectedGroupKeys),
		[selectedGroupKeys],
	);

	const selectedGroups = useMemo(
		() =>
			openSelectableGroups.filter((group) =>
				selectedKeySet.has(group.key),
			),
		[openSelectableGroups, selectedKeySet],
	);

	const selectedReportIds = useMemo(
		() =>
			selectedGroups.flatMap((group) =>
				group.reports
					.filter((report) => report.status === "open")
					.map((report) => report.id),
			),
		[selectedGroups],
	);

	const hasActiveTriageFilters = Boolean(
		filters.search?.trim() ||
		(filters.reason && filters.reason !== "all") ||
		(filters.targetType && filters.targetType !== "all") ||
		(filters.assignee && filters.assignee !== "all"),
	);

	const allOpenSelected =
		openSelectableGroups.length > 0 &&
		selectedGroups.length === openSelectableGroups.length;

	const handleFiltersChange = (next: ModerationQueueFilters) => {
		setFilters(next);
		if ((next.status ?? "open") !== "open") {
			setSelectedGroupKeys([]);
			setBulkMode(false);
		}
	};

	const handleToggleBulkMode = () => {
		triggerHaptic();
		if (bulkMode) {
			setBulkMode(false);
			setSelectedGroupKeys([]);
			return;
		}
		if (statusFilter !== "open") {
			setFilters((prev) => ({ ...prev, status: "open" }));
		}
		setSelectedGroupKeys([]);
		setBulkMode(true);
	};

	const handleRefresh = () => {
		triggerHaptic();
		void reportsQuery.refetch();
		if (statusFilter !== "open") {
			void openReportsQuery.refetch();
		}
	};

	const handleToggleSelectGroup = (group: GroupedModerationReport) => {
		if (group.status !== "open") return;
		setSelectedGroupKeys((prev) =>
			prev.includes(group.key)
				? prev.filter((key) => key !== group.key)
				: [...prev, group.key],
		);
	};

	const handleSelectAllOpen = () => {
		triggerHaptic();
		setSelectedGroupKeys(openSelectableGroups.map((group) => group.key));
	};

	const handleClearSelection = () => {
		triggerHaptic();
		setSelectedGroupKeys([]);
	};

	const handleClaimToggle = async (group: GroupedModerationReport) => {
		if (!currentUserId) {
			toast.error("Sign in to claim reports.", "Authentication required");
			return;
		}

		const isClaimedByMe = group.assigned_to === currentUserId;
		const nextAssigneeId = isClaimedByMe ? null : currentUserId;

		setBusyGroupKey(group.key);
		try {
			await assignMutation.mutateAsync({
				targetType: group.target_type,
				targetId: group.target_id,
				assigneeId: nextAssigneeId,
			});
			toast.success(
				isClaimedByMe
					? "Returned report group to the unassigned queue."
					: "Claimed report group for review.",
				isClaimedByMe ? "Report unclaimed" : "Report claimed",
			);
		} catch (error) {
			toast.error(
				getErrorMessage(error, "Failed to update report assignment."),
				"Assignment failed",
			);
		} finally {
			setBusyGroupKey(null);
		}
	};

	const handleAssignStaff = async (member: StaffModerator | null) => {
		if (!assignGroup) return;
		triggerHaptic();
		setBusyGroupKey(assignGroup.key);
		try {
			await assignMutation.mutateAsync({
				targetType: assignGroup.target_type,
				targetId: assignGroup.target_id,
				assigneeId: member ? member.id : null,
			});
			toast.success(
				member
					? `Assigned report group to @${member.username || "moderator"}.`
					: "Cleared assignee on report group.",
				member ? "Moderator assigned" : "Report unassigned",
			);
			setAssignGroup(null);
		} catch (error) {
			toast.error(
				getErrorMessage(error, "Failed to assign moderator."),
				"Assignment failed",
			);
		} finally {
			setBusyGroupKey(null);
		}
	};

	const handleSubmitDecision = async (payload: ModerationDecisionPayload) => {
		if (!decisionGroup) return;
		const leadReportId = decisionGroup.reports[0]?.id;
		if (!leadReportId) {
			toast.error(
				"No report record was found in this group.",
				"Action failed",
			);
			return;
		}

		setBusyGroupKey(decisionGroup.key);
		try {
			await resolveMutation.mutateAsync({
				reportId: leadReportId,
				action: payload.action,
				moderatorNote: payload.moderatorNote,
				publicExplanation: payload.publicExplanation,
				applyToGroup: true,
			});
			const copy = ACTION_TOAST_COPY[payload.action];
			toast.success(copy.message, copy.title);
			setDecisionGroup(null);
		} catch (error) {
			toast.error(
				getErrorMessage(error, "Failed to apply moderation decision."),
				"Moderation action failed",
			);
			throw error;
		} finally {
			setBusyGroupKey(null);
		}
	};

	const handleConfirmBulkDismiss = async () => {
		if (selectedReportIds.length === 0) return;
		triggerHaptic();
		try {
			const result = await bulkDismissMutation.mutateAsync({
				reportIds: selectedReportIds,
				moderatorNote: bulkNote.trim() || undefined,
			});
			toast.success(
				`Dismissed ${result.dismissedCount} open report${
					result.dismissedCount === 1 ? "" : "s"
				}.`,
				"Bulk dismiss complete",
			);
			setBulkConfirmOpen(false);
			setBulkNote("");
			setSelectedGroupKeys([]);
			setBulkMode(false);
		} catch (error) {
			toast.error(
				getErrorMessage(error, "Failed to dismiss selected reports."),
				"Bulk dismiss failed",
			);
		}
	};

	const isRefreshing =
		reportsQuery.isFetching ||
		(statusFilter !== "open" && openReportsQuery.isFetching);

	return (
		<View className="gap-4">
			{/* Guild Scoping Notification for House Mods */}
			{isHouseMod && userGuild ? (
				<View className="bg-card shadow-neo-xs">
					<View className="flex-row items-center gap-2 overflow-hidden border-2 border-border bg-neo-yellow/20 p-3">
						<Shield size={16} color="#000000" strokeWidth={2.4} />
						<Text className="flex-1 font-bold text-xs text-foreground uppercase">
							SCOPED TO HOUSE {userGuild.toUpperCase()} DISPATCHES
							&amp; POSTS
						</Text>
					</View>
				</View>
			) : null}

			{/* Queue Telemetry */}
			<ModerationQueueMetrics
				metrics={metrics}
				isHouseScoped={isHouseMod}
			/>

			{/* Search, Status Tabs, Bulk Mode & Filter/Sort Chips */}
			<ModerationFilterBar
				filters={filters}
				onChange={handleFiltersChange}
				onRefresh={handleRefresh}
				isRefreshing={isRefreshing}
				bulkMode={bulkMode}
				onToggleBulkMode={handleToggleBulkMode}
			/>

			{/* Bulk Triage Bar (only on open reports) */}
			{bulkMode && statusFilter === "open" ? (
				<View className="bg-card shadow-neo-sm">
					<View className="gap-3 overflow-hidden border-2 border-border bg-neo-yellow/20 p-3">
						<View className="flex-row flex-wrap items-center justify-between gap-2">
							<View className="flex-row items-center gap-1.5">
								<CheckSquare
									size={15}
									color="#000000"
									strokeWidth={2.5}
								/>
								<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
									BULK TRIAGE MODE
								</Text>
							</View>
							<Text className="font-mono text-xs text-foreground uppercase tabular-nums">
								{selectedGroups.length} TARGET
								{selectedGroups.length === 1 ? "" : "S"} ·{" "}
								{selectedReportIds.length} REPORT
								{selectedReportIds.length === 1 ? "" : "S"}
							</Text>
						</View>

						<View className="flex-row flex-wrap items-center gap-2">
							<NeoButton
								size="sm"
								variant="outline"
								disabled={
									openSelectableGroups.length === 0 ||
									allOpenSelected ||
									bulkDismissMutation.isPending
								}
								onPress={handleSelectAllOpen}>
								SELECT ALL
							</NeoButton>

							<NeoButton
								size="sm"
								variant="outline"
								disabled={
									selectedGroups.length === 0 ||
									bulkDismissMutation.isPending
								}
								onPress={handleClearSelection}>
								CLEAR
							</NeoButton>

							<NeoButton
								size="sm"
								variant="primary"
								className="flex-1"
								disabled={
									selectedReportIds.length === 0 ||
									bulkDismissMutation.isPending
								}
								startContent={
									<XCircle
										size={14}
										color="#faf9f5"
										strokeWidth={2.4}
									/>
								}
								onPress={() => {
									triggerHaptic();
									setBulkConfirmOpen(true);
								}}>
								DISMISS SELECTED ({selectedReportIds.length})
							</NeoButton>
						</View>
					</View>
				</View>
			) : null}

			{/* Queue List Content */}
			{reportsQuery.isLoading ? (
				<View className="items-center justify-center py-12">
					<ActivityIndicator size="large" color="#000000" />
					<Text className="mt-3 font-mono text-xs text-muted-foreground uppercase">
						Scanning incident reports...
					</Text>
				</View>
			) : reportsQuery.isError ? (
				<View className="bg-card shadow-neo">
					<View className="items-center gap-3 overflow-hidden border-2 border-destructive bg-card p-6">
						<AlertTriangle
							size={30}
							color="#ff2a00"
							strokeWidth={2.4}
						/>
						<Text className="font-display text-base text-foreground uppercase">
							QUEUE LOAD FAILED
						</Text>
						<Text className="text-center font-mono text-xs text-muted-foreground">
							{getErrorMessage(
								reportsQuery.error,
								"Could not load moderation reports.",
							)}
						</Text>
						<NeoButton
							size="sm"
							variant="outline"
							startContent={
								<RefreshCw
									size={13}
									color="#000000"
									strokeWidth={2.5}
								/>
							}
							onPress={handleRefresh}>
							RETRY
						</NeoButton>
					</View>
				</View>
			) : sortedGroups.length === 0 ? (
				<NeoCard
					variant="default"
					className="items-center justify-center p-8 text-center shadow-neo">
					<ShieldCheck size={36} color="#000000" strokeWidth={2.2} />
					<Text className="mt-2 font-display text-base text-foreground uppercase">
						{hasActiveTriageFilters
							? "NO MATCHING REPORTS"
							: "ZERO INCIDENTS"}
					</Text>
					<Text className="mt-1 max-w-xs text-center font-mono text-xs text-muted-foreground">
						{hasActiveTriageFilters
							? "No grouped reports match your current search or triage filters."
							: `No ${
									statusFilter === "all" ? "" : statusFilter
								} moderation reports found. The network is currently compliant, for now.`}
					</Text>
					{hasActiveTriageFilters ? (
						<View className="mt-4">
							<NeoButton
								size="sm"
								variant="outline"
								onPress={() => {
									triggerHaptic();
									setFilters({
										...DEFAULT_FILTERS,
										status: statusFilter,
									});
								}}>
								RESET FILTERS
							</NeoButton>
						</View>
					) : null}
				</NeoCard>
			) : (
				<View className="gap-3">
					{sortedGroups.map((group) => {
						const isGroupBusy =
							busyGroupKey === group.key &&
							(assignMutation.isPending ||
								resolveMutation.isPending);
						return (
							<GroupedReportCard
								key={group.key}
								group={group}
								currentUserId={currentUserId}
								canAssignOthers={canAssignOthers}
								isBusy={isGroupBusy}
								bulkMode={bulkMode && statusFilter === "open"}
								isSelected={selectedKeySet.has(group.key)}
								onToggleSelect={handleToggleSelectGroup}
								onInspectContext={(target) =>
									setInspectGroup(target)
								}
								onOpenDecision={(target) =>
									setDecisionGroup(target)
								}
								onClaimToggle={(target) => {
									void handleClaimToggle(target);
								}}
								onAssignOther={
									canAssignOthers
										? (target) => setAssignGroup(target)
										: undefined
								}
							/>
						);
					})}
				</View>
			)}

			{/* Report Context Inspector Sheet */}
			<ReportContextSheet
				group={inspectGroup}
				open={Boolean(inspectGroup)}
				onOpenChange={(open) => {
					if (!open) setInspectGroup(null);
				}}
				onTakeAction={(group) => {
					setInspectGroup(null);
					setDecisionGroup(group);
				}}
			/>

			{/* Graduated Moderation Decision Sheet */}
			<ModerationDecisionSheet
				group={decisionGroup}
				open={Boolean(decisionGroup)}
				onOpenChange={(open) => {
					if (!open && !resolveMutation.isPending) {
						setDecisionGroup(null);
					}
				}}
				isSubmitting={resolveMutation.isPending}
				onSubmit={handleSubmitDecision}
			/>

			{/* Admin Staff Assignment Sheet */}
			<MobileSheet
				open={Boolean(assignGroup)}
				onOpenChange={(open) => {
					if (!open && !assignMutation.isPending) {
						setAssignGroup(null);
					}
				}}
				size="half"
				title="ASSIGN MODERATOR"
				subtitle={
					assignGroup
						? `${assignGroup.target_type.toUpperCase()} · ${assignGroup.count} REPORT${
								assignGroup.count === 1 ? "" : "S"
							}`
						: undefined
				}>
				<MobileSheet.Body contentContainerStyle={{ paddingBottom: 16 }}>
					<View className="gap-3 pt-1">
						{/* Unassign Option */}
						<View className="bg-card shadow-neo-xs">
							<Pressable
								disabled={
									assignMutation.isPending ||
									!assignGroup?.assigned_to
								}
								onPress={() => void handleAssignStaff(null)}
								accessibilityRole="button"
								accessibilityLabel="Unassign report group"
								className={`flex-row items-center justify-between gap-2 overflow-hidden border-2 border-border bg-secondary p-3 ${
									assignMutation.isPending ||
									!assignGroup?.assigned_to
										? "opacity-50"
										: "active:bg-card"
								}`}>
								<View className="flex-row items-center gap-2">
									<UserMinus
										size={15}
										color="#000000"
										strokeWidth={2.4}
									/>
									<View>
										<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
											UNASSIGN
										</Text>
										<Text className="font-mono text-2xs text-muted-foreground">
											Return to unassigned queue
										</Text>
									</View>
								</View>
								{!assignGroup?.assigned_to ? (
									<View className="border border-border bg-card px-1.5 py-0.5">
										<Text className="font-bold text-3xs tracking-wider text-foreground uppercase">
											CURRENT
										</Text>
									</View>
								) : null}
							</Pressable>
						</View>

						{/* Staff Roster */}
						<View className="gap-2">
							<View className="flex-row items-center gap-1.5">
								<Users
									size={13}
									color="#000000"
									strokeWidth={2.4}
								/>
								<Text className="font-bold text-xs tracking-wider text-muted-foreground uppercase">
									ELIGIBLE STAFF
								</Text>
							</View>

							{staffQuery.isLoading ? (
								<View className="items-center justify-center py-8">
									<ActivityIndicator
										size="small"
										color="#000000"
									/>
									<Text className="mt-2 font-mono text-xs text-muted-foreground uppercase">
										Loading staff roster...
									</Text>
								</View>
							) : staffQuery.isError ? (
								<View className="items-center gap-2 border-2 border-destructive bg-card p-4">
									<Text className="text-center font-mono text-xs text-destructive">
										{getErrorMessage(
											staffQuery.error,
											"Failed to load moderators.",
										)}
									</Text>
									<NeoButton
										size="sm"
										variant="outline"
										onPress={() =>
											void staffQuery.refetch()
										}>
										RETRY
									</NeoButton>
								</View>
							) : (staffQuery.data ?? []).length === 0 ? (
								<View className="border-2 border-border bg-secondary p-4">
									<Text className="font-mono text-xs text-muted-foreground">
										No eligible staff moderators found for
										this report.
									</Text>
								</View>
							) : (
								<View className="gap-2">
									{(staffQuery.data ?? []).map((member) => {
										const isCurrent =
											assignGroup?.assigned_to ===
											member.id;
										const isSelf =
											currentUserId === member.id;
										return (
											<View
												key={member.id}
												className="bg-card shadow-neo-xs">
												<Pressable
													disabled={
														assignMutation.isPending
													}
													onPress={() =>
														void handleAssignStaff(
															member,
														)
													}
													accessibilityRole="button"
													accessibilityLabel={`Assign to ${
														member.username ||
														"moderator"
													}`}
													accessibilityState={{
														selected: isCurrent,
													}}
													className={`flex-row items-center justify-between gap-2 overflow-hidden border-2 border-border p-3 ${
														isCurrent
															? "bg-neo-green/20"
															: "bg-card active:bg-secondary"
													} ${
														assignMutation.isPending
															? "opacity-60"
															: ""
													}`}>
													<View className="min-w-0 flex-1 gap-1">
														<View className="flex-row flex-wrap items-center gap-1.5">
															<Text
																numberOfLines={
																	1
																}
																className="font-bold text-xs text-foreground">
																@
																{member.username ||
																	"moderator"}
																{isSelf
																	? " (YOU)"
																	: ""}
															</Text>
															<View className="border border-border bg-secondary px-1.5 py-0.5">
																<Text className="font-bold text-3xs tracking-wider text-foreground uppercase">
																	{
																		ROLE_LABELS[
																			member
																				.role
																		]
																	}
																</Text>
															</View>
															{member.guild ? (
																<GuildBadge
																	guildId={
																		member.guild
																	}
																	size="sm"
																/>
															) : null}
														</View>
														{member.display_name &&
														member.display_name !==
															member.username ? (
															<Text
																numberOfLines={
																	1
																}
																className="font-mono text-2xs text-muted-foreground">
																{
																	member.display_name
																}
															</Text>
														) : null}
													</View>

													{isCurrent ? (
														<View className="size-6 items-center justify-center border-2 border-border bg-primary">
															<Check
																size={13}
																color="#faf9f5"
																strokeWidth={3}
															/>
														</View>
													) : null}
												</Pressable>
											</View>
										);
									})}
								</View>
							)}
						</View>
					</View>
				</MobileSheet.Body>
			</MobileSheet>

			{/* Bulk Dismiss Confirmation Sheet */}
			<MobileSheet
				open={bulkConfirmOpen}
				onOpenChange={(open) => {
					if (!open && !bulkDismissMutation.isPending) {
						setBulkConfirmOpen(false);
					}
				}}
				size="full"
				title="BULK DISMISS REPORTS"
				subtitle={`${selectedGroups.length} TARGET${
					selectedGroups.length === 1 ? "" : "S"
				} · ${selectedReportIds.length} OPEN REPORT${
					selectedReportIds.length === 1 ? "" : "S"
				}`}>
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : undefined}
					className="flex-1">
					<MobileSheet.Body
						keyboardShouldPersistTaps="handled"
						automaticallyAdjustKeyboardInsets
						contentContainerStyle={{ paddingBottom: 16 }}>
						<View className="gap-4 pt-1">
							<View className="bg-card shadow-neo-xs">
								<View className="gap-1.5 overflow-hidden border-2 border-border bg-secondary p-3">
									<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
										CONFIRM BULK DISMISSAL
									</Text>
									<Text className="font-mono text-xs leading-relaxed text-foreground">
										This will dismiss{" "}
										{selectedReportIds.length} open report
										{selectedReportIds.length === 1
											? ""
											: "s"}{" "}
										across {selectedGroups.length} target
										{selectedGroups.length === 1 ? "" : "s"}
										, log each decision in the moderation
										audit trail, and notify reporters.
									</Text>
								</View>
							</View>

							{/* Internal Audit Note — Staff Only */}
							<View className="bg-card shadow-neo-sm">
								<View className="overflow-hidden border-2 border-border bg-card p-3">
									<View className="mb-2 flex-row items-center justify-between gap-2">
										<View className="flex-1 flex-row items-center gap-1.5">
											<Lock
												size={14}
												color="#000000"
												strokeWidth={2.5}
											/>
											<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
												INTERNAL MOD NOTE — STAFF ONLY
											</Text>
										</View>
										<View className="border border-border bg-neo-yellow px-1.5 py-0.5">
											<Text className="font-bold text-3xs tracking-wider text-foreground uppercase">
												PRIVATE
											</Text>
										</View>
									</View>

									<TextInput
										value={bulkNote}
										onChangeText={setBulkNote}
										placeholder="Add internal audit context for this bulk dismissal (optional)..."
										placeholderTextColor="rgba(0, 0, 0, 0.45)"
										multiline
										maxLength={1000}
										editable={
											!bulkDismissMutation.isPending
										}
										accessibilityLabel="Internal moderator note, staff only"
										style={{
											minHeight: 84,
											textAlignVertical: "top",
										}}
										className="border-2 border-border bg-surface p-3 font-mono text-xs leading-relaxed text-foreground"
									/>

									<Text className="mt-1.5 font-mono text-2xs text-muted-foreground">
										Never sent to reporters or reported
										authors. Visible only to moderation
										staff.
									</Text>
								</View>
							</View>
						</View>
					</MobileSheet.Body>

					<MobileSheet.Footer className="pt-3 pb-2">
						<View className="flex-row gap-2">
							<NeoButton
								variant="outline"
								disabled={bulkDismissMutation.isPending}
								onPress={() => setBulkConfirmOpen(false)}>
								CANCEL
							</NeoButton>
							<NeoButton
								variant="primary"
								className="flex-1"
								loading={bulkDismissMutation.isPending}
								disabled={
									bulkDismissMutation.isPending ||
									selectedReportIds.length === 0
								}
								startContent={
									<XCircle
										size={15}
										color="#faf9f5"
										strokeWidth={2.5}
									/>
								}
								onPress={() => void handleConfirmBulkDismiss()}>
								DISMISS {selectedReportIds.length} REPORT
								{selectedReportIds.length === 1 ? "" : "S"}
							</NeoButton>
						</View>
					</MobileSheet.Footer>
				</KeyboardAvoidingView>
			</MobileSheet>
		</View>
	);
}
