import {
	CheckCircle2,
	Clock,
	FileText,
	Users,
	XCircle,
} from "lucide-react-native";
import { Text, View } from "react-native";

import { NeoCard } from "@/components/ui";

import type { AdminStats } from "../types";

interface AdminStatsGridProps {
	stats: AdminStats | undefined;
}

export function AdminStatsGrid({ stats }: AdminStatsGridProps) {
	const totalUsers = stats?.totalUsers ?? 0;
	const totalPosts = stats?.totalPosts ?? 0;
	const pending = stats?.pendingVerifications ?? 0;
	const approved = stats?.approvedVerifications ?? 0;
	const rejected = stats?.rejectedVerifications ?? 0;

	return (
		<View className="flex-row flex-wrap gap-3">
			<NeoCard
				className={`min-w-[45%] flex-1 p-4 ${
					pending > 0
						? "border-2 border-border bg-card shadow-neo-sm"
						: "border-border bg-card"
				}`}>
				<View className="flex-row items-center justify-between">
					<Text className="font-bold text-xs tracking-wider text-muted-foreground uppercase">
						Pending Review
					</Text>
					<View className="size-7 items-center justify-center rounded-none border-2 border-border bg-muted">
						<Clock size={14} color="#ff2a00" strokeWidth={2.5} />
					</View>
				</View>
				<Text
					className={`mt-2 font-display text-3xl tabular-nums ${
						pending > 0 ? "text-destructive" : "text-foreground"
					}`}>
					{pending}
				</Text>
				<Text className="mt-1 font-mono text-[11px] text-muted-foreground">
					{pending > 0 ? "Requires review" : "Queue all clear"}
				</Text>
			</NeoCard>

			<NeoCard className="min-w-[45%] flex-1 border-border bg-card p-4">
				<View className="flex-row items-center justify-between">
					<Text className="font-bold text-xs tracking-wider text-muted-foreground uppercase">
						Total Users
					</Text>
					<View className="size-7 items-center justify-center rounded-none border-2 border-border bg-muted">
						<Users size={14} color="#000000" strokeWidth={2.5} />
					</View>
				</View>
				<Text className="mt-2 font-display text-3xl text-foreground tabular-nums">
					{totalUsers}
				</Text>
				<Text className="mt-1 font-mono text-[11px] text-muted-foreground">
					Registered accounts
				</Text>
			</NeoCard>

			<NeoCard className="min-w-[45%] flex-1 border-border bg-card p-4">
				<View className="flex-row items-center justify-between">
					<Text className="font-bold text-xs tracking-wider text-muted-foreground uppercase">
						Approved
					</Text>
					<View className="size-7 items-center justify-center rounded-none border-2 border-border bg-muted">
						<CheckCircle2
							size={14}
							color="#000000"
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

			<NeoCard className="min-w-[45%] flex-1 border-border bg-card p-4">
				<View className="flex-row items-center justify-between">
					<Text className="font-bold text-xs tracking-wider text-muted-foreground uppercase">
						Rejected
					</Text>
					<View className="size-7 items-center justify-center rounded-none border-2 border-destructive bg-destructive/10">
						<XCircle size={14} color="#ff2a00" strokeWidth={2.5} />
					</View>
				</View>
				<Text className="mt-2 font-display text-3xl text-foreground tabular-nums">
					{rejected}
				</Text>
				<Text className="mt-1 font-mono text-[11px] text-muted-foreground">
					Needs resubmission
				</Text>
			</NeoCard>

			<NeoCard className="min-w-[45%] flex-1 border-border bg-card p-4">
				<View className="flex-row items-center justify-between">
					<Text className="font-bold text-xs tracking-wider text-muted-foreground uppercase">
						Transmissions
					</Text>
					<View className="size-7 items-center justify-center rounded-none border-2 border-border bg-muted">
						<FileText size={14} color="#000000" strokeWidth={2.5} />
					</View>
				</View>
				<Text className="mt-2 font-display text-3xl text-foreground tabular-nums">
					{totalPosts}
				</Text>
				<Text className="mt-1 font-mono text-[11px] text-muted-foreground">
					Published across campus
				</Text>
			</NeoCard>
		</View>
	);
}
