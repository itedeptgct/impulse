import { Tabs } from "expo-router";
import { StyleSheet, Text } from "react-native";

export default function TabsLayout() {
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
