import { useAuthStore } from "@auth/store";
import { Redirect, Slot, Tabs } from "expo-router";
import { Flame, Shield, User } from "lucide-react-native";
import { ActivityIndicator, Platform, View } from "react-native";

export default function TabsLayout() {
	const session = useAuthStore((state) => state.session);
	const isLoading = useAuthStore((state) => state.isLoading);

	if (isLoading) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator color="#10b981" size="large" />
			</View>
		);
	}

	if (!session) {
		return <Redirect href="/(onboarding)/onboarding" />;
	}

	// On Web, do not use mobile bottom tabs
	if (Platform.OS === "web") {
		return <Slot />;
	}

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarStyle: {
					backgroundColor: "#1f1f1f",
					borderTopColor: "rgba(255, 255, 255, 0.08)",
					borderTopWidth: 1,
					height: 60,
					paddingBottom: 16,
					paddingTop: 6,
				},
				tabBarActiveTintColor: "#10b981",
				tabBarInactiveTintColor: "#8d8d8d",
				tabBarLabelStyle: {
					fontSize: 11,
					fontWeight: "600",
				},
			}}>
			<Tabs.Screen
				name="index"
				options={{
					title: "Feed",
					tabBarIcon: ({ color, size }) => (
						<Flame
							size={size || 20}
							color={color}
							strokeWidth={2}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="guilds"
				options={{
					title: "Guilds",
					tabBarIcon: ({ color, size }) => (
						<Shield
							size={size || 20}
							color={color}
							strokeWidth={2}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: "Profile",
					tabBarIcon: ({ color, size }) => (
						<User size={size || 20} color={color} strokeWidth={2} />
					),
				}}
			/>
			<Tabs.Screen
				name="u/[username]"
				options={{
					href: null,
					headerShown: false,
				}}
			/>
		</Tabs>
	);
}
