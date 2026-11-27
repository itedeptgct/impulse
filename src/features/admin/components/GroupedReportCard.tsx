import { formatRelativeTime } from "@lib/date";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import {
	ArrowUpRight,
	CheckCircle,
	CheckSquare,
	ChevronDown,
	ChevronUp,
	Eye,
	FileText,
	Flag,
	MessageSquare,
	Shield,
	ShieldAlert,
	Square,
	User,
	UserCheck,
	UserPlus,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { GuildBadge } from "@/features/guilds/components/GuildBadge";
import type {
	GroupedModerationReport,
	ModerationActionType,
	ReportReason,
	ReportStatus,
} from "@/features/moderation/types";

export interface GroupedReportCardProps {
	group: GroupedModerationReport;
	currentUserId?: string | null;
	canAssignOthers?: boolean;
	isBusy?: boolean;
	bulkMode?: boolean;
	isSelected?: boolean;
	onToggleSelect?: (group: GroupedModerationReport) => void;
	onInspectContext: (group: GroupedModerationReport) => void;
	onOpenDecision: (group: GroupedModerationReport) => void;
	onClaimToggle: (group: GroupedModerationReport) => void;
	onAssignOther?: (group: GroupedModerationReport) => void;
}

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

const REASON_META: Record<
	ReportReason,
	{ label: string; containerClass: string; textClass: string }
> = {
	spam: {
		label: "SPAM",
		containerClass: "bg-neo-yellow",
		textClass: "text-foreground",
	},
	harassment: {
		label: "HARASSMENT",
		containerClass: "bg-destructive",
		textClass: "text-primary-foreground",
	},
	misinformation: {
		label: "MISINFO",
		containerClass: "bg-neo-magenta",
		textClass: "text-primary-foreground",
	},
	inappropriate: {
		label: "INAPPROPRIATE",
		containerClass: "bg-destructive",
		textClass: "text-primary-foreground",
	},
	other: {
		label: "OTHER",
		containerClass: "bg-secondary",
		textClass: "text-foreground",
	},
};

const STATUS_META: Record<
	ReportStatus,
	{ label: string; containerClass: string; textClass: string }
> = {
	open: {
		label: "OPEN",
		containerClass: "bg-neo-yellow",
		textClass: "text-foreground",
	},
	resolved: {
		label: "RESOLVED",
		containerClass: "bg-neo-green",
		textClass: "text-foreground",
	},
	dismissed: {
		label: "DISMISSED",
		containerClass: "bg-secondary",
		textClass: "text-foreground",
	},
};

const ACTION_META: Record<
	ModerationActionType,
	{ label: string; containerClass: string; textClass: string }
> = {
	dismiss: {
		label: "DISMISSED",
		containerClass: "bg-secondary",
		textClass: "text-foreground",
	},
	warn: {
		label: "WARNED",
		containerClass: "bg-neo-yellow",
		textClass: "text-foreground",
	},
	restrict_24h: {
		label: "RESTRICTED 24H",
		containerClass: "bg-neo-magenta",
		textClass: "text-primary-foreground",
	},
	restrict_7d: {
		label: "RESTRICTED 7D",
		containerClass: "bg-destructive",
		textClass: "text-primary-foreground",
	},
	remove_content: {
		label: "PURGED",
		containerClass: "bg-destructive",
		textClass: "text-primary-foreground",
	},
};

/**
 * Unified neo-brutalist card for grouped moderation reports with claim/assign controls,
 * direct post/thread navigation, expandable duplicate reporters, and decision audit footer.
 */
export function GroupedReportCard({
	group,
	currentUserId = null,
	canAssignOthers = false,
	isBusy = false,
	bulkMode = false,
	isSelected = false,
	onToggleSelect,
	onInspectContext,
	onOpenDecision,
	onClaimToggle,
	onAssignOther,
}: GroupedReportCardProps) {
	const [showAllReports, setShowAllReports] = useState(false);

	const isOpen = group.status === "open";
	const isPost = group.target_type === "post";
	const isAssigned = Boolean(group.assigned_to);
	const isClaimedByMe = Boolean(
		currentUserId && group.assigned_to === currentUserId,
	);

	const uniqueReasons = useMemo(
		() => Array.from(new Set(group.reasons)),
		[group.reasons],
	);

	const primaryReport = useMemo(
		() =>
			group.reports.find((report) => Boolean(report.details?.trim())) ??
			group.reports[0] ??
			null,
		[group.reports],
	);

	const targetHref = useMemo(() => {
		if (!group.target_post_id) return null;
		if (!isPost) {
			return `/post/${group.target_post_id}?commentId=${encodeURIComponent(group.target_id)}`;
		}
		return `/post/${group.target_post_id}`;
	}, [group.target_id, group.target_post_id, isPost]);

	const statusMeta = STATUS_META[group.status];
	const authorUsername = group.target_author?.username || "unknown";
	const isAuthorRestricted = Boolean(
		group.target_author?.restricted_until &&
		Date.parse(group.target_author.restricted_until) > Date.now(),
	);

	const resolutionActionMeta = group.resolution_action
		? ACTION_META[group.resolution_action]
		: group.status === "dismissed"
			? ACTION_META.dismiss
			: {
					label: "RESOLVED",
					containerClass: "bg-neo-green",
					textClass: "text-foreground",
				};

	const handlerUsername = group.resolver?.username || "moderator";

	return (
		<View className="bg-card shadow-neo">
			<View className="overflow-hidden border-2 border-border bg-card">
				{/* Header Strip */}
				<View
					className={`flex-row items-start justify-between gap-2 border-b-2 border-border px-3.5 py-2.5 ${
						bulkMode && isOpen && isSelected
							? "bg-neo-yellow/25"
							: "bg-surface"
					}`}>
					<View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-1.5">
						{bulkMode && isOpen ? (
							<Pressable
								onPress={() => {
									triggerHaptic();
									onToggleSelect?.(group);
								}}
								disabled={!onToggleSelect || isBusy}
								hitSlop={8}
								accessibilityRole="checkbox"
								accessibilityState={{ checked: isSelected }}
								accessibilityLabel={
									isSelected
										? "Deselect report group"
										: "Select report group"
								}
								className="mr-0.5 items-center justify-center active:opacity-75">
								{isSelected ? (
									<CheckSquare
										size={18}
										color="#000000"
										strokeWidth={2.5}
									/>
								) : (
									<Square
										size={18}
										color="#000000"
										strokeWidth={2.5}
									/>
								)}
							</Pressable>
						) : null}

						{/* Target Type Pill */}
						<View
							className={`flex-row items-center gap-1 border border-border px-1.5 py-0.5 ${
								isPost ? "bg-primary" : "bg-neo-magenta"
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
							<Text className="font-bold text-3xs tracking-wider text-primary-foreground uppercase">
								{isPost ? "POST" : "COMMENT"}
							</Text>
						</View>

						{/* Duplicate Count Badge */}
						{group.count > 1 ? (
							<View className="border border-border bg-neo-cyan px-1.5 py-0.5">
								<Text className="font-bold text-3xs tracking-wider text-foreground uppercase tabular-nums">
									{group.count} REPORTS
								</Text>
							</View>
						) : null}

						{/* Unique Reason Pills */}
						{uniqueReasons.map((reason) => {
							const meta = REASON_META[reason];
							return (
								<View
									key={reason}
									className={`border border-border px-1.5 py-0.5 ${meta.containerClass}`}>
									<Text
										className={`font-bold text-3xs tracking-wider uppercase ${meta.textClass}`}>
										{meta.label}
									</Text>
								</View>
							);
						})}

						{/* House Badge */}
						{group.guild ? (
							<GuildBadge guildId={group.guild} size="sm" />
						) : null}

						{/* Status Stamp */}
						<View
							className={`border border-border px-1.5 py-0.5 ${statusMeta.containerClass}`}>
							<Text
								className={`font-bold text-3xs tracking-wider uppercase ${statusMeta.textClass}`}>
								{statusMeta.label}
							</Text>
						</View>
					</View>

					{/* Oldest Report Age */}
					<Text className="shrink-0 pt-0.5 font-mono text-2xs tracking-wider text-muted-foreground uppercase tabular-nums">
						{formatRelativeTime(group.oldest_created_at)}
					</Text>
				</View>

				{/* Assignment Bar (when open) */}
				{isOpen ? (
					<View className="flex-row items-center justify-between gap-2 border-b-2 border-border bg-secondary px-3.5 py-2">
						<View className="min-w-0 flex-1 flex-row items-center gap-1.5">
							{isAssigned ? (
								<UserCheck
									size={14}
									color={
										isClaimedByMe ? "#008033" : "#000000"
									}
									strokeWidth={2.4}
								/>
							) : (
								<User
									size={14}
									color="#4c4546"
									strokeWidth={2.2}
								/>
							)}
							<Text
								numberOfLines={1}
								className="min-w-0 flex-1 font-mono text-xs text-muted-foreground">
								{isAssigned ? (
									<>
										Claimed by{" "}
										<Text className="font-bold text-foreground">
											@
											{group.assignee?.username ||
												"moderator"}
										</Text>
									</>
								) : (
									"Unassigned"
								)}
							</Text>
						</View>

						<View className="shrink-0 flex-row items-center gap-1.5">
							<Pressable
								onPress={() => {
									triggerHaptic();
									onClaimToggle(group);
								}}
								disabled={isBusy}
								accessibilityRole="button"
								accessibilityLabel={
									isClaimedByMe
										? "Unclaim report group"
										: "Claim report group"
								}
								className={`border-2 border-border px-2.5 py-1 shadow-neo-xs ${
									isClaimedByMe ? "bg-card" : "bg-neo-green"
								} ${isBusy ? "opacity-50" : "active:opacity-75"}`}>
								<Text className="font-bold text-3xs tracking-wider text-foreground uppercase">
									{isClaimedByMe ? "UNCLAIM" : "CLAIM"}
								</Text>
							</Pressable>

							{canAssignOthers && onAssignOther ? (
								<Pressable
									onPress={() => {
										triggerHaptic();
										onAssignOther(group);
									}}
									disabled={isBusy}
									accessibilityRole="button"
									accessibilityLabel="Assign report group to staff member"
									className={`flex-row items-center gap-1 border-2 border-border bg-card px-2 py-1 shadow-neo-xs ${
										isBusy
											? "opacity-50"
											: "active:opacity-75"
									}`}>
									<UserPlus
										size={11}
										color="#000000"
										strokeWidth={2.5}
									/>
									<Text className="font-bold text-3xs tracking-wider text-foreground uppercase">
										ASSIGN
									</Text>
								</Pressable>
							) : null}
						</View>
					</View>
				) : null}

				{/* Content Reference & Reporters */}
				<View className="gap-3 p-3.5">
					{/* Content Reference Block */}
					<View className="border-2 border-border bg-secondary p-3 shadow-neo-xs">
						<View className="flex-row items-center justify-between gap-2">
							<View className="min-w-0 flex-1 flex-row items-center gap-1.5">
								<Text
									numberOfLines={1}
									className="shrink font-bold text-xs tracking-wider text-foreground">
									@{authorUsername}
								</Text>
								{isAuthorRestricted ? (
									<View className="border border-border bg-destructive px-1.5 py-0.5">
										<Text className="font-bold text-3xs tracking-wider text-primary-foreground uppercase">
											RESTRICTED
										</Text>
									</View>
								) : null}
							</View>
							<Text className="shrink-0 font-mono text-3xs tracking-wider text-muted-foreground uppercase">
								REPORTED {isPost ? "POST" : "COMMENT"}
							</Text>
						</View>

						<Text
							numberOfLines={3}
							className="mt-1.5 font-mono text-xs leading-relaxed text-foreground select-text">
							{group.target_snippet ||
								"[Content unavailable or deleted]"}
						</Text>

						{/* Navigation Paths */}
						<View className="mt-2.5 flex-row flex-wrap items-center gap-2 border-t border-border/20 pt-2.5">
							<Pressable
								onPress={() => {
									triggerHaptic();
									onInspectContext(group);
								}}
								disabled={isBusy}
								accessibilityRole="button"
								accessibilityLabel="Inspect moderation context"
								className={`flex-row items-center gap-1 border border-border bg-surface px-2 py-1 ${
									isBusy
										? "opacity-50"
										: "active:bg-secondary"
								}`}>
								<Eye
									size={12}
									color="#000000"
									strokeWidth={2.5}
								/>
								<Text className="font-bold text-3xs tracking-wider text-foreground uppercase">
									INSPECT CONTEXT
								</Text>
							</Pressable>

							{targetHref ? (
								<Pressable
									onPress={() => {
										triggerHaptic();
										router.push(targetHref as any);
									}}
									accessibilityRole="button"
									accessibilityLabel={
										isPost
											? "View reported post"
											: "View comment thread"
									}
									className="flex-row items-center gap-1 border border-border bg-surface px-2 py-1 active:bg-secondary">
									<Text className="font-bold text-3xs tracking-wider text-foreground uppercase">
										{isPost ? "VIEW POST" : "VIEW THREAD"}
									</Text>
									<ArrowUpRight
										size={12}
										color="#000000"
										strokeWidth={2.5}
									/>
								</Pressable>
							) : null}
						</View>
					</View>

					{/* Expandable Reporter List */}
					<View className="gap-2">
						{!showAllReports && primaryReport ? (
							<View className="gap-1.5">
								<View className="flex-row items-center justify-between gap-2">
									<View className="min-w-0 flex-1 flex-row items-center gap-1.5">
										<Flag
											size={12}
											color="#000000"
											strokeWidth={2.2}
										/>
										<Text
											numberOfLines={1}
											className="min-w-0 flex-1 font-mono text-2xs text-muted-foreground">
											Reported by{" "}
											<Text className="font-bold text-foreground">
												@
												{primaryReport.reporter
													?.username || "student"}
											</Text>
										</Text>
									</View>
									<Text className="shrink-0 font-mono text-2xs text-muted-foreground uppercase tabular-nums">
										{formatRelativeTime(
											primaryReport.created_at,
										)}
									</Text>
								</View>

								{primaryReport.details?.trim() ? (
									<View className="border border-border/40 bg-surface p-2.5">
										<Text className="font-bold text-3xs tracking-wider text-muted-foreground uppercase">
											REPORTER DETAILS
										</Text>
										<Text className="mt-0.5 font-mono-italic text-xs text-foreground">
											"{primaryReport.details.trim()}"
										</Text>
									</View>
								) : null}
							</View>
						) : null}

						{group.count > 1 ? (
							<>
								<Pressable
									onPress={() => {
										triggerHaptic();
										setShowAllReports((prev) => !prev);
									}}
									accessibilityRole="button"
									accessibilityState={{
										expanded: showAllReports,
									}}
									accessibilityLabel={
										showAllReports
											? `Hide all ${group.count} reports`
											: `Show all ${group.count} reports`
									}
									className="flex-row items-center justify-between border border-border bg-surface px-2.5 py-2 active:bg-secondary">
									<Text className="font-bold text-3xs tracking-wider text-foreground uppercase tabular-nums">
										{showAllReports
											? `HIDE ALL ${group.count} REPORTS`
											: `SHOW ALL ${group.count} REPORTS`}
									</Text>
									{showAllReports ? (
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
								</Pressable>

								{showAllReports ? (
									<View className="gap-2">
										{group.reports.map((report) => {
											const reasonMeta =
												REASON_META[report.reason];
											return (
												<View
													key={report.id}
													className="border border-border bg-surface p-2.5">
													<View className="flex-row items-center justify-between gap-2">
														<View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-1.5">
															<Flag
																size={11}
																color="#000000"
																strokeWidth={
																	2.2
																}
															/>
															<Text
																numberOfLines={
																	1
																}
																className="shrink font-bold text-2xs text-foreground">
																@
																{report.reporter
																	?.username ||
																	"student"}
															</Text>
															<View
																className={`border border-border px-1.5 py-0.5 ${reasonMeta.containerClass}`}>
																<Text
																	className={`font-bold text-3xs tracking-wider uppercase ${reasonMeta.textClass}`}>
																	{
																		reasonMeta.label
																	}
																</Text>
															</View>
														</View>

														<Text className="shrink-0 font-mono text-2xs text-muted-foreground uppercase tabular-nums">
															{formatRelativeTime(
																report.created_at,
															)}
														</Text>
													</View>

													{report.details?.trim() ? (
														<Text className="mt-1.5 font-mono-italic text-xs text-foreground">
															"
															{report.details.trim()}
															"
														</Text>
													) : null}
												</View>
											);
										})}
									</View>
								) : null}
							</>
						) : null}
					</View>
				</View>

				{/* Decision History Footer (when resolved/dismissed) */}
				{!isOpen ? (
					<View className="gap-2 border-t-2 border-border bg-secondary px-3.5 py-3">
						<View className="flex-row flex-wrap items-center justify-between gap-2">
							<View className="flex-row flex-wrap items-center gap-1.5">
								<View
									className={`border border-border px-1.5 py-0.5 ${resolutionActionMeta.containerClass}`}>
									<Text
										className={`font-bold text-3xs tracking-wider uppercase ${resolutionActionMeta.textClass}`}>
										{resolutionActionMeta.label}
									</Text>
								</View>

								<View className="flex-row items-center gap-1">
									<CheckCircle
										size={12}
										color="#008033"
										strokeWidth={2.4}
									/>
									<Text className="font-mono text-2xs text-muted-foreground">
										by{" "}
										<Text className="font-bold text-foreground">
											@{handlerUsername}
										</Text>
									</Text>
								</View>
							</View>

							{group.resolved_at ? (
								<Text className="font-mono text-2xs text-muted-foreground uppercase tabular-nums">
									{formatRelativeTime(group.resolved_at)}
								</Text>
							) : null}
						</View>

						{group.moderator_note?.trim() ? (
							<View className="border-2 border-border bg-card p-2.5">
								<View className="flex-row items-center gap-1">
									<Shield
										size={11}
										color="#000000"
										strokeWidth={2.4}
									/>
									<Text className="font-bold text-3xs tracking-wider text-muted-foreground uppercase">
										INTERNAL MOD NOTE
									</Text>
								</View>
								<Text className="mt-1 font-mono text-xs leading-relaxed text-foreground select-text">
									{group.moderator_note.trim()}
								</Text>
							</View>
						) : null}
					</View>
				) : null}

				{/* Docked Bottom Action Rail (when open & not in bulkMode) */}
				{isOpen && !bulkMode ? (
					<View className="flex-row border-t-2 border-border bg-surface">
						<Pressable
							onPress={() => {
								triggerHaptic();
								onInspectContext(group);
							}}
							disabled={isBusy}
							accessibilityRole="button"
							accessibilityLabel="Inspect report context"
							className={`flex-1 flex-row items-center justify-center gap-1.5 border-r-2 border-border px-3 py-3 ${
								isBusy ? "opacity-50" : "active:bg-secondary"
							}`}>
							<Eye size={14} color="#000000" strokeWidth={2.4} />
							<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
								INSPECT
							</Text>
						</Pressable>

						<Pressable
							onPress={() => {
								triggerHaptic();
								onOpenDecision(group);
							}}
							disabled={isBusy}
							accessibilityRole="button"
							accessibilityLabel="Take moderation action"
							className={`flex-1 flex-row items-center justify-center gap-1.5 bg-neo-yellow px-3 py-3 ${
								isBusy ? "opacity-50" : "active:opacity-80"
							}`}>
							<ShieldAlert
								size={14}
								color="#000000"
								strokeWidth={2.4}
							/>
							<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
								TAKE ACTION
							</Text>
						</Pressable>
					</View>
				) : null}
			</View>
		</View>
	);
}
