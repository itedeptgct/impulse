import { useAuthStore } from "@auth/store";
import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function OnboardingLayout() {
	const session = useAuthStore((state) => state.session);
	const isLoading = useAuthStore((state) => state.isLoading);

	if (isLoading) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator color="#5e6ad2" />
			</View>
		);
	}

	if (session) {
		return <Redirect href="/(tabs)" />;
	}

	return <Stack screenOptions={{ headerShown: false }} />;
}
