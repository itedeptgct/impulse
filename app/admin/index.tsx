import { useAuthStore } from "@auth/store";
import { StatusBar } from "expo-status-bar";
import {
	BarChart3,
	FileCheck,
	FileText,
	Flag,
	Users,
} from "lucide-react-native";
import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NeoButton } from "@/components/ui";
import { AdminHeader } from "@/features/admin/components/AdminHeader";
import { AdminPostDirectory } from "@/features/admin/components/AdminPostDirectory";
import { AdminReportsQueue } from "@/features/admin/components/AdminReportsQueue";
import { AdminSkeleton } from "@/features/admin/components/AdminSkeleton";
import { AdminStatsGrid } from "@/features/admin/components/AdminStatsGrid";
import { AdminUserDirectory } from "@/features/admin/components/AdminUserDirectory";
import { AdminVerificationDesk } from "@/features/admin/components/AdminVerificationDesk";
import { useAdminStats } from "@/features/admin/hooks/useAdmin";
import { useModerationReports } from "@/features/moderation/hooks/useModeration";

type AdminSection = "queue" | "reports" | "posts" | "stats" | "directory";

export default function AdminScreen() {
	const insets = useSafeAreaInsets();
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);
	const role = profile?.role;
	const isHouseMod = role === "house_mod";
	const isAdmin = role === "admin";

	const [activeSection, setActiveSection] = useState<AdminSection>(
		isHouseMod ? "reports" : "queue",
	);

	const {
		data: stats,
		isLoading: isStatsLoading,
		refetch: refetchStats,
		isFetching: isStatsFetching,
	} = useAdminStats();

	const {
		data: openReports,
		refetch: refetchReports,
		isFetching: isReportsFetching,
	} = useModerationReports("open");

	const pendingReportsCount = (openReports || []).filter((r) =>
		isHouseMod && profile?.guild ? r.guild === profile.guild : true,
	).length;

	const handleRefresh = async () => {
		await Promise.all([refetchStats(), refetchReports()]);
	};

	const isRefreshing = isStatsFetching || isReportsFetching;

	if (isStatsLoading && !stats && !isHouseMod) {
		return <AdminSkeleton />;
	}

	const pendingCount = stats?.pendingVerifications ?? 0;

	return (
		<View
			className="flex-1 bg-background"
			style={{
				paddingTop: insets.top,
				paddingBottom: insets.bottom,
			}}>
			<StatusBar style="dark" />

			<AdminHeader
				onRefresh={() => void handleRefresh()}
				isRefreshing={isRefreshing}
			/>

			<ScrollView
				className="flex-1"
				contentContainerStyle={{ paddingBottom: 32 }}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={() => void handleRefresh()}
						tintColor="#000000"
						colors={["#000000"]}
					/>
				}>
				<View className="px-4 pt-4">
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={{ gap: 8 }}
						className="pb-3">
						{isAdmin && (
							<NeoButton
								size="sm"
								variant={
									activeSection === "queue"
										? "primary"
										: "outline"
								}
								onPress={() => setActiveSection("queue")}
								startContent={
									<FileCheck
										size={14}
										color={
											activeSection === "queue"
												? "#faf9f5"
												: "#000000"
										}
										strokeWidth={2.5}
									/>
								}
								endContent={
									pendingCount > 0 ? (
										<View
											className={`rounded-none border border-border px-1.5 py-0.5 ${
												activeSection === "queue"
													? "bg-destructive"
													: "bg-secondary"
											}`}>
											<Text
												className={`font-bold text-[10px] tabular-nums ${
													activeSection === "queue"
														? "text-primary-foreground"
														: "text-foreground"
												}`}>
												{pendingCount}
											</Text>
										</View>
									) : undefined
								}>
								VERIFICATION QUEUE
							</NeoButton>
						)}

						<NeoButton
							size="sm"
							variant={
								activeSection === "reports"
									? "primary"
									: "outline"
							}
							onPress={() => setActiveSection("reports")}
							startContent={
								<Flag
									size={14}
									color={
										activeSection === "reports"
											? "#faf9f5"
											: "#000000"
									}
									strokeWidth={2.5}
								/>
							}
							endContent={
								pendingReportsCount > 0 ? (
									<View
										className={`rounded-none border border-border px-1.5 py-0.5 ${
											activeSection === "reports"
												? "bg-destructive"
												: "bg-secondary"
										}`}>
										<Text
											className={`font-bold text-[10px] tabular-nums ${
												activeSection === "reports"
													? "text-primary-foreground"
													: "text-foreground"
											}`}>
											{pendingReportsCount}
										</Text>
									</View>
								) : undefined
							}>
							REPORTS
						</NeoButton>

						<NeoButton
							size="sm"
							variant={
								activeSection === "posts"
									? "primary"
									: "outline"
							}
							onPress={() => setActiveSection("posts")}
							startContent={
								<FileText
									size={14}
									color={
										activeSection === "posts"
											? "#faf9f5"
											: "#000000"
									}
									strokeWidth={2.5}
								/>
							}>
							POSTS
						</NeoButton>

						{!isHouseMod && (
							<NeoButton
								size="sm"
								variant={
									activeSection === "stats"
										? "primary"
										: "outline"
								}
								onPress={() => setActiveSection("stats")}
								startContent={
									<BarChart3
										size={14}
										color={
											activeSection === "stats"
												? "#faf9f5"
												: "#000000"
										}
										strokeWidth={2.5}
									/>
								}>
								STATS
							</NeoButton>
						)}

						{!isHouseMod && (
							<NeoButton
								size="sm"
								variant={
									activeSection === "directory"
										? "primary"
										: "outline"
								}
								onPress={() => setActiveSection("directory")}
								startContent={
									<Users
										size={14}
										color={
											activeSection === "directory"
												? "#faf9f5"
												: "#000000"
										}
										strokeWidth={2.5}
									/>
								}>
								USER DIRECTORY
							</NeoButton>
						)}
					</ScrollView>

					{activeSection === "reports" && (
						<View className="mt-2 gap-4">
							<View>
								<Text className="font-display text-lg tracking-tight text-foreground uppercase">
									Incident Reports Queue
								</Text>
								<Text className="mt-0.5 font-mono text-xs text-muted-foreground">
									{isHouseMod
										? "Audit reports and manage flagged content within your house."
										: "Inspect incident reports, remove abusive transmissions, and enforce campus conduct standards."}
								</Text>
							</View>
							<AdminReportsQueue />
						</View>
					)}

					{activeSection === "queue" && isAdmin && (
						<View className="mt-2 gap-4">
							<View>
								<Text className="font-display text-lg tracking-tight text-foreground uppercase">
									Verification Queue
								</Text>
								<Text className="mt-0.5 font-mono text-xs text-muted-foreground">
									Inspect submitted ID cards, verify
									credentials, and approve or reject
									submissions.
								</Text>
							</View>
							<AdminVerificationDesk
								adminId={user?.id || ""}
								pendingCount={pendingCount}
							/>
						</View>
					)}

					{activeSection === "posts" && (
						<View className="mt-2 gap-4">
							<View>
								<Text className="font-display text-lg tracking-tight text-foreground uppercase">
									Post Management
								</Text>
								<Text className="mt-0.5 font-mono text-xs text-muted-foreground">
									Inspect, edit, and moderate student
									transmissions across public and house feeds.
								</Text>
							</View>
							<AdminPostDirectory />
						</View>
					)}

					{activeSection === "stats" && !isHouseMod && (
						<View className="mt-2 gap-4">
							<View>
								<Text className="font-display text-lg tracking-tight text-foreground uppercase">
									Platform Metrics & Stats
								</Text>
								<Text className="mt-0.5 font-mono text-xs text-muted-foreground">
									Audit metrics for student identity
									verifications and campus network accounts.
								</Text>
							</View>
							<AdminStatsGrid stats={stats} />
						</View>
					)}

					{activeSection === "directory" && !isHouseMod && (
						<View className="mt-2 gap-4">
							<View>
								<Text className="font-display text-lg tracking-tight text-foreground uppercase">
									User Directory
								</Text>
								<Text className="mt-0.5 font-mono text-xs text-muted-foreground">
									Search registered student profiles and
									adjust administrator access privileges.
								</Text>
							</View>
							<AdminUserDirectory />
						</View>
					)}
				</View>
			</ScrollView>
		</View>
	);
}
