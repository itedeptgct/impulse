import { useAuthStore } from "@auth/store";
import { Redirect, Slot } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function TabsWebLayout() {
	const session = useAuthStore((state) => state.session);
	const isLoading = useAuthStore((state) => state.isLoading);

	if (isLoading) {
		return (
			<View className="min-h-screen flex-1 items-center justify-center bg-background">
				<ActivityIndicator color="#10b981" size="large" />
			</View>
		);
	}

	if (!session) {
		return <Redirect href="/(onboarding)/onboarding" />;
	}

	return <Slot />;
}
