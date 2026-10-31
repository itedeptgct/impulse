import { signOut } from "@auth/api";
import { useAuthStore } from "@auth/store";
import { router } from "expo-router";
import { ArrowLeft, LogOut, RefreshCw } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { MobileAlertSheet, NeoBadge, NeoButton } from "@/components/ui";

interface AdminHeaderProps {
	onRefresh?: () => void;
	isRefreshing?: boolean;
}

export function AdminHeader({
	onRefresh,
	isRefreshing = false,
}: AdminHeaderProps) {
	const profile = useAuthStore((state) => state.profile);
	const user = useAuthStore((state) => state.user);
	const clearSession = useAuthStore((state) => state.clearSession);

	const [isSignOutOpen, setIsSignOutOpen] = useState(false);
	const [isSigningOut, setIsSigningOut] = useState(false);

	const adminName =
		profile?.username || user?.email?.split("@")[0] || "Admin";

	const handleSignOut = async () => {
		setIsSigningOut(true);
		try {
			await signOut();
			clearSession();
			setIsSignOutOpen(false);
			router.replace("/(onboarding)/onboarding");
		} finally {
			setIsSigningOut(false);
		}
	};

	return (
		<View className="border-b-2 border-border bg-card">
			<View className="flex-row items-center justify-between px-4 py-3">
				{/* Left: Back button & Title */}
				<View className="flex-row items-center gap-2.5">
					<NeoButton
						size="sm"
						variant="outline"
						className="h-9 w-9 px-0"
						onPress={() => router.replace("/(tabs)")}
						accessibilityLabel="Return to Student Portal">
						<ArrowLeft
							size={16}
							color="#ffffff"
							strokeWidth={2.5}
						/>
					</NeoButton>

					<View className="flex-col">
						<View className="flex-row items-center gap-2">
							<Text className="font-display text-base tracking-tight text-foreground uppercase sm:text-lg">
								Admin Moderation
							</Text>
							<NeoBadge variant="primary" size="sm">
								ADMIN
							</NeoBadge>
						</View>
						<Text className="font-mono text-[10px] text-muted-foreground">
							{adminName} • Console
						</Text>
					</View>
				</View>

				{/* Right: Actions */}
				<View className="flex-row items-center gap-2">
					{onRefresh ? (
						<NeoButton
							size="sm"
							variant="outline"
							className="h-9 w-9 px-0"
							onPress={onRefresh}
							disabled={isRefreshing}
							accessibilityLabel="Refresh Data">
							<RefreshCw
								size={14}
								color={isRefreshing ? "#91e6b1" : "#ffffff"}
								className={isRefreshing ? "animate-spin" : ""}
							/>
						</NeoButton>
					) : null}

					<NeoButton
						size="sm"
						variant="destructive"
						className="h-9 w-9 px-0"
						onPress={() => setIsSignOutOpen(true)}
						accessibilityLabel="Sign out">
						<LogOut size={14} color="#ffffff" strokeWidth={2.5} />
					</NeoButton>
				</View>
			</View>

			{/* Sign Out Confirmation Sheet */}
			<MobileAlertSheet
				open={isSignOutOpen}
				onOpenChange={setIsSignOutOpen}
				title="Sign Out"
				type="warning"
				description="Are you sure you want to end your Impulse Admin session?"
				actions={[
					{
						label: "Sign Out",
						onPress: handleSignOut,
						variant: "destructive",
						loading: isSigningOut,
					},
					{
						label: "Cancel",
						onPress: () => setIsSignOutOpen(false),
						variant: "outline",
					},
				]}
			/>
		</View>
	);
}
