import { useAuthStore } from "@auth/store";
import { StatusBar } from "expo-status-bar";
import { FileCheck, Users } from "lucide-react-native";
import { Button, Text } from "panelui-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { AdminHeader } from "@/features/admin/components/AdminHeader";
import { AdminSkeleton } from "@/features/admin/components/AdminSkeleton";
import { AdminStatsGrid } from "@/features/admin/components/AdminStatsGrid";
import { AdminUserDirectory } from "@/features/admin/components/AdminUserDirectory";
import { AdminVerificationDesk } from "@/features/admin/components/AdminVerificationDesk";
import { useAdminStats } from "@/features/admin/hooks/useAdmin";

export default function AdminWebScreen() {
	const user = useAuthStore((state) => state.user);
	const [activeSection, setActiveSection] = useState<
		"verifications" | "users"
	>("verifications");

	const { data: stats, isLoading: isStatsLoading } = useAdminStats();

	if (isStatsLoading && !stats) {
		return <AdminSkeleton />;
	}

	return (
		<View className="min-h-screen flex-1 bg-background text-foreground">
			<StatusBar style="light" />
			{/* Admin Header */}
			<AdminHeader />
			{/* Main Content Dashboard */}
			<ScrollView
				className="flex-1"
				contentContainerStyle={{ flexGrow: 1 }}
				showsVerticalScrollIndicator={false}>
				<main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
					{/* Title & Console Info */}
					<View className="mb-8 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<View>
							<View className="flex-row items-center gap-2">
								<Text
									weight="bold"
									className="text-2xl tracking-tight text-foreground sm:text-3xl">
									Moderation & Administration
								</Text>
							</View>
							<Text className="mt-1 text-xs text-muted-foreground sm:text-sm">
								Review student ID documents, audit verified
								credentials, and manage campus member
								permissions.
							</Text>
						</View>
						{/* Quick section switcher */}
						<View className="flex-row items-center rounded-xl border border-border bg-card p-1">
							<Button
								size="sm"
								variant={
									activeSection === "verifications"
										? "primary"
										: "ghost"
								}
								className="rounded-lg transition-transform active:scale-[0.96]"
								startContent={
									<FileCheck
										size={14}
										className={
											activeSection === "verifications"
												? "text-primary-foreground"
												: "text-muted-foreground"
										}
									/>
								}
								onPress={() =>
									setActiveSection("verifications")
								}>
								<View className="flex-row items-center gap-1.5">
									<Text
										weight={
											activeSection === "verifications"
												? "semibold"
												: "normal"
										}
										className={
											activeSection === "verifications"
												? "text-primary-foreground"
												: "text-muted-foreground"
										}>
										ID Verifications
									</Text>
									{(stats?.pendingVerifications ?? 0) > 0 && (
										<View className="py-0.2 rounded-full bg-amber-500/20 px-1.5">
											<Text
												weight="bold"
												className="text-[10px] text-amber-400 tabular-nums">
												{stats?.pendingVerifications}
											</Text>
										</View>
									)}
								</View>
							</Button>
							<Button
								size="sm"
								variant={
									activeSection === "users"
										? "primary"
										: "ghost"
								}
								className="rounded-lg transition-transform active:scale-[0.96]"
								startContent={
									<Users
										size={14}
										className={
											activeSection === "users"
												? "text-primary-foreground"
												: "text-muted-foreground"
										}
									/>
								}
								onPress={() => setActiveSection("users")}>
								<Text
									weight={
										activeSection === "users"
											? "semibold"
											: "normal"
									}
									className={
										activeSection === "users"
											? "text-primary-foreground"
											: "text-muted-foreground"
									}>
									Student Directory
								</Text>
							</Button>
						</View>
					</View>
					{/* Metrics Grid */}
					<View className="mb-8">
						<AdminStatsGrid stats={stats} />
					</View>
					{/* Active View: Verifications Queue or Directory */}
					{activeSection === "verifications" ? (
						<View className="rounded-3xl border border-border bg-card p-6 shadow-sm">
							<View className="mb-6 flex-row items-center justify-between border-b border-border pb-4">
								<View>
									<Text
										weight="bold"
										className="text-lg text-foreground">
										Student ID Verification Queue
									</Text>
									<Text className="mt-0.5 text-xs text-muted-foreground">
										Inspect submitted ID cards, verify
										credentials, and approve or reject
										submissions.
									</Text>
								</View>
							</View>
							<AdminVerificationDesk
								adminId={user?.id || ""}
								pendingCount={stats?.pendingVerifications}
							/>
						</View>
					) : (
						<View className="rounded-3xl border border-border bg-card p-6 shadow-sm">
							<View className="mb-6 flex-row items-center justify-between border-b border-border pb-4">
								<View>
									<Text
										weight="bold"
										className="text-lg text-foreground">
										Campus Member Directory
									</Text>
									<Text className="mt-0.5 text-xs text-muted-foreground">
										Search registered student profiles and
										adjust network access roles.
									</Text>
								</View>
							</View>

							<AdminUserDirectory />
						</View>
					)}
				</main>
			</ScrollView>
		</View>
	);
}
