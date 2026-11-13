import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowRight, LogIn, UserPlus } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NeoButton } from "@/components/ui";

const GRID_COLUMNS = 6;
const GRID_ROWS = 12;

export default function OnboardingScreen() {
	const insets = useSafeAreaInsets();

	return (
		<View className="flex-1 bg-background">
			<StatusBar style="dark" />
			<View
				pointerEvents="none"
				className="absolute inset-0 opacity-20"
				accessibilityElementsHidden>
				<View className="absolute inset-0 flex-row">
					{Array.from({ length: GRID_COLUMNS - 1 }).map(
						(_, index) => (
							<View
								key={`column-${index}`}
								className="flex-1 border-r border-border/20"
							/>
						),
					)}
					<View className="flex-1" />
				</View>
				<View className="absolute inset-0">
					{Array.from({ length: GRID_ROWS - 1 }).map((_, index) => (
						<View
							key={`row-${index}`}
							className="flex-1 border-b border-border/20"
						/>
					))}
					<View className="flex-1" />
				</View>
				<View className="absolute top-1/4 left-1/2 size-3 bg-destructive" />
			</View>
			<ScrollView
				contentContainerStyle={{
					flexGrow: 1,
					justifyContent: "space-between",
					paddingTop: insets.top + 24,
				}}
				showsVerticalScrollIndicator={false}>
				<View className="items-center pt-48">
					<Text className="text-center font-display text-6xl tracking-tight text-foreground uppercase sm:text-7xl">
						IMPULSE<Text className="text-destructive">.</Text>
					</Text>

					<Text className="text-md mt-2 text-center font-display tracking-widest text-muted-foreground uppercase">
						THE ITE DEPARTMENT STUDENT NETWORK
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
