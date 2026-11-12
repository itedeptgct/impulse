import { useAuthStore } from "@auth/store";
import { Redirect, Slot, router } from "expo-router";
import { ArrowLeft, ShieldAlert } from "lucide-react-native";
import { Text, View } from "react-native";

import { NeoButton, NeoCard } from "@/components/ui";
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

	if (profile && profile.role !== "admin") {
		return (
			<View className="flex-1 items-center justify-center bg-background px-6">
				<NeoCard className="w-full max-w-md items-center border-2 border-destructive bg-card p-8 text-center shadow-neo">
					<View className="mb-4 size-16 items-center justify-center rounded-none border-2 border-destructive bg-destructive/10">
						<ShieldAlert
							size={32}
							color="#ff2a00"
							strokeWidth={2.5}
						/>
					</View>
					<Text className="text-center font-display text-xl tracking-tight text-foreground uppercase">
						Admin Access Required
					</Text>
					<Text className="mt-2 text-center font-mono text-xs leading-relaxed text-muted-foreground">
						Your account does not have administrator privileges to
						view or manage the Impulse verification desk.
					</Text>
					<View className="mt-6 w-full">
						<NeoButton
							size="lg"
							variant="outline"
							className="w-full"
							startContent={
								<ArrowLeft
									size={16}
									color="#000000"
									strokeWidth={2.5}
								/>
							}
							onPress={() => router.replace("/(tabs)")}>
							Return to Student Portal
						</NeoButton>
					</View>
				</NeoCard>
			</View>
		);
	}

	return <Slot />;
}
