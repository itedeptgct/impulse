import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowRight, Mail, Sparkles } from "lucide-react-native";
import { Button, Text } from "panelui-native";
import { ScrollView, View } from "react-native";

export default function OnboardingWebScreen() {
	return (
		<View className="min-h-screen flex-1 bg-background text-foreground">
			<StatusBar style="light" />
			{/* Desktop Top Navbar */}
			<header className="border-b border-border bg-background/80 backdrop-blur-md">
				<View className="mx-auto flex-row items-center justify-between px-6 py-2.5 lg:max-w-7xl lg:px-8">
					<View className="flex-row items-center gap-3">
						<Text
							weight="bold"
							className="text-lg tracking-tight text-foreground">
							impulse
						</Text>
					</View>
					<View className="flex-row items-center gap-2.5">
						<Text className="hidden text-xs text-muted-foreground md:inline">
							Already part of the network?
						</Text>
						<Button
							size="sm"
							variant="outline"
							onPress={() => router.push("/(auth)/sign-in")}>
							Log In
						</Button>
					</View>
				</View>
			</header>
			{/* Main Content Area */}
			<ScrollView
				contentContainerStyle={{
					flexGrow: 1,
					justifyContent: "center",
				}}
				showsVerticalScrollIndicator={false}
				className="flex-1">
				<View className="mx-auto w-full max-w-md flex-1 justify-center px-4 py-4 md:py-6">
					<View className="rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6">
						<View className="pb-3.5">
							<View className="mb-1 flex-row items-center gap-1.5">
								<Sparkles size={14} color="#10b981" />
								<Text
									weight="medium"
									className="text-[11px] tracking-wider text-primary uppercase">
									Get Started
								</Text>
							</View>
							<Text
								weight="bold"
								className="text-xl tracking-tight text-foreground sm:text-2xl">
								Join the Network
							</Text>
							<Text className="mt-1 text-xs text-muted-foreground">
								Create your account with your student
								credentials to begin student verification.
							</Text>
						</View>
						{/* Auth CTAs */}
						<View className="gap-2.5">
							<Button
								size="md"
								fullWidth
								variant="primary"
								startContent={
									<Mail
										size={16}
										strokeWidth={2}
										color="#ffffff"
									/>
								}
								endContent={
									<ArrowRight size={15} color="#ffffff" />
								}
								onPress={() => router.push("/(auth)/sign-up")}>
								Create Student Account
							</Button>
							<Button
								size="md"
								fullWidth
								variant="outline"
								onPress={() => router.push("/(auth)/sign-in")}>
								Log In to Existing Account
							</Button>
						</View>
						<View className="mt-4 border-t border-border pt-3">
							<Text className="text-center text-[11px] leading-relaxed text-muted-foreground">
								By joining impulse, you agree to uphold student
								conduct and verify your active student status
								with your official ID.
							</Text>
						</View>
					</View>
				</View>
			</ScrollView>
			{/* Minimal Web Footer */}
			<footer className="border-t border-border bg-background/60 py-2.5">
				<View className="mx-auto flex-row items-center justify-between px-6 lg:max-w-7xl lg:px-8">
					<Text className="text-xs text-muted-foreground">
						© 2026 impulse
					</Text>
					<Text className="text-xs text-muted-foreground">
						Built for students, by students.
					</Text>
				</View>
			</footer>
		</View>
	);
}
