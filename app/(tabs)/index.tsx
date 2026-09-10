import { fetchUserProfile, fetchUserVerification, signOut } from "@auth/api";
import { useAuthStore } from "@auth/store";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
	AlertCircle,
	Calendar,
	CheckCircle2,
	Clock,
	LogOut,
	Mail,
	Shield,
	ShieldCheck,
	User,
	XCircle,
} from "lucide-react-native";
import { Button, Dialog, Text } from "panelui-native";
import { GoogleIcon } from "panelui-native/icons";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
	const insets = useSafeAreaInsets();
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);
	const verification = useAuthStore((state) => state.verification);
	const setProfile = useAuthStore((state) => state.setProfile);
	const setVerification = useAuthStore((state) => state.setVerification);
	const clearSession = useAuthStore((state) => state.clearSession);

	const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
	const [signOutError, setSignOutError] = useState<string | null>(null);
	const [isSigningOut, setIsSigningOut] = useState(false);

	// fetch real database profile & verification matching schema
	useEffect(() => {
		if (!user?.id) return;
		let isMounted = true;

		void fetchUserProfile(user.id).then((data) => {
			if (isMounted && data) setProfile(data);
		});

		void fetchUserVerification(user.id).then((data) => {
			if (isMounted && data) setVerification(data);
		});

		return () => {
			isMounted = false;
		};
	}, [user?.id, setProfile, setVerification]);

	const isGoogleProvider =
		user?.app_metadata?.provider === "google" ||
		user?.identities?.some((id) => id.provider === "google");

	const displayName =
		profile?.username ||
		user?.user_metadata?.full_name ||
		user?.user_metadata?.name ||
		user?.user_metadata?.username ||
		user?.email?.split("@")[0] ||
		"Impulse User";

	const email = profile?.email || user?.email || "No email available";
	const role = profile?.role || "user";
	const verificationStatus = verification?.status || "pending";

	const handleConfirmSignOut = async () => {
		setIsSigningOut(true);
		setSignOutError(null);
		try {
			await signOut();
			clearSession();
			setIsSignOutDialogOpen(false);
			router.replace("/(onboarding)/onboarding");
		} catch (error: unknown) {
			const err = error as Error;
			setSignOutError(err.message || "Failed to sign out.");
		} finally {
			setIsSigningOut(false);
		}
	};

	// initials for avatar
	const initials = displayName
		.split(" ")
		.map((part: string) => part[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	return (
		<View className="flex-1 bg-background">
			<StatusBar style="light" />
			<ScrollView
				contentContainerStyle={{
					flexGrow: 1,
					paddingTop: insets.top + 20,
					paddingBottom: Math.max(insets.bottom, 16) + 32,
					paddingHorizontal: 24,
				}}
				showsVerticalScrollIndicator={false}>
				{/* Top Header */}
				<View className="flex-row items-center justify-between pb-8">
					<Text
						weight="semibold"
						className="text-sm tracking-widest text-muted-foreground uppercase">
						impulse
					</Text>
				</View>
				{/* User Profile Card */}
				<View className="mb-6 rounded-3xl border border-border bg-card p-6">
					<View className="flex-row items-center gap-4">
						<View className="h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
							<Text weight="bold" className="text-xl text-primary">
								{initials}
							</Text>
						</View>
						<View className="flex-1">
							<View className="flex-row items-center gap-2">
								<Text
									weight="bold"
									className="text-xl tracking-tight text-foreground"
									numberOfLines={1}>
									{displayName}
								</Text>
								{role === "admin" && (
									<View className="flex-row items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5">
										<ShieldCheck size={11} className="text-primary" />
										<Text
											weight="semibold"
											className="text-[10px] text-primary uppercase">
											Admin
										</Text>
									</View>
								)}
							</View>
							<Text
								className="mt-0.5 text-xs text-muted-foreground"
								numberOfLines={1}>
								{email}
							</Text>
							<View className="mt-2.5 flex-row items-center gap-2">
								{isGoogleProvider ? (
									<View className="flex-row items-center gap-1.5 rounded-full border border-border bg-popover px-2.5 py-1">
										<GoogleIcon size={12} />
										<Text
											weight="medium"
											className="text-[11px] text-foreground">
											Google SSO
										</Text>
									</View>
								) : (
									<View className="flex-row items-center gap-1.5 rounded-full border border-border bg-popover px-2.5 py-1">
										<Mail size={12} className="text-muted-foreground" />
										<Text
											weight="medium"
											className="text-[11px] text-foreground">
											Email & Password
										</Text>
									</View>
								)}
							</View>
						</View>
					</View>
				</View>
				{/* Rejection notice if verification rejected */}
				{verificationStatus === "rejected" &&
					verification?.rejection_reason && (
						<View className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
							<View className="flex-row items-center gap-2">
								<AlertCircle size={16} className="text-destructive" />
								<Text weight="semibold" className="text-xs text-destructive">
									Verification Notes
								</Text>
							</View>
							<Text className="mt-1 text-xs text-destructive">
								{verification.rejection_reason}
							</Text>
						</View>
					)}
				{/* Account Details Section */}
				<View className="mb-6 rounded-2xl border border-border bg-card p-5">
					<Text
						weight="semibold"
						className="mb-4 text-xs tracking-wider text-muted-foreground uppercase">
						Account Overview
					</Text>
					<View className="gap-3.5">
						<View className="flex-row items-center justify-between border-b border-border pb-3">
							<View className="flex-row items-center gap-2.5">
								<User size={16} className="text-muted-foreground" />
								<Text className="text-sm text-muted-foreground">Username</Text>
							</View>
							<Text weight="medium" className="text-sm text-foreground">
								{profile?.username || displayName}
							</Text>
						</View>
						<View className="flex-row items-center justify-between border-b border-border pb-3">
							<View className="flex-row items-center gap-2.5">
								<Mail size={16} className="text-muted-foreground" />
								<Text className="text-sm text-muted-foreground">Email</Text>
							</View>
							<Text weight="medium" className="text-sm text-foreground">
								{email}
							</Text>
						</View>
						<View className="flex-row items-center justify-between border-b border-border pb-3">
							<View className="flex-row items-center gap-2.5">
								<Shield size={16} className="text-muted-foreground" />
								<Text className="text-sm text-muted-foreground">Role</Text>
							</View>
							<Text
								weight="medium"
								className="text-sm text-foreground capitalize">
								{role}
							</Text>
						</View>
						<View className="flex-row items-center justify-between pt-0.5">
							<View className="flex-row items-center gap-2.5">
								<Calendar size={16} className="text-muted-foreground" />
								<Text className="text-sm text-muted-foreground">
									Verification
								</Text>
							</View>
							<View className="flex-row items-center gap-1">
								{verificationStatus === "approved" ? (
									<>
										<CheckCircle2 size={14} className="text-emerald-400" />
										<Text weight="medium" className="text-xs text-emerald-400">
											Approved
										</Text>
									</>
								) : verificationStatus === "rejected" ? (
									<>
										<XCircle size={14} className="text-destructive" />
										<Text weight="medium" className="text-xs text-destructive">
											Rejected
										</Text>
									</>
								) : (
									<>
										<Clock size={14} className="text-amber-400" />
										<Text weight="medium" className="text-xs text-amber-400">
											Pending Admin Review
										</Text>
									</>
								)}
							</View>
						</View>
					</View>
				</View>
				<View className="mt-auto pt-4">
					<Button
						size="xl"
						fullWidth
						variant="outline"
						startContent={
							<LogOut size={18} className="text-destructive" strokeWidth={2} />
						}
						onPress={() => {
							setSignOutError(null);
							setIsSignOutDialogOpen(true);
						}}>
						<Text weight="semibold" className="text-destructive">
							Sign Out
						</Text>
					</Button>
				</View>
			</ScrollView>

			<Dialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
				<Dialog.Content className="mx-4 max-w-sm rounded-2xl border border-border bg-card p-6">
					<Dialog.Title weight="bold" className="text-xl text-foreground">
						Sign Out
					</Dialog.Title>
					<Dialog.Description className="mt-2 text-sm text-muted-foreground">
						Are you sure you want to sign out of your Impulse account?
					</Dialog.Description>
					{signOutError && (
						<View className="mt-4 flex-row items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3">
							<AlertCircle size={16} className="shrink-0 text-destructive" />
							<Text className="flex-1 text-xs text-destructive">
								{signOutError}
							</Text>
						</View>
					)}
					<Dialog.Footer className="mt-6 flex-row gap-2.5">
						<Button
							size="md"
							variant="outline"
							className="flex-1"
							onPress={() => setIsSignOutDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							size="md"
							variant="destructive"
							className="flex-1"
							loading={isSigningOut}
							onPress={handleConfirmSignOut}>
							Sign Out
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>
		</View>
	);
}
