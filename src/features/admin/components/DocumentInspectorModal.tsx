import { Image } from "expo-image";
import {
	AlertCircle,
	CheckCircle2,
	ExternalLink,
	RotateCw,
	User,
	X,
	XCircle,
} from "lucide-react-native";
import { useState } from "react";
import {
	KeyboardAvoidingView,
	Linking,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NeoBadge, NeoButton, NeoCard } from "@/components/ui";

import type { AdminVerificationItem } from "../types";

export interface DocumentInspectorModalProps {
	item: AdminVerificationItem | null;
	open: boolean;
	onClose: () => void;
	onApprove: (id: string) => Promise<void>;
	onReject: (id: string, reason: string) => Promise<void>;
	isProcessing: boolean;
}

const REJECTION_PRESETS = [
	"Photo is too blurry, unreadable, or obscured.",
	"Student ID has expired or graduation year passed.",
	"Name on student ID does not match account credentials.",
	"Document is not an official GCT student identification card.",
	"ID card edges are cropped; full document must be visible.",
];

export function DocumentInspectorModal({
	item,
	open,
	onClose,
	onApprove,
	onReject,
	isProcessing,
}: DocumentInspectorModalProps) {
	const [rotation, setRotation] = useState(0);
	const [isRejecting, setIsRejecting] = useState(false);
	const [rejectReason, setRejectReason] = useState("");
	const [rejectError, setRejectError] = useState<string | null>(null);

	if (!item) return null;

	const handleRotate = () => {
		setRotation((prev) => (prev + 90) % 360);
	};

	const handleOpenExternal = () => {
		if (item.documentSignedUrl) {
			void Linking.openURL(item.documentSignedUrl);
		}
	};

	const handleConfirmReject = async () => {
		if (!rejectReason.trim()) {
			setRejectError(
				"Please provide a reason for rejecting this document.",
			);
			return;
		}
		setRejectError(null);
		await onReject(item.id, rejectReason.trim());
		setIsRejecting(false);
		setRejectReason("");
		onClose();
	};

	const handleConfirmApprove = async () => {
		await onApprove(item.id);
		onClose();
	};

	const handleDismiss = () => {
		setIsRejecting(false);
		setRejectReason("");
		setRejectError(null);
		onClose();
	};

	const applicantName = item.profile?.username || "Student Applicant";
	const applicantEmail = item.profile?.email || "No email available";
	const studentId = item.profile?.id || item.user_id;

	return (
		<Modal
			visible={open}
			animationType="slide"
			presentationStyle="fullScreen"
			onRequestClose={handleDismiss}>
			<SafeAreaView
				style={{ backgroundColor: "#0a0a0c", flex: 1 }}
				edges={["top", "bottom"]}>
				{/* Top Navigation Bar */}
				<View className="flex-row items-center justify-between border-b-2 border-border bg-card px-4 py-3 shadow-neo-sm">
					<View className="flex-row items-center gap-2.5">
						<View className="size-9 items-center justify-center rounded-sm border-2 border-primary/40 bg-primary/15">
							<User size={18} color="#91e6b1" strokeWidth={2.5} />
						</View>
						<View>
							<Text className="font-display text-sm tracking-tight text-foreground uppercase">
								Document Inspection
							</Text>
							<Text className="font-mono text-[10px] text-muted-foreground">
								{applicantName} • {studentId.slice(0, 10)}
							</Text>
						</View>
					</View>

					<View className="flex-row items-center gap-2">
						<NeoButton
							size="sm"
							variant="outline"
							className="h-9 w-9 px-0"
							onPress={handleRotate}
							accessibilityLabel="Rotate document image">
							<RotateCw
								size={14}
								color="#9aa1b2"
								strokeWidth={2.5}
							/>
						</NeoButton>
						{item.documentSignedUrl && (
							<NeoButton
								size="sm"
								variant="outline"
								className="h-9 w-9 px-0"
								onPress={handleOpenExternal}
								accessibilityLabel="Open document externally">
								<ExternalLink
									size={14}
									color="#9aa1b2"
									strokeWidth={2.5}
								/>
							</NeoButton>
						)}
						<NeoButton
							size="sm"
							variant="secondary"
							className="h-9 w-9 px-0"
							onPress={handleDismiss}
							accessibilityLabel="Close document inspection">
							<X size={16} color="#ffffff" strokeWidth={2.5} />
						</NeoButton>
					</View>
				</View>

				{/* Body Content */}
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : undefined}
					className="flex-1"
					style={{ backgroundColor: "#0a0a0c" }}>
					<ScrollView
						className="flex-1 px-4 py-3"
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled">
						{/* Document Viewer Frame */}
						<View className="relative min-h-80 w-full items-center justify-center overflow-hidden rounded-sm border-2 border-border bg-card p-3 shadow-neo">
							{item.documentSignedUrl ? (
								<Image
									source={{ uri: item.documentSignedUrl }}
									style={{
										width: "100%",
										height: 380,
										transform: [
											{ rotate: `${rotation}deg` },
										],
									}}
									contentFit="contain"
									transition={200}
								/>
							) : (
								<View className="items-center justify-center gap-2 py-16">
									<AlertCircle size={28} color="#ff5c5c" />
									<Text className="font-mono text-xs text-muted-foreground">
										Document image could not be loaded or
										URL has expired.
									</Text>
								</View>
							)}
						</View>

						{/* Student Metadata Card */}
						<NeoCard className="mt-3.5 gap-2.5 border-border bg-card p-4">
							<View className="flex-row items-center justify-between border-b border-border/60 pb-2">
								<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
									Student Details
								</Text>
								<NeoBadge
									variant={
										item.status === "approved"
											? "primary"
											: item.status === "rejected"
												? "outline"
												: "default"
									}
									size="sm">
									{item.status.toUpperCase()}
								</NeoBadge>
							</View>

							<View className="flex-row justify-between">
								<Text className="font-mono text-xs text-muted-foreground">
									Full Name / Username:
								</Text>
								<Text className="font-mono text-xs text-foreground">
									{applicantName}
								</Text>
							</View>

							<View className="flex-row justify-between">
								<Text className="font-mono text-xs text-muted-foreground">
									Student Email:
								</Text>
								<Text className="font-mono text-xs text-foreground">
									{applicantEmail}
								</Text>
							</View>

							<View className="flex-row justify-between">
								<Text className="font-mono text-xs text-muted-foreground">
									Student ID:
								</Text>
								<Text className="font-mono text-xs text-foreground">
									{studentId}
								</Text>
							</View>

							<View className="flex-row justify-between">
								<Text className="font-mono text-xs text-muted-foreground">
									Submitted:
								</Text>
								<Text className="font-mono text-xs text-foreground">
									{new Date(item.created_at).toLocaleString()}
								</Text>
							</View>
						</NeoCard>

						{/* Existing Rejection Feedback */}
						{item.status === "rejected" &&
							item.rejection_reason && (
								<View className="mt-3.5 rounded-sm border-2 border-destructive/60 bg-destructive/15 p-3.5 shadow-neo-sm">
									<Text className="font-mono text-xs text-destructive">
										Previous Rejection Feedback:
									</Text>
									<Text className="mt-1 font-mono text-xs text-destructive">
										{item.rejection_reason}
									</Text>
								</View>
							)}

						{/* Rejection Input Box */}
						{isRejecting && (
							<NeoCard className="mt-4 border-destructive bg-card p-4">
								<Text className="font-display text-sm tracking-tight text-foreground uppercase">
									Reason for Rejection
								</Text>
								<Text className="mt-0.5 font-mono text-xs text-muted-foreground">
									Select a preset reason or enter custom
									guidance for the student:
								</Text>

								{/* Presets */}
								<View className="mt-3 flex-col gap-1.5">
									{REJECTION_PRESETS.map((preset, index) => (
										<Pressable
											key={index}
											onPress={() =>
												setRejectReason(preset)
											}
											className="rounded-sm border-2 border-border bg-secondary p-2 active:translate-x-px active:translate-y-px">
											<Text className="font-mono text-[11px] text-foreground">
												{preset}
											</Text>
										</Pressable>
									))}
								</View>

								{/* Text input */}
								<TextInput
									value={rejectReason}
									onChangeText={setRejectReason}
									placeholder="Explain why the document was rejected..."
									placeholderTextColor="#71717a"
									multiline
									numberOfLines={3}
									className="mt-3 min-h-20 rounded-sm border-2 border-border bg-background p-3 font-mono text-xs text-foreground"
								/>
								{rejectError && (
									<Text className="mt-1.5 font-mono text-xs text-destructive">
										{rejectError}
									</Text>
								)}
								<View className="mt-3 flex-row justify-end gap-2">
									<NeoButton
										size="sm"
										variant="outline"
										onPress={() => setIsRejecting(false)}>
										Cancel
									</NeoButton>
									<NeoButton
										size="sm"
										variant="destructive"
										loading={isProcessing}
										textClassName="text-inset"
										onPress={handleConfirmReject}>
										Confirm Rejection
									</NeoButton>
								</View>
							</NeoCard>
						)}
					</ScrollView>

					{/* Sticky Bottom Actions */}
					<View className="flex-row items-center gap-3 border-t-2 border-border bg-card px-4 py-3 shadow-neo">
						{!isRejecting ? (
							<>
								<NeoButton
									size="lg"
									variant="destructive"
									className="flex-1"
									disabled={isProcessing}
									startContent={
										<XCircle
											size={16}
											color="#ffffff"
											strokeWidth={2.5}
										/>
									}
									textClassName="text-inset"
									onPress={() => setIsRejecting(true)}>
									Reject
								</NeoButton>
								<NeoButton
									size="lg"
									variant="primary"
									className="flex-1"
									disabled={isProcessing}
									loading={isProcessing}
									startContent={
										!isProcessing ? (
											<CheckCircle2
												size={16}
												color="#0a0a0c"
												strokeWidth={2.5}
											/>
										) : undefined
									}
									onPress={handleConfirmApprove}>
									Approve
								</NeoButton>
							</>
						) : (
							<NeoButton
								size="md"
								variant="outline"
								className="w-full"
								onPress={() => setIsRejecting(false)}>
								Back to Inspection
							</NeoButton>
						)}
					</View>
				</KeyboardAvoidingView>
			</SafeAreaView>
		</Modal>
	);
}
