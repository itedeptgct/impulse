import { CheckCircle2, Clock, Users, XCircle } from "lucide-react-native";
import { Text } from "panelui-native";
import { View } from "react-native";

import type { AdminStats } from "../types";

interface AdminStatsGridProps {
	stats: AdminStats | undefined;
}

export function AdminStatsGrid({ stats }: AdminStatsGridProps) {
	const totalUsers = stats?.totalUsers ?? 0;
	const pending = stats?.pendingVerifications ?? 0;
	const approved = stats?.approvedVerifications ?? 0;
	const rejected = stats?.rejectedVerifications ?? 0;

	return (
		<View className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{/* Pending Verifications */}
			<View
				className={`rounded-2xl border p-5 ${
					pending > 0
						? "border-amber-500/30 bg-amber-500/5 shadow-sm"
						: "border-border bg-card"
				}`}>
				<View className="flex-row items-center justify-between">
					<Text weight="medium" className="text-xs text-muted-foreground">
						Pending Reviews
					</Text>
					<View className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2">
						<Clock size={16} className="text-amber-400" />
					</View>
				</View>
				<Text
					weight="bold"
					className="mt-2 text-2xl tracking-tight text-foreground tabular-nums sm:text-3xl">
					{pending}
				</Text>
				<Text className="mt-1 text-[11px] text-muted-foreground">
					{pending > 0 ? "Requires admin review" : "Queue all caught up"}
				</Text>
			</View>
			{/* Total Registered Users */}
			<View className="rounded-2xl border border-border bg-card p-5">
				<View className="flex-row items-center justify-between">
					<Text weight="medium" className="text-xs text-muted-foreground">
						Registered Students
					</Text>
					<View className="rounded-xl border border-primary/20 bg-primary/10 p-2">
						<Users size={16} className="text-primary" />
					</View>
				</View>
				<Text
					weight="bold"
					className="mt-2 text-2xl tracking-tight text-foreground tabular-nums sm:text-3xl">
					{totalUsers}
				</Text>
				<Text className="mt-1 text-[11px] text-muted-foreground">
					Total network accounts
				</Text>
			</View>
			{/* Approved Verifications */}
			<View className="rounded-2xl border border-border bg-card p-5">
				<View className="flex-row items-center justify-between">
					<Text weight="medium" className="text-xs text-muted-foreground">
						Approved Verifications
					</Text>
					<View className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2">
						<CheckCircle2 size={16} className="text-emerald-400" />
					</View>
				</View>
				<Text
					weight="bold"
					className="mt-2 text-2xl tracking-tight text-foreground tabular-nums sm:text-3xl">
					{approved}
				</Text>
				<Text className="mt-1 text-[11px] text-muted-foreground">
					Verified student IDs
				</Text>
			</View>
			{/* Rejected Submissions */}
			<View className="rounded-2xl border border-border bg-card p-5">
				<View className="flex-row items-center justify-between">
					<Text weight="medium" className="text-xs text-muted-foreground">
						Rejected Documents
					</Text>
					<View className="rounded-xl border border-destructive/20 bg-destructive/10 p-2">
						<XCircle size={16} className="text-destructive" />
					</View>
				</View>
				<Text
					weight="bold"
					className="mt-2 text-2xl tracking-tight text-foreground tabular-nums sm:text-3xl">
					{rejected}
				</Text>
				<Text className="mt-1 text-[11px] text-muted-foreground">
					Requires resubmission
				</Text>
			</View>
		</View>
	);
}
