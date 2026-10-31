import { useAuthStore } from "@auth/store";
import { StatusBar } from "expo-status-bar";
import { BarChart3, FileCheck, Users } from "lucide-react-native";
import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NeoButton } from "@/components/ui";
import { AdminHeader } from "@/features/admin/components/AdminHeader";
import { AdminSkeleton } from "@/features/admin/components/AdminSkeleton";
import { AdminStatsGrid } from "@/features/admin/components/AdminStatsGrid";
import { AdminUserDirectory } from "@/features/admin/components/AdminUserDirectory";
import { AdminVerificationDesk } from "@/features/admin/components/AdminVerificationDesk";
import { useAdminStats } from "@/features/admin/hooks/useAdmin";

type AdminSection = "queue" | "stats" | "directory";

export default function AdminScreen() {
	const insets = useSafeAreaInsets();
	const user = useAuthStore((state) => state.user);
	const [activeSection, setActiveSection] = useState<AdminSection>("queue");

	const {
		data: stats,
		isLoading: isStatsLoading,
		refetch: refetchStats,
		isFetching: isStatsFetching,
	} = useAdminStats();

	if (isStatsLoading && !stats) {
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
			<StatusBar style="light" />

			{/* Top Admin Header */}
			<AdminHeader
				onRefresh={() => void refetchStats()}
				isRefreshing={isStatsFetching}
			/>

			{/* Main Content Area */}
			<ScrollView
				className="flex-1"
				contentContainerStyle={{ paddingBottom: 32 }}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={isStatsFetching}
						onRefresh={() => void refetchStats()}
						tintColor="#91e6b1"
						colors={["#91e6b1"]}
					/>
				}>
				<View className="px-4 pt-4">
					{/* Section Switcher Tabs */}
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={{ gap: 8 }}
						className="pb-3">
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
											? "#0a0a0c"
											: "#ffffff"
									}
									strokeWidth={2.5}
								/>
							}
							endContent={
								pendingCount > 0 ? (
									<View
										className={`rounded-sm px-1.5 py-0.5 ${
											activeSection === "queue"
												? "bg-black/30"
												: "bg-amber-500/20"
										}`}>
										<Text
											className={`font-mono text-[10px] tabular-nums ${
												activeSection === "queue"
													? "text-primary-foreground"
													: "text-amber-400"
											}`}>
											{pendingCount}
										</Text>
									</View>
								) : undefined
							}>
							VERIFICATION QUEUE
						</NeoButton>

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
											? "#0a0a0c"
											: "#ffffff"
									}
									strokeWidth={2.5}
								/>
							}>
							STATS
						</NeoButton>

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
											? "#0a0a0c"
											: "#ffffff"
									}
									strokeWidth={2.5}
								/>
							}>
							USER DIRECTORY
						</NeoButton>
					</ScrollView>

					{/* Active Section Content */}
					{activeSection === "queue" && (
						<View className="mt-2 gap-4">
							<View>
								<Text className="font-display text-lg tracking-tight text-foreground uppercase">
									Student Verification Queue
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

					{activeSection === "stats" && (
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

					{activeSection === "directory" && (
						<View className="mt-2 gap-4">
							<View>
								<Text className="font-display text-lg tracking-tight text-foreground uppercase">
									Campus User Directory
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
