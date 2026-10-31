import { useAuthStore } from "@auth/store";
import { Redirect, Slot, router } from "expo-router";
import { ArrowLeft, Monitor, ShieldAlert } from "lucide-react-native";
import { Button, Text } from "panelui-native";
import { Platform, View } from "react-native";

import { AdminSkeleton } from "@/features/admin/components/AdminSkeleton";

export default function AdminLayout() {
	const session = useAuthStore((state) => state.session);
	const profile = useAuthStore((state) => state.profile);
	const isLoading = useAuthStore((state) => state.isLoading);

	if (isLoading) {
		return <AdminSkeleton />;
	}

	if (!session) {
		return <Redirect href="/(auth)/sign-in" />;
	}

	// this shit web only for now
	if (Platform.OS !== "web") {
		return (
			<View className="flex-1 items-center justify-center bg-background px-6">
				<View className="w-full max-w-sm items-center rounded-3xl border border-border bg-card p-8 text-center shadow-lg">
					<View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
						<Monitor size={32} className="text-primary" />
					</View>
					<Text
						weight="bold"
						className="text-center text-xl text-foreground">
						Desktop Web Only
					</Text>
					<Text className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">
						The Impulse Admin moderation desk is optimized for
						desktop browsers. Please access this portal via your
						computer or web browser.
					</Text>
					<View className="mt-6 w-full">
						<Button
							size="lg"
							fullWidth
							variant="primary"
							className="transition-transform active:scale-[0.96]"
							startContent={
								<ArrowLeft
									size={16}
									className="text-primary-foreground"
								/>
							}
							onPress={() => router.replace("/(tabs)")}>
							Return to Student Portal
						</Button>
					</View>
				</View>
			</View>
		);
	}

	// rbac check for admin role
	if (profile && profile.role !== "admin") {
		return (
			<View className="min-h-screen flex-1 items-center justify-center bg-background px-6">
				<View className="w-full max-w-md items-center rounded-3xl border border-destructive/30 bg-card p-8 text-center shadow-2xl">
					<View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10">
						<ShieldAlert size={32} className="text-destructive" />
					</View>
					<Text
						weight="bold"
						className="text-center text-xl text-foreground">
						Admin Access Required
					</Text>
					<Text className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">
						Your account does not have administrator privileges to
						view or manage the Impulse verification desk.
					</Text>
					<View className="mt-6 w-full">
						<Button
							size="lg"
							fullWidth
							variant="outline"
							className="transition-transform active:scale-[0.96]"
							startContent={
								<ArrowLeft
									size={16}
									className="text-muted-foreground"
								/>
							}
							onPress={() => router.replace("/(tabs)")}>
							Return to Student Portal
						</Button>
					</View>
				</View>
			</View>
		);
	}

	return <Slot />;
}
