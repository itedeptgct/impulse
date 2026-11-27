import * as Haptics from "expo-haptics";
import { AlertCircle, Send, ShieldAlert } from "lucide-react-native";
import { useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	Text,
	TextInput,
	View,
} from "react-native";

import { MobileSheet, NeoButton } from "@/components/ui";
import { toast } from "@/lib/toast";

import { useSubmitAppeal } from "../hooks/useModeration";

export const MIN_APPEAL_LENGTH = 10;
export const MAX_APPEAL_LENGTH = 1000;

export interface AppealModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	actionId: string | null;
	summary?: string | null;
	onAppealSubmitted?: () => void;
}

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

export function validateAppealReason(reason: string): string | null {
	const trimmed = reason.trim();
	if (trimmed.length < MIN_APPEAL_LENGTH) {
		return `Please provide at least ${MIN_APPEAL_LENGTH} characters explaining your appeal.`;
	}
	if (trimmed.length > MAX_APPEAL_LENGTH) {
		return `Appeal reason must be ${MAX_APPEAL_LENGTH} characters or fewer.`;
	}
	return null;
}

function isDuplicateAppealError(message: string): boolean {
	const lower = message.toLowerCase();
	return (
		lower.includes("already submitted") ||
		lower.includes("23505") ||
		lower.includes("unique")
	);
}

function AppealModalForm({
	actionId,
	summary,
	onClose,
	onAppealSubmitted,
}: {
	actionId: string | null;
	summary?: string | null;
	onClose: () => void;
	onAppealSubmitted?: () => void;
}) {
	const [reason, setReason] = useState("");
	const [error, setError] = useState<string | null>(null);
	const submitAppeal = useSubmitAppeal();

	const trimmedLength = reason.trim().length;
	const isSubmitting = submitAppeal.isPending;

	const handleSubmit = async () => {
		if (isSubmitting) return;

		if (!actionId || !actionId.trim()) {
			setError("Moderation action reference is missing.");
			triggerHaptic();
			return;
		}

		const validationError = validateAppealReason(reason);
		if (validationError) {
			setError(validationError);
			triggerHaptic();
			return;
		}

		setError(null);
		triggerHaptic();

		try {
			await submitAppeal.mutateAsync({
				actionId: actionId.trim(),
				reason: reason.trim(),
			});

			if (Platform.OS !== "web") {
				Haptics.notificationAsync(
					Haptics.NotificationFeedbackType.Success,
				).catch(() => {});
			}

			toast.success(
				"Your appeal has been submitted for moderator review.",
				"Appeal Submitted",
			);
			onAppealSubmitted?.();
			onClose();
		} catch (err: unknown) {
			const rawMessage =
				err instanceof Error && err.message
					? err.message
					: "Failed to submit appeal. Please try again.";

			const displayMessage = isDuplicateAppealError(rawMessage)
				? "You have already submitted an appeal for this moderation action."
				: rawMessage;

			setError(displayMessage);
			toast.error(displayMessage, "Appeal Failed");

			if (Platform.OS !== "web") {
				Haptics.notificationAsync(
					Haptics.NotificationFeedbackType.Error,
				).catch(() => {});
			}
		}
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			className="flex-1">
			<MobileSheet.Body
				keyboardShouldPersistTaps="handled"
				automaticallyAdjustKeyboardInsets
				contentContainerStyle={{ paddingBottom: 20 }}>
				<View className="gap-3 pb-2">
					{Boolean(summary?.trim()) && (
						<View className="bg-card shadow-neo-xs">
							<View className="border-2 border-border bg-secondary p-3">
								<View className="flex-row items-center gap-1.5">
									<ShieldAlert
										size={13}
										color="#000000"
										strokeWidth={2.5}
									/>
									<Text className="font-bold text-[10px] tracking-wider text-foreground uppercase">
										MODERATION OUTCOME
									</Text>
								</View>
								<Text className="mt-1.5 font-mono text-xs leading-relaxed text-foreground">
									{summary?.trim()}
								</Text>
							</View>
						</View>
					)}

					<View className="gap-1.5">
						<View className="flex-row items-center justify-between">
							<Text className="font-bold text-xs tracking-wider text-muted-foreground uppercase">
								APPEAL REASON{" "}
								<Text className="text-destructive">
									*REQUIRED
								</Text>
							</Text>
							<Text
								className={`font-mono text-[10px] ${
									trimmedLength > 0 &&
									trimmedLength < MIN_APPEAL_LENGTH
										? "text-destructive"
										: "text-muted-foreground"
								}`}>
								{reason.length}/{MAX_APPEAL_LENGTH}
							</Text>
						</View>

						<TextInput
							value={reason}
							onChangeText={(val) => {
								setReason(val.slice(0, MAX_APPEAL_LENGTH));
								if (error) setError(null);
							}}
							placeholder="Explain clearly why this moderation decision should be reconsidered (10–1000 characters)..."
							placeholderTextColor="rgba(0, 0, 0, 0.45)"
							multiline
							maxLength={MAX_APPEAL_LENGTH}
							editable={!isSubmitting}
							accessibilityLabel="Appeal reason"
							style={{ minHeight: 112, textAlignVertical: "top" }}
							className="border-2 border-border bg-card p-3 font-mono text-xs leading-relaxed text-foreground"
						/>

						<Text className="font-mono text-[10px] text-muted-foreground">
							Minimum {MIN_APPEAL_LENGTH} characters. Appeals are
							reviewed by campus moderators.
						</Text>
					</View>

					{error && (
						<View className="bg-surface shadow-neo-xs">
							<View className="flex-row items-start gap-2 border-2 border-destructive bg-destructive/10 p-2.5">
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
						</View>
					)}
				</View>
			</MobileSheet.Body>

			<MobileSheet.Footer className="pt-3 pb-2">
				<View className="flex-row gap-2">
					<NeoButton
						variant="primary"
						className="flex-1"
						loading={isSubmitting}
						disabled={isSubmitting}
						startContent={
							<Send size={14} color="#FAF9F5" strokeWidth={2.5} />
						}
						onPress={handleSubmit}>
						SUBMIT APPEAL
					</NeoButton>
					<NeoButton
						variant="outline"
						disabled={isSubmitting}
						onPress={onClose}>
						CANCEL
					</NeoButton>
				</View>
			</MobileSheet.Footer>
		</KeyboardAvoidingView>
	);
}

export function AppealModal({
	open,
	onOpenChange,
	actionId,
	summary,
	onAppealSubmitted,
}: AppealModalProps) {
	return (
		<MobileSheet
			open={open}
			onOpenChange={onOpenChange}
			title="APPEAL DECISION"
			subtitle="Request a review of this moderation action.">
			{open ? (
				<AppealModalForm
					key={actionId ?? "appeal-empty"}
					actionId={actionId}
					summary={summary}
					onClose={() => onOpenChange(false)}
					onAppealSubmitted={onAppealSubmitted}
				/>
			) : null}
		</MobileSheet>
	);
}
