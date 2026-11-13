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
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { NeoBadge, NeoButton, NeoCard, NeoInput } from "@/components/ui";

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
		<View className="gap-4">
			<NeoInput
				value={search}
				onChangeText={setSearch}
				placeholder="Search by username, email, ID..."
				startContent={
					<Search size={15} color="#000000" strokeWidth={2.5} />
				}
			/>

			<View className="flex-row items-center justify-between gap-2">
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ gap: 6 }}
					className="flex-1">
					{(
						[
							{
								key: "pending",
								label: "Pending",
								count: pendingCount,
							},
							{ key: "all", label: "All" },
							{ key: "approved", label: "Approved" },
							{ key: "rejected", label: "Rejected" },
						] as const
					).map((tab) => {
						const isActive = filter === tab.key;
						return (
							<NeoButton
								key={tab.key}
								size="sm"
								variant={isActive ? "primary" : "outline"}
								onPress={() => setFilter(tab.key)}
								endContent={
									"count" in tab && tab.count > 0 ? (
										<View
											className={`rounded-none px-1.5 py-0.5 ${
												isActive
													? "bg-surface/30"
													: "bg-primary/10"
											}`}>
											<Text
												className={`font-mono text-[10px] tabular-nums ${
													isActive
														? "text-primary-foreground"
														: "text-foreground"
												}`}>
												{tab.count}
											</Text>
										</View>
									) : undefined
								}>
								{tab.label}
							</NeoButton>
						);
					})}
				</ScrollView>

				<NeoButton
					size="sm"
					variant="outline"
					className="size-9 px-0"
					accessibilityLabel="Refresh verifications"
					onPress={() => void refetch()}>
					<RefreshCw
						size={14}
						color={isFetching ? "#ff2a00" : "#000000"}
						className={isFetching ? "animate-spin" : ""}
					/>
				</NeoButton>
			</View>

			{isLoading ? (
				<View className="gap-3">
					{[1, 2, 3].map((i) => (
						<View
							key={i}
							className="h-28 animate-pulse rounded-none border-2 border-border bg-card p-4 shadow-neo-sm"
						/>
					))}
				</View>
			) : !verifications || verifications.length === 0 ? (
				<NeoCard className="items-center justify-center border-solid border-border bg-card py-12 text-center">
					<CheckCircle2 size={36} color="#000000" strokeWidth={2.5} />
					<Text className="mt-3 font-display text-base tracking-tight text-foreground uppercase">
						{filter === "pending"
							? "Queue All Clear"
							: "No Records Found"}
					</Text>
					<Text className="mt-1 text-center font-mono text-xs text-muted-foreground">
						{filter === "pending"
							? "There are currently no pending student ID submissions to review."
							: "No submissions match your current search or filter criteria."}
					</Text>
				</NeoCard>
			) : (
				<View className="gap-3">
					{verifications.map((item) => {
						const isPending = item.status === "pending";
						const isApproved = item.status === "approved";
						const isRejected = item.status === "rejected";
						const applicantName =
							item.profile?.username || "Student Applicant";
						const applicantEmail =
							item.profile?.email || item.user_id;

						return (
							<NeoCard
								key={item.id}
								className={`gap-3 p-4 ${
									isPending
										? "border-2 border-border bg-card shadow-neo-sm"
										: "border-border bg-card"
								}`}>
								<View className="flex-row items-center gap-3">
									<View className="size-11 items-center justify-center rounded-none border-2 border-border bg-muted">
										<User
											size={18}
											color="#000000"
											strokeWidth={2.5}
										/>
									</View>
									<View className="flex-1">
										<View className="flex-row items-center justify-between">
											<Text className="font-bold text-sm text-foreground">
												{applicantName}
											</Text>
											{isApproved && (
												<NeoBadge
													variant="primary"
													size="sm"
													startContent={
														<CheckCircle2
															size={10}
															color="#ffffff"
															strokeWidth={2.5}
														/>
													}>
													APPROVED
												</NeoBadge>
											)}
											{isRejected && (
												<NeoBadge
													variant="outline"
													size="sm"
													startContent={
														<XCircle
															size={10}
															color="#ff2a00"
															strokeWidth={2.5}
														/>
													}
													textClassName="text-destructive">
													REJECTED
												</NeoBadge>
											)}
											{isPending && (
												<NeoBadge
													variant="default"
													size="sm"
													className="border-2 border-border bg-muted"
													textClassName="text-foreground"
													startContent={
														<Clock
															size={10}
															color="#000000"
															strokeWidth={2.5}
														/>
													}>
													PENDING
												</NeoBadge>
											)}
										</View>
										<Text className="mt-0.5 font-mono text-xs text-muted-foreground">
											{applicantEmail}
										</Text>
										<Text className="mt-1 font-mono text-[10px] text-muted-foreground/80 tabular-nums">
											Submitted:{" "}
											{new Date(
												item.created_at,
											).toLocaleString()}
										</Text>
									</View>
								</View>

								<View className="flex-row items-center gap-2 border-t border-border/40 pt-2.5">
									<NeoButton
										size="sm"
										variant="outline"
										className="flex-1"
										startContent={
											<Eye
												size={13}
												color="#000000"
												strokeWidth={2.5}
											/>
										}
										onPress={() =>
											handleOpenInspector(item)
										}></NeoButton>
									{isPending && (
										<>
											<NeoButton
												size="sm"
												variant="primary"
												className="flex-1"
												loading={
													approveMutation.isPending
												}
												startContent={
													!approveMutation.isPending ? (
														<CheckCircle2
															size={13}
															color="#ffffff"
															strokeWidth={2.5}
														/>
													) : undefined
												}
												onPress={() =>
													void handleApprove(item.id)
												}></NeoButton>
											<NeoButton
												size="sm"
												variant="destructive"
												className="flex-1"
												startContent={
													<AlertCircle
														size={13}
														color="#ffffff"
														strokeWidth={2.5}
													/>
												}
												textClassName="text-primary-foreground font-bold"
												onPress={() =>
													handleOpenInspector(item)
												}></NeoButton>
										</>
									)}
								</View>
							</NeoCard>
						);
					})}
				</View>
			)}

			<DocumentInspectorModal
				item={selectedItem}
				open={isInspectorOpen}
				onClose={() => setIsInspectorOpen(false)}
				onApprove={handleApprove}
				onReject={handleReject}
				isProcessing={
					approveMutation.isPending || rejectMutation.isPending
				}
			/>
		</View>
	);
}
