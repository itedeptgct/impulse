import { useAuthStore } from "@auth/store";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";

export default function TabsLayout() {
	const session = useAuthStore((state) => state.session);
	const isLoading = useAuthStore((state) => state.isLoading);

	if (isLoading) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator color="#5e6ad2" />
			</View>
		);
	}

	if (!session) {
		return <Redirect href="/(onboarding)/onboarding" />;
	}

	return (
		<Tabs screenOptions={{ headerShown: false }}>
			<Tabs.Screen
				name="index"
				options={{
					title: "Home",
					tabBarIcon: ({ color, size }) => (
						<Text style={{ color, fontSize: size }}>🏠</Text>
					),
				}}
			/>
		</Tabs>
	);
}
