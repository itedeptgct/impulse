import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

export default function OnboardingScreen() {
	const router = useRouter();

	// TODO!
	return (
		<ScrollView
			className="flex-1"
			contentContainerClassName="grow justify-center"
			showsVerticalScrollIndicator={false}>
			<View className="mx-auto w-full max-w-100">
				<View>
					<Text>Welcome to impulse</Text>
				</View>
			</View>
			<View>
				<Pressable onPress={() => router.push("/(auth)/sign-up")}>
					<Text>Sign Up</Text>
				</Pressable>
				<Pressable onPress={() => router.push("/(auth)/sign-in")}>
					<Text>Sign In</Text>
				</Pressable>
			</View>
		</ScrollView>
	);
}
