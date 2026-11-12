import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowRight, LogIn, UserPlus } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NeoButton } from "@/components/ui";

export default function OnboardingScreen() {
	const insets = useSafeAreaInsets();

	return (
		<View className="flex-1 bg-background">
			<StatusBar style="dark" />
			<ScrollView
				contentContainerStyle={{
					flexGrow: 1,
					justifyContent: "space-between",
					paddingTop: insets.top + 24,
				}}
				showsVerticalScrollIndicator={false}>
				<View className="items-center pt-48">
					<Text className="text-center font-display text-6xl tracking-tighter text-foreground uppercase sm:text-7xl">
						IMPULSE<Text className="text-destructive">.</Text>
					</Text>

					<Text className="mt-2 text-center font-bold text-xs tracking-widest text-muted-foreground uppercase">
						THE ITE DEPT STUDENT NETWORK
					</Text>
				</View>

				<View
					className="w-full border-t-2 border-border bg-card p-6 shadow-neo-lg"
					style={{
						paddingBottom: Math.max(insets.bottom, 16) + 12,
					}}>
					<View className="w-full gap-3">
						<NeoButton
							variant="primary"
							size="lg"
							className="w-full"
							startContent={
								<UserPlus
									size={18}
									color="#faf9f5"
									strokeWidth={2.5}
								/>
							}
							endContent={
								<ArrowRight
									size={18}
									color="#faf9f5"
									strokeWidth={2.5}
								/>
							}
							onPress={() => router.push("/(auth)/sign-up")}>
							CREATE AN ACCOUNT
						</NeoButton>
						<NeoButton
							variant="outline"
							size="lg"
							className="w-full"
							startContent={
								<LogIn
									size={18}
									color="#000000"
									strokeWidth={2.2}
								/>
							}
							onPress={() => router.push("/(auth)/sign-in")}>
							SIGN IN
						</NeoButton>
					</View>
				</View>
			</ScrollView>
		</View>
	);
}
