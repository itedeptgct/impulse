import * as Haptics from "expo-haptics";
import { AlertCircle, CheckCircle2, Flag } from "lucide-react-native";
import { useState } from "react";
import {
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";

import { MobileSheet, NeoButton } from "@/components/ui";
import type { GuildId } from "@/features/guilds/types";

import { submitReport, validateReportInput } from "../api";
import {
	REPORT_REASONS,
	type ReportReason,
	type ReportTargetType,
} from "../types";

export interface ReportModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	targetType: ReportTargetType;
	targetId: string;
	guild?: GuildId | null;
	targetTitle?: string;
	onReportSubmitted?: () => void;
}

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

function ReportModalForm({
	targetType,
	targetId,
	guild,
	targetTitle,
	onClose,
	onReportSubmitted,
}: {
	targetType: ReportTargetType;
	targetId: string;
	guild?: GuildId | null;
	targetTitle?: string;
	onClose: () => void;
	onReportSubmitted?: () => void;
}) {
	const [reason, setReason] = useState<ReportReason>("spam");
	const [details, setDetails] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isSuccess, setIsSuccess] = useState(false);

	const handleSubmit = async () => {
		if (isSubmitting || isSuccess) return;

		const validationError = validateReportInput({
			targetType,
			targetId,
			reason,
			details,
		});

		if (validationError) {
			setError(validationError);
			triggerHaptic();
			return;
		}

		setIsSubmitting(true);
		setError(null);
		triggerHaptic();

		try {
			await submitReport({
				targetType,
				targetId,
				reason,
				details,
				guild,
			});

			setIsSuccess(true);
			if (Platform.OS !== "web") {
				Haptics.notificationAsync(
					Haptics.NotificationFeedbackType.Success,
				).catch(() => {});
			}

			setTimeout(() => {
				onReportSubmitted?.();
				onClose();
			}, 1400);
		} catch (err: unknown) {
			const e = err as Error;
			setError(e.message || "Failed to submit report. Please try again.");
			if (Platform.OS !== "web") {
				Haptics.notificationAsync(
					Haptics.NotificationFeedbackType.Error,
				).catch(() => {});
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<ScrollView
			showsVerticalScrollIndicator={false}
			contentContainerStyle={{ paddingBottom: 20 }}
			keyboardShouldPersistTaps="handled"
			className="gap-3 p-1">
			{targetTitle && (
				<View className="border-2 border-border bg-secondary p-2.5 shadow-neo-xs">
					<Text className="font-mono text-3xs tracking-wider text-muted-foreground uppercase">
						TARGET REFERENCE
					</Text>
					<Text
						numberOfLines={2}
						className="mt-0.5 font-bold text-xs text-foreground">
						{targetTitle}
					</Text>
				</View>
			)}

			{isSuccess ? (
				<View className="items-center border-2 border-border bg-neo-green/20 p-5 shadow-neo">
					<CheckCircle2 size={32} color="#00aa33" strokeWidth={2.5} />
					<Text className="mt-2 font-display text-base text-foreground uppercase">
						REPORT TRANSMITTED
					</Text>
					<Text className="mt-1 text-center font-mono text-xs text-muted-foreground">
						Thank you for alerting campus moderators. Our team will
						inspect this content promptly.
					</Text>
				</View>
			) : (
				<>
					<Text className="font-bold text-xs tracking-wider text-muted-foreground uppercase">
						SELECT PRIMARY REASON
					</Text>

					<View className="gap-2">
						{REPORT_REASONS.map((opt) => {
							const isSelected = reason === opt.value;
							return (
								<Pressable
									key={opt.value}
									accessibilityRole="radio"
									accessibilityState={{ checked: isSelected }}
									accessibilityLabel={opt.label}
									onPress={() => {
										triggerHaptic();
										setReason(opt.value);
										setError(null);
									}}
									className={`flex-row items-start gap-3 border-2 p-3 transition-colors ${
										isSelected
											? "border-border bg-primary/10 shadow-neo-xs"
											: "border-border/60 bg-card active:bg-secondary"
									}`}>
									<View
										className={`mt-0.5 size-4 items-center justify-center rounded-none border border-border ${
											isSelected
												? "bg-primary"
												: "bg-surface"
										}`}>
										{isSelected && (
											<View className="size-2 bg-primary-foreground" />
										)}
									</View>
									<View className="flex-1">
										<Text className="font-display text-xs text-foreground uppercase">
											{opt.label}
										</Text>
										<Text className="mt-0.5 font-mono text-2xs text-muted-foreground">
											{opt.description}
										</Text>
									</View>
								</Pressable>
							);
						})}
					</View>

					<View className="mt-1 gap-1.5">
						<View className="flex-row items-center justify-between">
							<Text className="font-bold text-xs tracking-wider text-muted-foreground uppercase">
								ADDITIONAL DETAILS{" "}
								{reason === "other" ? (
									<Text className="text-destructive">
										*REQUIRED
									</Text>
								) : (
									"(OPTIONAL)"
								)}
							</Text>
							<Text className="font-mono text-3xs text-muted-foreground">
								{details.length}/300
							</Text>
						</View>
						<TextInput
							value={details}
							onChangeText={(val) => {
								setDetails(val.slice(0, 300));
								if (error) setError(null);
							}}
							placeholder={
								reason === "other"
									? "Please specify the exact nature of this violation..."
									: "Provide any additional context for moderators..."
							}
							placeholderTextColor="rgba(0, 0, 0, 0.4)"
							multiline
							maxLength={300}
							style={{ minHeight: 64, textAlignVertical: "top" }}
							className="border-2 border-border bg-card p-2.5 font-mono text-xs text-foreground"
						/>
					</View>

					{error && (
						<View className="flex-row items-start gap-2 border-2 border-destructive bg-destructive/10 p-2.5 shadow-neo-xs">
							<AlertCircle
								size={16}
								color="#DC2626"
								strokeWidth={2.4}
								className="mt-0.5 shrink-0"
							/>
							<Text className="flex-1 font-mono text-xs text-destructive">
								{error}
							</Text>
						</View>
					)}

					<View className="mt-2 flex-row gap-2">
						<NeoButton
							variant="primary"
							className="flex-1"
							loading={isSubmitting}
							disabled={isSubmitting}
							startContent={
								<Flag
									size={14}
									color="#faf9f5"
									strokeWidth={2.5}
								/>
							}
							onPress={handleSubmit}>
							SUBMIT REPORT
						</NeoButton>
						<NeoButton
							variant="outline"
							disabled={isSubmitting}
							onPress={onClose}>
							CANCEL
						</NeoButton>
					</View>
				</>
			)}
		</ScrollView>
	);
}

export function ReportModal({
	open,
	onOpenChange,
	targetType,
	targetId,
	guild,
	targetTitle,
	onReportSubmitted,
}: ReportModalProps) {
	return (
		<MobileSheet
			open={open}
			onOpenChange={onOpenChange}
			title={`REPORT ${targetType.toUpperCase()}`}
			subtitle="Flag content that violates campus community standards.">
			{open ? (
				<ReportModalForm
					key={`${targetType}-${targetId}`}
					targetType={targetType}
					targetId={targetId}
					guild={guild}
					targetTitle={targetTitle}
					onClose={() => onOpenChange(false)}
					onReportSubmitted={onReportSubmitted}
				/>
			) : null}
		</MobileSheet>
	);
}
