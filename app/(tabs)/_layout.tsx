import { useAuthStore } from "@auth/store";
import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";

export default function TabsLayout() {
	const session = useAuthStore((state) => state.session);

	// Comment me to check the main app layout
	if (!session) {
		return <Redirect href="/onboarding" />;
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
