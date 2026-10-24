import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Mail } from "lucide-react-native";
import { Button, Text } from "panelui-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OnboardingScreen() {
	const insets = useSafeAreaInsets();

	return (
		<View className="flex-1 bg-background">
			<StatusBar style="light" />
			<View className="flex-1 items-center justify-center px-6">
				<Text
					weight="bold"
					className="text-5xl tracking-tight text-foreground">
					impulse
				</Text>
				<Text className="mt-3 text-center text-base text-muted-foreground">
					The IT & CS Student Network
				</Text>
			</View>
			<View
				className="w-full rounded-t-3xl border-t border-border bg-card px-6 pt-6"
				style={{
					paddingBottom: Math.max(insets.bottom, 16) + 12,
				}}>
				<View className="w-full gap-3">
					<Button
						size="lg"
						fullWidth
						variant="primary"
						startContent={
							<Mail size={18} strokeWidth={2} color="#ffffff" />
						}
						onPress={() => router.push("/(auth)/sign-up")}>
						Create an Account
					</Button>
					<Button
						size="lg"
						fullWidth
						variant="outline"
						onPress={() => router.push("/(auth)/sign-in")}>
						Sign In to Existing Account
					</Button>
				</View>
			</View>
		</View>
	);
}
