import { signOut } from "@auth/api";
import { useAuthStore } from "@auth/store";
import { router } from "expo-router";
import { ArrowLeft, LogOut, ShieldCheck, User } from "lucide-react-native";
import { Button, Dialog, Text } from "panelui-native";
import { useState } from "react";
import { View } from "react-native";

export function AdminHeader() {
	const profile = useAuthStore((state) => state.profile);
	const user = useAuthStore((state) => state.user);
	const clearSession = useAuthStore((state) => state.clearSession);

	const [isSignOutOpen, setIsSignOutOpen] = useState(false);
	const [isSigningOut, setIsSigningOut] = useState(false);

	const adminName = profile?.username || user?.email?.split("@")[0] || "Admin";

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
		<header className="border-b border-border bg-card/80 backdrop-blur-md">
			<View className="mx-auto flex-row items-center justify-between px-6 py-3.5 lg:max-w-7xl">
				{/* Brand mark & Tag */}
				<View className="flex-row items-center gap-3">
					<View className="flex-row items-center gap-2">
						<Text
							weight="bold"
							className="text-lg tracking-tight text-foreground">
							impulse
						</Text>
						<Text weight="semibold" className="text-xs text-primary uppercase">
							[admin]
						</Text>
					</View>
					<View className="hidden items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 sm:flex-row">
						<ShieldCheck size={11} className="text-primary" />
						<Text
							weight="medium"
							className="text-[10px] text-primary uppercase">
							Moderation Console
						</Text>
					</View>
				</View>
				{/* Navigation & Profile */}
				<View className="flex-row items-center gap-2.5">
					<Button
						size="sm"
						variant="outline"
						className="transition-transform active:scale-[0.96]"
						startContent={
							<ArrowLeft size={14} className="text-muted-foreground" />
						}
						onPress={() => router.push("/(tabs)")}>
						Student Portal
					</Button>
					<View className="hidden items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 md:flex-row">
						<User size={13} className="text-muted-foreground" />
						<Text weight="medium" className="text-xs text-foreground">
							{adminName}
						</Text>
					</View>
					<Button
						size="sm"
						variant="ghost"
						className="transition-transform active:scale-[0.96]"
						aria-label="Sign out"
						onPress={() => setIsSignOutOpen(true)}>
						<LogOut size={16} className="text-destructive" />
					</Button>
				</View>
			</View>
			<Dialog open={isSignOutOpen} onOpenChange={setIsSignOutOpen}>
				<Dialog.Content className="mx-4 max-w-sm rounded-2xl border border-border bg-card p-6">
					<Dialog.Title weight="bold" className="text-xl text-foreground">
						Sign Out
					</Dialog.Title>
					<Dialog.Description className="mt-2 text-sm text-muted-foreground">
						Are you sure you want to end your Impulse Admin session?
					</Dialog.Description>
					<Dialog.Footer className="mt-6 flex-row gap-2.5">
						<Button
							size="md"
							variant="outline"
							className="flex-1"
							onPress={() => setIsSignOutOpen(false)}>
							Cancel
						</Button>
						<Button
							size="md"
							variant="destructive"
							className="flex-1"
							loading={isSigningOut}
							onPress={handleSignOut}>
							Sign Out
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>
		</header>
	);
}
