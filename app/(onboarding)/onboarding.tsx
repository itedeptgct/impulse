import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowRight, LogIn, UserPlus } from "lucide-react-native";
import {
	Platform,
	ScrollView,
	Text,
	View,
	useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NeoButton, OnboardingBackground } from "@/components/ui";

export default function OnboardingScreen() {
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const isDesktop = Platform.OS === "web" && width >= 1024;

	return (
		<View className="flex-1 bg-background">
			<StatusBar style="dark" />
			<OnboardingBackground />
			<ScrollView
				contentContainerStyle={{
					flexGrow: 1,
					justifyContent: isDesktop ? "center" : "space-between",
					alignItems: isDesktop ? "center" : undefined,
					paddingTop: isDesktop ? 32 : insets.top + 24,
					paddingBottom: isDesktop ? 32 : 0,
					paddingHorizontal: isDesktop ? 48 : 0,
				}}
				showsVerticalScrollIndicator={false}>
				<View
					style={
						isDesktop
							? {
									width: "100%",
									maxWidth: 1120,
									flex: 1,
									flexDirection: "row",
									alignItems: "center",
									gap: 64,
								}
							: { flex: 1, justifyContent: "space-between" }
					}>
					<View
						className={
							isDesktop
								? "flex-1 items-start"
								: "items-center pt-48"
						}>
						<Text
							className={`font-display tracking-tight text-foreground uppercase ${
								isDesktop
									? "text-left text-7xl"
									: "text-center text-6xl sm:text-7xl"
							}`}>
							IMPULSE<Text className="text-destructive">.</Text>
						</Text>

						<Text
							className={`mt-2 font-display tracking-widest text-muted-foreground uppercase ${
								isDesktop
									? "text-left text-base"
									: "text-md text-center"
							}`}>
							THE ITE DEPARTMENT STUDENT NETWORK
						</Text>

						{isDesktop && (
							<Text className="mt-6 max-w-lg font-mono text-sm leading-6 text-muted-foreground">
								Connect with your campus community, discover
								student groups, and keep up with what is
								happening across ITE.
							</Text>
						)}
					</View>

					<View
						className={
							isDesktop
								? "w-full border-2 border-border bg-card p-8 shadow-neo-lg"
								: "w-full border-t-2 border-border bg-card p-6 shadow-neo-lg"
						}
						style={{
							paddingBottom: Math.max(insets.bottom, 16) + 12,
							...(isDesktop
								? { maxWidth: 440, flexShrink: 0 }
								: {}),
						}}>
						{isDesktop && (
							<View className="mb-6">
								<Text className="font-display text-2xl tracking-tight text-foreground uppercase">
									GET STARTED
								</Text>
								<Text className="mt-1 font-mono text-xs text-muted-foreground uppercase">
									CHOOSE HOW YOU WANT TO CONTINUE
								</Text>
							</View>
						)}
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
				</View>
			</ScrollView>
		</View>
	);
}
