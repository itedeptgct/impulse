import { CheckCircle2, Clock, Users, XCircle } from "lucide-react-native";
import { Text, View } from "react-native";

import { NeoCard } from "@/components/ui";

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
		<View className="flex-row flex-wrap gap-3">
			{/* Pending Verifications */}
			<NeoCard
				className={`min-w-[45%] flex-1 p-4 ${
					pending > 0
						? "border-amber-400/80 bg-amber-950/20"
						: "border-border bg-card"
				}`}>
				<View className="flex-row items-center justify-between">
					<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
						Pending Review
					</Text>
					<View className="size-7 items-center justify-center rounded-sm border-2 border-amber-400/40 bg-amber-500/15">
						<Clock size={14} color="#fbbf24" strokeWidth={2.5} />
					</View>
				</View>
				<Text
					className={`mt-2 font-display text-3xl tabular-nums ${
						pending > 0 ? "text-amber-400" : "text-foreground"
					}`}>
					{pending}
				</Text>
				<Text className="mt-1 font-mono text-[11px] text-muted-foreground">
					{pending > 0 ? "Requires review" : "Queue all clear"}
				</Text>
			</NeoCard>

			{/* Total Registered Users */}
			<NeoCard className="min-w-[45%] flex-1 border-border bg-card p-4">
				<View className="flex-row items-center justify-between">
					<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
						Total Users
					</Text>
					<View className="size-7 items-center justify-center rounded-sm border-2 border-primary/40 bg-primary/15">
						<Users size={14} color="#91e6b1" strokeWidth={2.5} />
					</View>
				</View>
				<Text className="mt-2 font-display text-3xl text-primary tabular-nums">
					{totalUsers}
				</Text>
				<Text className="mt-1 font-mono text-[11px] text-muted-foreground">
					Registered accounts
				</Text>
			</NeoCard>

			{/* Approved Verifications */}
			<NeoCard className="min-w-[45%] flex-1 border-border bg-card p-4">
				<View className="flex-row items-center justify-between">
					<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
						Approved
					</Text>
					<View className="size-7 items-center justify-center rounded-sm border-2 border-primary/40 bg-primary/15">
						<CheckCircle2
							size={14}
							color="#91e6b1"
							strokeWidth={2.5}
						/>
					</View>
				</View>
				<Text className="mt-2 font-display text-3xl text-foreground tabular-nums">
					{approved}
				</Text>
				<Text className="mt-1 font-mono text-[11px] text-muted-foreground">
					Verified student IDs
				</Text>
			</NeoCard>

			{/* Rejected Submissions */}
			<NeoCard className="min-w-[45%] flex-1 border-border bg-card p-4">
				<View className="flex-row items-center justify-between">
					<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
						Rejected
					</Text>
					<View className="size-7 items-center justify-center rounded-sm border-2 border-destructive/40 bg-destructive/15">
						<XCircle size={14} color="#ff5c5c" strokeWidth={2.5} />
					</View>
				</View>
				<Text className="mt-2 font-display text-3xl text-foreground tabular-nums">
					{rejected}
				</Text>
				<Text className="mt-1 font-mono text-[11px] text-muted-foreground">
					Needs resubmission
				</Text>
			</NeoCard>
		</View>
	);
}
