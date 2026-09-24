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
import { Button, Dialog, Text } from "panelui-native";
import { useState } from "react";
import { Linking, ScrollView, TextInput, View } from "react-native";

import type { AdminVerificationItem } from "../types";

interface DocumentInspectorModalProps {
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
			setRejectError("Please provide a reason for rejecting this document.");
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

	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) {
					setIsRejecting(false);
					setRejectReason("");
					setRejectError(null);
					onClose();
				}
			}}>
			<Dialog.Content className="mx-4 max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-2xl">
				{/* Modal Header */}
				<View className="flex-row items-center justify-between border-b border-border px-6 py-4">
					<View className="flex-row items-center gap-3">
						<View className="h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
							<User size={18} className="text-primary" />
						</View>
						<View>
							<Text weight="bold" className="text-base text-foreground">
								Student ID Verification
							</Text>
							<Text className="text-xs text-muted-foreground">
								{item.profile?.username || "Student"} •{" "}
								{item.profile?.email || item.user_id}
							</Text>
						</View>
					</View>
					<View className="flex-row items-center gap-2">
						<Button
							size="sm"
							variant="ghost"
							className="h-8 w-8 rounded-lg"
							aria-label="Rotate image"
							onPress={handleRotate}>
							<RotateCw size={15} className="text-muted-foreground" />
						</Button>
						{item.documentSignedUrl && (
							<Button
								size="sm"
								variant="ghost"
								className="h-8 w-8 rounded-lg"
								aria-label="Open in new window"
								onPress={handleOpenExternal}>
								<ExternalLink size={15} className="text-muted-foreground" />
							</Button>
						)}
						<Button
							size="sm"
							variant="ghost"
							className="h-8 w-8 rounded-lg"
							aria-label="Close dialog"
							onPress={onClose}>
							<X size={16} className="text-muted-foreground" />
						</Button>
					</View>
				</View>
				{/* Modal Body */}
				<ScrollView
					className="max-h-[60vh] p-6"
					showsVerticalScrollIndicator={false}>
					{/* Document Viewer Frame */}
					<View className="relative min-h-75 w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-black/40 p-4">
						{item.documentSignedUrl ? (
							<Image
								source={{ uri: item.documentSignedUrl }}
								style={{
									width: "100%",
									height: 380,
									transform: [{ rotate: `${rotation}deg` }],
								}}
								contentFit="contain"
								transition={200}
							/>
						) : (
							<View className="items-center justify-center gap-2 py-16">
								<AlertCircle size={28} className="text-muted-foreground" />
								<Text className="text-xs text-muted-foreground">
									Document image could not be loaded or URL has expired.
								</Text>
							</View>
						)}
					</View>
					{/* Metadata strip */}
					<View className="mt-4 flex-row flex-wrap items-center justify-between rounded-xl border border-border bg-muted/40 p-3 text-xs">
						<View className="flex-row items-center gap-2">
							<Text className="text-xs text-muted-foreground">Status:</Text>
							<Text
								weight="semibold"
								className={`text-xs capitalize ${
									item.status === "approved"
										? "text-emerald-400"
										: item.status === "rejected"
											? "text-destructive"
											: "text-amber-400"
								}`}>
								{item.status}
							</Text>
						</View>
						<View className="flex-row items-center gap-2">
							<Text className="text-xs text-muted-foreground">Submitted:</Text>
							<Text
								weight="medium"
								className="text-xs text-foreground tabular-nums">
								{new Date(item.created_at).toLocaleString()}
							</Text>
						</View>
						<View className="flex-row items-center gap-2">
							<Text className="text-xs text-muted-foreground">User ID:</Text>
							<Text className="font-mono text-xs text-muted-foreground">
								{item.user_id.slice(0, 8)}...
							</Text>
						</View>
					</View>
					{/* If rejection reason already exists */}
					{item.status === "rejected" && item.rejection_reason && (
						<View className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5">
							<Text weight="semibold" className="text-xs text-destructive">
								Current Rejection Feedback:
							</Text>
							<Text className="mt-1 text-xs text-destructive">
								{item.rejection_reason}
							</Text>
						</View>
					)}
					{/* Rejection Input Drawer */}
					{isRejecting && (
						<View className="mt-4 rounded-xl border border-destructive/30 bg-card p-4 shadow-sm">
							<Text weight="bold" className="text-sm text-foreground">
								Reason for Rejection
							</Text>
							<Text className="mt-0.5 text-xs text-muted-foreground">
								Select a common reason or type a custom note for the student:
							</Text>
							{/* Presets */}
							<View className="mt-3 flex-row flex-wrap gap-1.5">
								{REJECTION_PRESETS.map((preset, index) => (
									<Button
										key={index}
										size="sm"
										variant="outline"
										className="rounded-lg text-[11px]"
										onPress={() => setRejectReason(preset)}>
										{preset.slice(0, 32)}...
									</Button>
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
								className="mt-3 min-h-18 rounded-xl border border-border bg-background p-3 text-xs text-foreground"
							/>
							{rejectError && (
								<Text className="mt-1.5 text-xs text-destructive">
									{rejectError}
								</Text>
							)}
							<View className="mt-3 flex-row justify-end gap-2">
								<Button
									size="sm"
									variant="outline"
									onPress={() => setIsRejecting(false)}>
									Cancel
								</Button>
								<Button
									size="sm"
									variant="destructive"
									loading={isProcessing}
									onPress={handleConfirmReject}>
									Confirm Rejection
								</Button>
							</View>
						</View>
					)}
				</ScrollView>
				{/* Modal Footer Actions */}
				<View className="flex-row items-center justify-between border-t border-border px-6 py-4">
					<Button size="md" variant="outline" onPress={onClose}>
						Close
					</Button>
					<View className="flex-row items-center gap-3">
						{!isRejecting && (
							<Button
								size="md"
								variant="destructive"
								disabled={isProcessing}
								startContent={
									<XCircle size={16} className="text-destructive-foreground" />
								}
								onPress={() => setIsRejecting(true)}>
								Reject Submission
							</Button>
						)}
						<Button
							size="md"
							variant="primary"
							loading={isProcessing}
							startContent={
								<CheckCircle2 size={16} className="text-primary-foreground" />
							}
							onPress={handleConfirmApprove}>
							Approve Verification
						</Button>
					</View>
				</View>
			</Dialog.Content>
		</Dialog>
	);
}
