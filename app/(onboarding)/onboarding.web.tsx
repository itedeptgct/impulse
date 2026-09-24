import { useGoogleSignIn } from "@auth/hooks/useGoogleSignIn";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
	AlertCircle,
	ArrowRight,
	Mail,
	Shield,
	Sparkles,
} from "lucide-react-native";
import { Button, Text } from "panelui-native";
import { GoogleIcon } from "panelui-native/icons";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

export default function OnboardingWebScreen() {
	const googleSignInMutation = useGoogleSignIn();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const handleGoogleSignIn = async () => {
		setErrorMessage(null);
		try {
			const data = await googleSignInMutation.mutateAsync();
			if (data?.session) {
				router.replace("/(tabs)");
			}
		} catch (err: unknown) {
			const error = err as Error;
			setErrorMessage(error?.message || "Failed to sign in with Google.");
		}
	};

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
						<Button
							size="sm"
							variant="primary"
							onPress={() => router.push("/(auth)/sign-up")}>
							Create Account
						</Button>
					</View>
				</View>
			</header>
			{/* Main Content Area */}
			<ScrollView
				contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
				showsVerticalScrollIndicator={false}
				className="flex-1">
				<View className="mx-auto w-full max-w-md flex-1 justify-center px-4 py-4 md:py-6">
					<View className="rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6">
						<View className="pb-3.5">
							<View className="mb-1 flex-row items-center gap-1.5">
								<Sparkles size={14} className="text-primary" />
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
								Create your account with your GCT credentials to begin student
								verification.
							</Text>
						</View>
						{errorMessage && (
							<View className="mb-4 flex-row items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3">
								<AlertCircle size={16} className="shrink-0 text-destructive" />
								<Text className="flex-1 text-xs text-destructive">
									{errorMessage}
								</Text>
							</View>
						)}
						{/* Auth CTAs */}
						<View className="gap-2.5">
							<Button
								size="md"
								fullWidth
								variant="social"
								disabled={true}
								loading={googleSignInMutation.isPending}
								startContent={<GoogleIcon size={18} />}
								onPress={handleGoogleSignIn}>
								Continue with Google
							</Button>
							<View className="my-1.5 flex-row items-center gap-2.5">
								<View className="h-px flex-1 bg-border" />
								<Text
									weight="medium"
									className="text-[10px] text-muted-foreground uppercase">
									or
								</Text>
								<View className="h-px flex-1 bg-border" />
							</View>
							<Button
								size="md"
								fullWidth
								variant="primary"
								startContent={
									<Mail
										size={16}
										strokeWidth={2}
										className="text-primary-foreground"
									/>
								}
								endContent={
									<ArrowRight size={15} className="text-primary-foreground" />
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
								By joining impulse, you agree to uphold student conduct and
								verify your active student status with your official ID.
							</Text>
						</View>
					</View>
				</View>
			</ScrollView>
			{/* Minimal Web Footer */}
			<footer className="border-t border-border bg-background/60 py-2.5">
				<View className="mx-auto flex-row items-center justify-between px-6 lg:max-w-7xl lg:px-8">
					<Text className="text-xs text-muted-foreground">
						© {new Date().getFullYear()} impulse
					</Text>
					<Text className="text-xs text-muted-foreground">
						Built for students, by students.
					</Text>
				</View>
			</footer>
		</View>
	);
}
