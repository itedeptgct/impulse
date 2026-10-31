import { useAuthStore } from "@auth/store";
import { Redirect, Tabs } from "expo-router";
import { Flame, MessageSquare, User } from "lucide-react-native";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
	const session = useAuthStore((state) => state.session);
	const isLoading = useAuthStore((state) => state.isLoading);
	const insets = useSafeAreaInsets();

	if (isLoading) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator color="#91e6b1" size="large" />
			</View>
		);
	}

	if (!session) {
		return <Redirect href="/(onboarding)/onboarding" />;
	}

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				animation: "none",
				tabBarStyle: {
					backgroundColor: "#0a0a0c",
					borderTopColor: "#2a2d3d",
					borderTopWidth: 2.5,
					height: 64 + insets.bottom,
					paddingBottom: 10,
					paddingTop: 8,
					shadowColor: "#000000",
					shadowOffset: { width: 0, height: -4 },
					shadowOpacity: 1,
					shadowRadius: 0,
					elevation: 8,
				},
				tabBarActiveTintColor: "#91e6b1",
				tabBarInactiveTintColor: "#6c7284",
				tabBarLabelStyle: {
					fontFamily: "IBMPlexMono_600SemiBold",
					fontSize: 10,
					fontWeight: "700",
					letterSpacing: 1,
					textTransform: "uppercase",
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
							strokeWidth={2.2}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="messages"
				options={{
					title: "Messages",
					tabBarIcon: ({ color, size }) => (
						<MessageSquare
							size={size || 20}
							color={color}
							strokeWidth={2.2}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: "Profile",
					tabBarIcon: ({ color, size }) => (
						<User
							size={size || 20}
							color={color}
							strokeWidth={2.2}
						/>
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
