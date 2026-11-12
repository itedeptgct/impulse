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
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
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

import { getDocumentPreviewUrl } from "../api";
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
	const [fetchedUrl, setFetchedUrl] = useState<string | null>(null);
	const [hasLoadedUrl, setHasLoadedUrl] = useState(false);

	useEffect(() => {
		let isMounted = true;
		if (open && item?.document_url && !item.documentSignedUrl) {
			void getDocumentPreviewUrl(item.document_url).then((url) => {
				if (isMounted) {
					setFetchedUrl(url);
					setHasLoadedUrl(true);
				}
			});
		}
		return () => {
			isMounted = false;
		};
	}, [open, item?.document_url, item?.documentSignedUrl]);

	if (!item) return null;

	const activeUrl = item.documentSignedUrl || fetchedUrl;
	const isLoadingUrl =
		open && !activeUrl && !hasLoadedUrl && Boolean(item.document_url);

	const handleRotate = () => {
		setRotation((prev) => (prev + 90) % 360);
	};

	const handleOpenExternal = () => {
		if (activeUrl) {
			void Linking.openURL(activeUrl);
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
				style={{ backgroundColor: "#faf9f5", flex: 1 }}
				edges={["top", "bottom"]}>
				<View className="flex-row items-center justify-between border-b-2 border-border bg-card px-4 py-3 shadow-neo-sm">
					<View className="flex-row items-center gap-2.5">
						<View className="size-9 items-center justify-center rounded-none border-2 border-border bg-muted">
							<User size={18} color="#000000" strokeWidth={2.5} />
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
							className="size-9 px-0"
							onPress={handleRotate}
							accessibilityLabel="Rotate document image">
							<RotateCw
								size={14}
								color="#000000"
								strokeWidth={2.5}
							/>
						</NeoButton>
						{activeUrl && (
							<NeoButton
								size="sm"
								variant="outline"
								className="size-9 px-0"
								onPress={handleOpenExternal}
								accessibilityLabel="Open document externally">
								<ExternalLink
									size={14}
									color="#000000"
									strokeWidth={2.5}
								/>
							</NeoButton>
						)}
						<NeoButton
							size="sm"
							variant="secondary"
							className="size-9 px-0"
							onPress={handleDismiss}
							accessibilityLabel="Close document inspection">
							<X size={16} color="#000000" strokeWidth={2.5} />
						</NeoButton>
					</View>
				</View>

				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : undefined}
					className="flex-1"
					style={{ backgroundColor: "#faf9f5" }}>
					<ScrollView
						className="flex-1 px-4 py-3"
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled">
						<View className="relative min-h-80 w-full items-center justify-center overflow-hidden rounded-none border-2 border-border bg-card p-3 shadow-neo">
							{isLoadingUrl ? (
								<View className="items-center justify-center gap-2 py-16">
									<ActivityIndicator
										size="large"
										color="#000000"
									/>
									<Text className="font-mono text-xs text-muted-foreground uppercase">
										FETCHING DOCUMENT PREVIEW...
									</Text>
								</View>
							) : activeUrl ? (
								<Image
									source={{ uri: activeUrl }}
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
									<AlertCircle size={28} color="#ff2a00" />
									<Text className="font-mono text-xs text-muted-foreground">
										Document image could not be loaded or
										URL has expired.
									</Text>
								</View>
							)}
						</View>

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

						{item.status === "rejected" &&
							item.rejection_reason && (
								<View className="mt-3.5 rounded-none border-2 border-destructive bg-destructive/10 p-3.5 shadow-neo-sm">
									<Text className="font-bold text-xs text-destructive">
										Previous Rejection Feedback:
									</Text>
									<Text className="mt-1 font-mono text-xs text-destructive">
										{item.rejection_reason}
									</Text>
								</View>
							)}

						{isRejecting && (
							<NeoCard className="mt-4 border-destructive bg-card p-4">
								<Text className="font-display text-sm tracking-tight text-foreground uppercase">
									Reason for Rejection
								</Text>
								<Text className="mt-0.5 font-mono text-xs text-muted-foreground">
									Select a preset reason or enter custom
									guidance for the student:
								</Text>

								<View className="mt-3 flex-col gap-1.5">
									{REJECTION_PRESETS.map((preset, index) => (
										<Pressable
											key={index}
											onPress={() =>
												setRejectReason(preset)
											}
											className="rounded-none border-2 border-border bg-card p-2 active:translate-x-px active:translate-y-px">
											<Text className="font-mono text-[11px] text-foreground">
												{preset}
											</Text>
										</Pressable>
									))}
								</View>

								<TextInput
									value={rejectReason}
									onChangeText={setRejectReason}
									placeholder="Explain why the document was rejected..."
									placeholderTextColor="#767676"
									multiline
									numberOfLines={3}
									className="mt-3 min-h-20 rounded-none border-2 border-border bg-card p-3 font-mono text-xs text-foreground"
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
										textClassName="text-primary-foreground font-bold"
										onPress={handleConfirmReject}>
										Confirm Rejection
									</NeoButton>
								</View>
							</NeoCard>
						)}
					</ScrollView>

					<View className="flex-row items-center gap-3 border-t-2 border-border bg-card px-4 py-3 shadow-neo">
						{!isRejecting ? (
							<>
								<NeoButton
									size="lg"
									variant="destructive"
									className="flex-1"
									disabled={
										isProcessing ||
										item.status === "approved"
									}
									startContent={
										<XCircle
											size={16}
											color="#ffffff"
											strokeWidth={2.5}
										/>
									}
									textClassName="text-primary-foreground font-bold"
									onPress={() => setIsRejecting(true)}>
									Reject
								</NeoButton>
								<NeoButton
									size="lg"
									variant="primary"
									className="flex-1"
									disabled={
										isProcessing ||
										item.status === "rejected"
									}
									loading={isProcessing}
									startContent={
										!isProcessing ? (
											<CheckCircle2
												size={16}
												color="#ffffff"
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
