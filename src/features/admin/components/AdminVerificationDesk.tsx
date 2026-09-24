import {
	AlertCircle,
	CheckCircle2,
	Clock,
	Eye,
	RefreshCw,
	Search,
	User,
	XCircle,
} from "lucide-react-native";
import { Button, Text } from "panelui-native";
import { useState } from "react";
import { TextInput, View } from "react-native";

import {
	useAdminVerifications,
	useApproveVerification,
	useRejectVerification,
} from "../hooks/useAdmin";
import type { AdminVerificationItem, VerificationFilter } from "../types";
import { DocumentInspectorModal } from "./DocumentInspectorModal";

interface AdminVerificationDeskProps {
	adminId: string;
	pendingCount?: number;
}

export function AdminVerificationDesk({
	adminId,
	pendingCount = 0,
}: AdminVerificationDeskProps) {
	const [filter, setFilter] = useState<VerificationFilter>("pending");
	const [search, setSearch] = useState("");
	const [selectedItem, setSelectedItem] =
		useState<AdminVerificationItem | null>(null);
	const [isInspectorOpen, setIsInspectorOpen] = useState(false);

	const {
		data: verifications,
		isLoading,
		refetch,
		isFetching,
	} = useAdminVerifications(filter, search);

	const approveMutation = useApproveVerification();
	const rejectMutation = useRejectVerification();

	const handleOpenInspector = (item: AdminVerificationItem) => {
		setSelectedItem(item);
		setIsInspectorOpen(true);
	};

	const handleApprove = async (verificationId: string) => {
		await approveMutation.mutateAsync({
			verificationId,
			adminId,
		});
	};

	const handleReject = async (verificationId: string, reason: string) => {
		await rejectMutation.mutateAsync({
			verificationId,
			adminId,
			reason,
		});
	};

	return (
		<View className="gap-6">
			{/* Search & Filter Toolbar */}
			<View className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				{/* Search input */}
				<View className="relative flex-1 sm:max-w-md">
					<View className="pointer-events-none absolute inset-y-0 left-3 z-10 flex-row items-center">
						<Search size={15} className="text-muted-foreground" />
					</View>
					<TextInput
						value={search}
						onChangeText={setSearch}
						placeholder="Search by student username, email, or ID..."
						placeholderTextColor="#71717a"
						className="h-10 w-full rounded-xl border border-border bg-card pr-4 pl-9 text-xs text-foreground placeholder:text-muted-foreground"
					/>
				</View>
				{/* Filter Tabs & Refresh */}
				<View className="flex-row items-center gap-2">
					<View className="flex-row items-center rounded-xl border border-border bg-card p-1">
						{(
							[
								{ key: "pending", label: "Pending", count: pendingCount },
								{ key: "all", label: "All Submissions" },
								{ key: "approved", label: "Approved" },
								{ key: "rejected", label: "Rejected" },
							] as const
						).map((tab) => {
							const isActive = filter === tab.key;
							return (
								<Button
									key={tab.key}
									size="sm"
									variant={isActive ? "primary" : "ghost"}
									className="rounded-lg transition-transform active:scale-[0.96]"
									onPress={() => setFilter(tab.key)}>
									<View className="flex-row items-center gap-1.5">
										<Text
											weight={isActive ? "semibold" : "normal"}
											className={`text-xs ${
												isActive
													? "text-primary-foreground"
													: "text-muted-foreground"
											}`}>
											{tab.label}
										</Text>
										{"count" in tab && tab.count > 0 && (
											<View
												className={`py-0.2 rounded-full px-1.5 ${
													isActive ? "bg-black/20" : "bg-amber-500/20"
												}`}>
												<Text
													weight="bold"
													className={`text-[10px] tabular-nums ${
														isActive
															? "text-primary-foreground"
															: "text-amber-400"
													}`}>
													{tab.count}
												</Text>
											</View>
										)}
									</View>
								</Button>
							);
						})}
					</View>
					<Button
						size="sm"
						variant="outline"
						aria-label="Refresh verifications"
						className="h-9 w-9 rounded-xl transition-transform active:scale-[0.96]"
						onPress={() => void refetch()}>
						<RefreshCw
							size={14}
							className={`text-muted-foreground ${isFetching ? "animate-spin" : ""}`}
						/>
					</Button>
				</View>
			</View>
			{/* Verifications List */}
			{isLoading ? (
				<View className="gap-3">
					{[1, 2, 3, 4].map((i) => (
						<View
							key={i}
							className="h-24 animate-pulse rounded-2xl border border-border bg-card"
						/>
					))}
				</View>
			) : !verifications || verifications.length === 0 ? (
				<View className="items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 py-16">
					<CheckCircle2 size={36} className="text-muted-foreground/60" />
					<Text weight="bold" className="mt-3 text-base text-foreground">
						{filter === "pending"
							? "Queue all clear!"
							: "No verification records found"}
					</Text>
					<Text className="mt-1 text-xs text-muted-foreground">
						{filter === "pending"
							? "There are currently no pending student ID submissions to review."
							: "No submissions match your current search or filter criteria."}
					</Text>
				</View>
			) : (
				<View className="gap-3">
					{verifications.map((item) => {
						const isPending = item.status === "pending";
						const isApproved = item.status === "approved";
						const isRejected = item.status === "rejected";
						const applicantName = item.profile?.username || "Student Applicant";
						const applicantEmail = item.profile?.email || item.user_id;
						return (
							<View
								key={item.id}
								className={`flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${
									isPending
										? "border-amber-500/30 bg-card shadow-sm"
										: "border-border bg-card"
								}`}>
								{/* Left: Applicant details */}
								<View className="flex-row items-center gap-4">
									<View className="h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
										<User size={20} className="text-primary" />
									</View>
									<View>
										<View className="flex-row items-center gap-2">
											<Text weight="bold" className="text-sm text-foreground">
												{applicantName}
											</Text>
											{/* Status badge */}
											{isApproved && (
												<View className="flex-row items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5">
													<CheckCircle2
														size={11}
														className="text-emerald-400"
													/>
													<Text
														weight="medium"
														className="text-[10px] text-emerald-400">
														Approved
													</Text>
												</View>
											)}
											{isRejected && (
												<View className="flex-row items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5">
													<XCircle size={11} className="text-destructive" />
													<Text
														weight="medium"
														className="text-[10px] text-destructive">
														Rejected
													</Text>
												</View>
											)}
											{isPending && (
												<View className="flex-row items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5">
													<Clock size={11} className="text-amber-400" />
													<Text
														weight="medium"
														className="text-[10px] text-amber-400">
														Needs Review
													</Text>
												</View>
											)}
										</View>
										<Text className="mt-0.5 text-xs text-muted-foreground">
											{applicantEmail}
										</Text>
										<Text className="mt-1 text-[11px] text-muted-foreground/70 tabular-nums">
											Submitted: {new Date(item.created_at).toLocaleString()}
										</Text>
									</View>
								</View>
								{/* Right: Actions */}
								<View className="flex-row items-center gap-2.5">
									<Button
										size="sm"
										variant="outline"
										className="transition-transform active:scale-[0.96]"
										startContent={
											<Eye size={14} className="text-muted-foreground" />
										}
										onPress={() => handleOpenInspector(item)}>
										Inspect ID
									</Button>
									{isPending && (
										<>
											<Button
												size="sm"
												variant="primary"
												className="transition-transform active:scale-[0.96]"
												startContent={
													<CheckCircle2
														size={14}
														className="text-primary-foreground"
													/>
												}
												loading={approveMutation.isPending}
												onPress={() => void handleApprove(item.id)}>
												Approve
											</Button>
											<Button
												size="sm"
												variant="destructive"
												className="transition-transform active:scale-[0.96]"
												startContent={
													<AlertCircle
														size={14}
														className="text-destructive-foreground"
													/>
												}
												onPress={() => handleOpenInspector(item)}>
												Reject
											</Button>
										</>
									)}
								</View>
							</View>
						);
					})}
				</View>
			)}
			{/* Document Inspector Modal */}
			<DocumentInspectorModal
				item={selectedItem}
				open={isInspectorOpen}
				onClose={() => setIsInspectorOpen(false)}
				onApprove={handleApprove}
				onReject={handleReject}
				isProcessing={approveMutation.isPending || rejectMutation.isPending}
			/>
		</View>
	);
}
