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
			{/* Hero Brand Area */}
			<View className="flex-1 items-center justify-center px-6">
				<View className="flex-row items-center justify-center gap-3">
					<Text className="font-sans text-4xl tracking-tight text-foreground">
						impulse
					</Text>
				</View>
			</View>
			<View
				className="w-full rounded-t-[36px] border-t border-border bg-card px-6 pt-6 shadow-2xl"
				style={{
					paddingBottom: Math.max(insets.bottom, 16) + 12,
				}}>
				<View className="w-full gap-3">
					{/* Sign Up */}
					<Button
						size="xl"
						fullWidth
						variant="social"
						className="min-h-14 rounded-lg border-border bg-foreground active:border"
						labelClassName="font-sans text-base font-semibold text-background"
						startContent={<Mail size={20} color="#010102" strokeWidth={2} />}
						onPress={() => router.push("/(auth)/sign-up")}>
						Sign Up
					</Button>
					{/* Log In */}
					<Button
						size="xl"
						fullWidth
						variant="outline"
						className="min-h-14 rounded-lg border-border bg-transparent active:bg-popover"
						labelClassName="font-sans text-base font-semibold text-foreground"
						onPress={() => router.push("/(auth)/sign-in")}>
						Log In
					</Button>
				</View>
			</View>
		</View>
	);
}
