import * as Haptics from "expo-haptics";
import {
	AlertTriangle,
	Check,
	Clock,
	Lock,
	Megaphone,
	RotateCcw,
	ShieldAlert,
	ShieldCheck,
	Trash2,
	XCircle,
} from "lucide-react-native";
import { type ReactNode, useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";

import { MobileSheet, NeoButton } from "@/components/ui";
import { GuildBadge } from "@/features/guilds/components/GuildBadge";
import type {
	GroupedModerationReport,
	ModerationActionType,
	ReportReason,
} from "@/features/moderation/types";

export interface ModerationDecisionPayload {
	action: ModerationActionType;
	moderatorNote?: string;
	publicExplanation?: string;
}

export interface ModerationDecisionSheetProps {
	group: GroupedModerationReport | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	isSubmitting?: boolean;
	onSubmit: (payload: ModerationDecisionPayload) => Promise<void> | void;
}

interface ActionOptionConfig {
	value: ModerationActionType;
	title: string;
	badgeLabel: string;
	description: string;
	badgeClass: string;
	badgeTextClass: string;
	selectedBgClass: string;
	destructive?: boolean;
	renderIcon: (color: string) => ReactNode;
}

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

const DEFAULT_PUBLIC_EXPLANATIONS: Record<ReportReason, string> = {
	spam: "Your content was flagged as spam, repeated broadcasts, or unsolicited promotion.",
	harassment:
		"Your content violated community guidelines against harassment, bullying, or abusive behavior.",
	misinformation:
		"Your content was flagged for sharing false, deceptive, or misleading campus information.",
	inappropriate:
		"Your content violated community conduct guidelines regarding explicit, hateful, or inappropriate material.",
	other: "Your content violated campus community guidelines.",
};

const ACTION_OPTIONS: ActionOptionConfig[] = [
	{
		value: "dismiss",
		title: "Dismiss Report",
		badgeLabel: "NO ACTION",
		description: "No policy violation; closes matching open reports.",
		badgeClass: "bg-secondary",
		badgeTextClass: "text-foreground",
		selectedBgClass: "bg-card",
		renderIcon: (color) => (
			<XCircle size={16} color={color} strokeWidth={2.4} />
		),
	},
	{
		value: "warn",
		title: "Send Warning",
		badgeLabel: "WARNING",
		description:
			"Keeps content live, sends official warning notification to author, resolves open reports.",
		badgeClass: "bg-neo-yellow",
		badgeTextClass: "text-foreground",
		selectedBgClass: "bg-neo-yellow/20",
		renderIcon: (color) => (
			<AlertTriangle size={16} color={color} strokeWidth={2.4} />
		),
	},
	{
		value: "restrict_24h",
		title: "Restrict 24h",
		badgeLabel: "24H LOCK",
		description:
			"Temporarily restricts author from posting/commenting for 24 hours + notifies author.",
		badgeClass: "bg-neo-magenta",
		badgeTextClass: "text-primary-foreground",
		selectedBgClass: "bg-neo-magenta/10",
		renderIcon: (color) => (
			<Clock size={16} color={color} strokeWidth={2.4} />
		),
	},
	{
		value: "restrict_7d",
		title: "Restrict 7d",
		badgeLabel: "7D LOCK",
		description:
			"Temporarily restricts author from posting/commenting for 7 days + notifies author.",
		badgeClass: "bg-destructive",
		badgeTextClass: "text-destructive-foreground",
		selectedBgClass: "bg-destructive/10",
		renderIcon: (color) => (
			<ShieldAlert size={16} color={color} strokeWidth={2.4} />
		),
	},
	{
		value: "remove_content",
		title: "Purge Content",
		badgeLabel: "DESTRUCTIVE",
		description:
			"Permanently deletes the reported post/comment, resolves all matching open reports, notifies author with explanation & appeal option.",
		badgeClass: "bg-destructive",
		badgeTextClass: "text-destructive-foreground",
		selectedBgClass: "bg-destructive/10",
		destructive: true,
		renderIcon: (color) => (
			<Trash2 size={16} color={color} strokeWidth={2.4} />
		),
	},
];

function getDefaultExplanation(reason?: ReportReason | null): string {
	if (!reason) return DEFAULT_PUBLIC_EXPLANATIONS.other;
	return (
		DEFAULT_PUBLIC_EXPLANATIONS[reason] ?? DEFAULT_PUBLIC_EXPLANATIONS.other
	);
}

function getActionTitle(action: ModerationActionType): string {
	return (
		ACTION_OPTIONS.find((item) => item.value === action)?.title ??
		"Moderation Action"
	);
}

function ModerationDecisionForm({
	group,
	isSubmitting,
	onClose,
	onSubmit,
}: {
	group: GroupedModerationReport;
	isSubmitting: boolean;
	onClose: () => void;
	onSubmit: (payload: ModerationDecisionPayload) => Promise<void> | void;
}) {
	const defaultExplanation = getDefaultExplanation(group.primary_reason);

	const [selectedAction, setSelectedAction] =
		useState<ModerationActionType>("dismiss");
	const [moderatorNote, setModeratorNote] = useState(
		group.moderator_note?.trim() ?? "",
	);
	const [publicExplanation, setPublicExplanation] =
		useState(defaultExplanation);
	const [confirmingPurge, setConfirmingPurge] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const requiresPublicExplanation = selectedAction !== "dismiss";
	const isPurgeSelected = selectedAction === "remove_content";
	const hasTargetAuthor = Boolean(group.target_author?.id);
	const requiresTargetAuthor = (action: ModerationActionType) =>
		action === "warn" ||
		action === "restrict_24h" ||
		action === "restrict_7d";
	const targetLabel = group.target_type === "post" ? "post" : "comment";
	const authorHandle = group.target_author?.username
		? `@${group.target_author.username}`
		: "unknown author";

	const handleSelectAction = (action: ModerationActionType) => {
		if (isSubmitting) return;
		if (!hasTargetAuthor && requiresTargetAuthor(action)) return;
		triggerHaptic();
		setSelectedAction(action);
		setConfirmingPurge(false);
		setSubmitError(null);
	};

	const executeSubmit = async () => {
		if (isSubmitting) return;
		triggerHaptic();
		setSubmitError(null);

		const trimmedNote = moderatorNote.trim();
		const trimmedExplanation = publicExplanation.trim();

		const payload: ModerationDecisionPayload = {
			action: selectedAction,
			...(trimmedNote ? { moderatorNote: trimmedNote } : {}),
			...(requiresPublicExplanation && trimmedExplanation
				? { publicExplanation: trimmedExplanation }
				: {}),
		};

		try {
			await onSubmit(payload);
		} catch (err: unknown) {
			const message =
				err instanceof Error && err.message
					? err.message
					: "Failed to apply moderation decision. Please try again.";
			setSubmitError(message);
		}
	};

	const handlePrimaryPress = () => {
		if (isSubmitting) return;
		if (isPurgeSelected && !confirmingPurge) {
			triggerHaptic();
			setSubmitError(null);
			setConfirmingPurge(true);
			return;
		}
		void executeSubmit();
	};

	const submitButtonLabel = isPurgeSelected
		? confirmingPurge
			? "CONFIRM PERMANENT PURGE"
			: "REVIEW PURGE"
		: `APPLY: ${getActionTitle(selectedAction).toUpperCase()}`;

	const submitButtonVariant = isPurgeSelected ? "destructive" : "primary";

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			className="flex-1">
			<MobileSheet.Body
				keyboardShouldPersistTaps="handled"
				automaticallyAdjustKeyboardInsets
				contentContainerStyle={{ paddingBottom: 20 }}>
				<View className="gap-4 pt-1">
					{/* Target Report Summary */}
					<View className="bg-card shadow-neo-sm">
						<View className="overflow-hidden border-2 border-border bg-card">
							<View className="flex-row flex-wrap items-center justify-between gap-2 border-b-2 border-border bg-secondary px-3 py-2">
								<View className="flex-row flex-wrap items-center gap-1.5">
									<View className="border border-border bg-primary px-1.5 py-0.5">
										<Text className="font-bold text-3xs tracking-wider text-primary-foreground uppercase">
											{group.target_type}
										</Text>
									</View>
									<View className="border border-border bg-neo-yellow px-1.5 py-0.5">
										<Text className="font-bold text-3xs tracking-wider text-foreground uppercase">
											{group.primary_reason}
										</Text>
									</View>
									{group.guild ? (
										<GuildBadge
											guildId={group.guild}
											size="sm"
										/>
									) : null}
								</View>
								<Text className="font-mono text-2xs text-muted-foreground uppercase tabular-nums">
									{group.count} OPEN REPORT
									{group.count === 1 ? "" : "S"}
								</Text>
							</View>

							<View className="gap-1.5 p-3">
								<Text className="font-mono text-2xs text-muted-foreground uppercase">
									AUTHOR:{" "}
									<Text className="font-bold text-foreground">
										{authorHandle}
									</Text>
								</Text>
								<Text
									numberOfLines={2}
									className="font-mono text-xs leading-relaxed text-foreground">
									{group.target_snippet?.trim() ||
										"[Content unavailable or deleted]"}
								</Text>
							</View>
						</View>
					</View>

					{confirmingPurge ? (
						/* Step 2: Explicit Destructive Confirmation Gate for Purge Content */
						<View className="bg-surface shadow-neo">
							<View className="overflow-hidden border-2 border-destructive bg-surface">
								<View className="flex-row items-center gap-2 border-b-2 border-destructive bg-destructive px-3.5 py-2.5">
									<AlertTriangle
										size={16}
										color="#faf9f5"
										strokeWidth={2.5}
									/>
									<Text className="flex-1 font-bold text-xs tracking-wider text-destructive-foreground uppercase">
										CONFIRM PERMANENT CONTENT PURGE
									</Text>
								</View>

								<View className="gap-3 p-3.5">
									<Text className="font-mono text-xs leading-relaxed text-foreground">
										You are about to permanently delete this{" "}
										{targetLabel}. This action cannot be
										undone.
									</Text>

									<View className="gap-1.5 border-2 border-border bg-card p-3">
										<Text className="font-bold text-2xs tracking-wider text-foreground uppercase">
											ENFORCEMENT SUMMARY
										</Text>
										<Text className="font-mono text-xs text-foreground">
											• Permanently deletes the reported{" "}
											{targetLabel}
										</Text>
										<Text className="font-mono text-xs text-foreground">
											• Resolves {group.count} matching
											open report
											{group.count === 1 ? "" : "s"}
										</Text>
										<Text className="font-mono text-xs text-foreground">
											• Notifies {authorHandle} with
											explanation &amp; appeal option
										</Text>
									</View>

									<View className="gap-1 border-2 border-border bg-secondary p-3">
										<Text className="font-bold text-2xs tracking-wider text-foreground uppercase">
											USER-FACING EXPLANATION PREVIEW
										</Text>
										<Text className="font-mono text-xs leading-relaxed text-foreground">
											{publicExplanation.trim() ||
												defaultExplanation}
										</Text>
									</View>

									{moderatorNote.trim() ? (
										<View className="gap-1 border-2 border-border bg-card p-3">
											<View className="flex-row items-center gap-1.5">
												<Lock
													size={12}
													color="#000000"
													strokeWidth={2.5}
												/>
												<Text className="font-bold text-2xs tracking-wider text-foreground uppercase">
													INTERNAL MOD NOTE — STAFF
													ONLY
												</Text>
											</View>
											<Text className="font-mono text-xs text-muted-foreground">
												{moderatorNote.trim()}
											</Text>
										</View>
									) : null}
								</View>
							</View>
						</View>
					) : (
						/* Step 1: Graduated Actions + Staff Note + User Explanation */
						<>
							<View className="gap-2">
								<Text className="font-bold text-xs tracking-wider text-muted-foreground uppercase">
									SELECT GRADUATED ACTION
								</Text>

								{ACTION_OPTIONS.map((option) => {
									const isSelected =
										selectedAction === option.value;
									const isDestructive = Boolean(
										option.destructive,
									);
									const isAuthorUnavailable =
										!hasTargetAuthor &&
										requiresTargetAuthor(option.value);
									const isOptionDisabled =
										isSubmitting || isAuthorUnavailable;
									const iconColor = isDestructive
										? isSelected
											? "#faf9f5"
											: "#ff2a00"
										: isSelected
											? "#faf9f5"
											: "#000000";

									return (
										<View
											key={option.value}
											className={`${
												isSelected
													? "bg-surface shadow-neo"
													: "bg-surface shadow-neo-sm"
											} ${isAuthorUnavailable ? "opacity-55" : ""}`}>
											<Pressable
												disabled={isOptionDisabled}
												onPress={() =>
													handleSelectAction(
														option.value,
													)
												}
												accessibilityRole="radio"
												accessibilityState={{
													checked: isSelected,
													disabled: isOptionDisabled,
												}}
												accessibilityLabel={
													isAuthorUnavailable
														? `${option.title} (Author unavailable)`
														: option.title
												}
												className={`overflow-hidden border-2 p-3 active:opacity-90 ${
													isDestructive
														? isSelected
															? "border-destructive bg-destructive/10"
															: "border-destructive bg-surface"
														: isSelected
															? `border-border ${option.selectedBgClass}`
															: "border-border bg-surface"
												}`}>
												<View className="flex-row items-start gap-3">
													<View
														className={`mt-0.5 size-8 shrink-0 items-center justify-center border-2 ${
															isDestructive
																? isSelected
																	? "border-destructive bg-destructive"
																	: "border-destructive bg-surface"
																: isSelected
																	? "border-border bg-primary"
																	: "border-border bg-card"
														}`}>
														{option.renderIcon(
															iconColor,
														)}
													</View>

													<View className="min-w-0 flex-1 gap-1">
														<View className="flex-row flex-wrap items-center justify-between gap-2">
															<Text
																className={`font-bold text-sm uppercase ${
																	isDestructive
																		? "text-destructive"
																		: "text-foreground"
																}`}>
																{option.title}
															</Text>

															<View className="flex-row items-center gap-1.5">
																<View
																	className={`border border-border px-1.5 py-0.5 ${option.badgeClass}`}>
																	<Text
																		className={`font-bold text-3xs tracking-wider uppercase ${option.badgeTextClass}`}>
																		{
																			option.badgeLabel
																		}
																	</Text>
																</View>

																<View
																	className={`size-5 items-center justify-center border-2 ${
																		isDestructive
																			? isSelected
																				? "border-destructive bg-destructive"
																				: "border-destructive bg-surface"
																			: isSelected
																				? "border-border bg-primary"
																				: "border-border bg-surface"
																	}`}>
																	{isSelected ? (
																		<Check
																			size={
																				12
																			}
																			color="#faf9f5"
																			strokeWidth={
																				3
																			}
																		/>
																	) : null}
																</View>
															</View>
														</View>

														<Text className="font-mono text-xs leading-relaxed text-muted-foreground">
															{option.description}
														</Text>

														{isAuthorUnavailable ? (
															<Text className="font-mono text-2xs text-muted-foreground uppercase">
																Author
																unavailable
															</Text>
														) : null}
													</View>
												</View>
											</Pressable>
										</View>
									);
								})}
							</View>

							{/* User-Facing Explanation (for warn, restrict_24h, restrict_7d, remove_content) */}
							{requiresPublicExplanation ? (
								<View className="bg-surface shadow-neo-sm">
									<View className="overflow-hidden border-2 border-border bg-surface p-3">
										<View className="mb-2 flex-row items-center justify-between gap-2">
											<View className="flex-1 flex-row items-center gap-1.5">
												<Megaphone
													size={14}
													color="#000000"
													strokeWidth={2.5}
												/>
												<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
													USER-FACING EXPLANATION
												</Text>
											</View>

											{publicExplanation !==
											defaultExplanation ? (
												<Pressable
													disabled={isSubmitting}
													onPress={() => {
														triggerHaptic();
														setPublicExplanation(
															defaultExplanation,
														);
													}}
													accessibilityRole="button"
													accessibilityLabel="Reset explanation to default"
													className="flex-row items-center gap-1 border border-border bg-secondary px-2 py-0.5 active:opacity-80">
													<RotateCcw
														size={10}
														color="#000000"
														strokeWidth={2.5}
													/>
													<Text className="font-bold text-3xs tracking-wider text-foreground uppercase">
														RESET
													</Text>
												</Pressable>
											) : null}
										</View>

										<TextInput
											value={publicExplanation}
											onChangeText={setPublicExplanation}
											placeholder="Explain the policy decision shown to the content author..."
											placeholderTextColor="rgba(0, 0, 0, 0.45)"
											multiline
											maxLength={500}
											editable={!isSubmitting}
											accessibilityLabel="User-facing explanation"
											style={{
												minHeight: 84,
												textAlignVertical: "top",
											}}
											className="border-2 border-border bg-card p-3 font-mono text-xs leading-relaxed text-foreground"
										/>

										<Text className="mt-1.5 font-mono text-2xs text-muted-foreground">
											Sent directly to {authorHandle} in
											their moderation outcome notice.
										</Text>
									</View>
								</View>
							) : null}

							{/* Internal Moderator Note — Staff Only */}
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
										value={moderatorNote}
										onChangeText={setModeratorNote}
										placeholder="Add internal audit context or escalation notes for staff (optional)..."
										placeholderTextColor="rgba(0, 0, 0, 0.45)"
										multiline
										maxLength={1000}
										editable={!isSubmitting}
										accessibilityLabel="Internal moderator note, staff only"
										style={{
											minHeight: 80,
											textAlignVertical: "top",
										}}
										className="border-2 border-border bg-surface p-3 font-mono text-xs leading-relaxed text-foreground"
									/>

									<Text className="mt-1.5 font-mono text-2xs text-muted-foreground">
										Never sent to reporters or the reported
										author. Visible only to moderation
										staff.
									</Text>
								</View>
							</View>
						</>
					)}

					{submitError ? (
						<View className="bg-surface shadow-neo-xs">
							<View className="flex-row items-start gap-2 border-2 border-destructive bg-destructive/10 p-3">
								<AlertTriangle
									size={15}
									color="#ff2a00"
									strokeWidth={2.5}
									className="mt-0.5 shrink-0"
								/>
								<Text className="flex-1 font-mono text-xs text-destructive">
									{submitError}
								</Text>
							</View>
						</View>
					) : null}
				</View>
			</MobileSheet.Body>

			<MobileSheet.Footer className="pt-3 pb-2">
				<View className="flex-row gap-2">
					<NeoButton
						variant="outline"
						disabled={isSubmitting}
						onPress={() => {
							if (confirmingPurge) {
								triggerHaptic();
								setConfirmingPurge(false);
								setSubmitError(null);
								return;
							}
							onClose();
						}}>
						{confirmingPurge ? "BACK" : "CANCEL"}
					</NeoButton>

					<NeoButton
						variant={submitButtonVariant}
						className="flex-1"
						loading={isSubmitting}
						disabled={isSubmitting}
						startContent={
							isPurgeSelected ? (
								<Trash2
									size={15}
									color="#faf9f5"
									strokeWidth={2.5}
								/>
							) : (
								<ShieldCheck
									size={15}
									color="#faf9f5"
									strokeWidth={2.5}
								/>
							)
						}
						onPress={handlePrimaryPress}>
						{submitButtonLabel}
					</NeoButton>
				</View>
			</MobileSheet.Footer>
		</KeyboardAvoidingView>
	);
}

/**
 * Graduated moderation decision sheet supporting dismissal, warnings,
 * timed account restrictions (24h / 7d), and two-step confirmed content purge
 * with staff-only internal notes and pre-filled user-facing explanations.
 */
export function ModerationDecisionSheet({
	group,
	open,
	onOpenChange,
	isSubmitting = false,
	onSubmit,
}: ModerationDecisionSheetProps) {
	const subtitle = group
		? `${group.target_type.toUpperCase()} · ${group.count} REPORT${
				group.count === 1 ? "" : "S"
			} · ${group.primary_reason.toUpperCase()}`
		: "Select a graduated moderation outcome";

	return (
		<MobileSheet
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen && isSubmitting) return;
				onOpenChange(nextOpen);
			}}
			size="full"
			title="MODERATION DECISION"
			subtitle={subtitle}>
			{open && group ? (
				<ModerationDecisionForm
					key={`${group.key}-${group.latest_created_at}`}
					group={group}
					isSubmitting={isSubmitting}
					onClose={() => onOpenChange(false)}
					onSubmit={onSubmit}
				/>
			) : null}
		</MobileSheet>
	);
}
