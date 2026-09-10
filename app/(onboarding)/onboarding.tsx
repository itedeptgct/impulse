import { useGoogleSignIn } from "@auth/hooks/useGoogleSignIn";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AlertCircle, Mail } from "lucide-react-native";
import { Button, Text } from "panelui-native";
import { GoogleIcon } from "panelui-native/icons";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OnboardingScreen() {
	const insets = useSafeAreaInsets();
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
		<View className="flex-1 bg-background">
			<StatusBar style="light" />
			<View className="flex-1 items-center justify-center px-6">
				<Text weight="bold" className="text-5xl tracking-tight text-foreground">
					impulse
				</Text>
				<Text className="mt-3 text-center text-base text-muted-foreground">
					ay boogs na social media platform
				</Text>
			</View>
			<View
				className="w-full rounded-t-3xl border-t border-border bg-card px-6 pt-6"
				style={{
					paddingBottom: Math.max(insets.bottom, 16) + 12,
				}}>
				{errorMessage && (
					<View className="mb-4 flex-row items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5">
						<AlertCircle size={18} className="shrink-0 text-destructive" />
						<Text className="flex-1 text-xs text-destructive">
							{errorMessage}
						</Text>
					</View>
				)}
				<View className="w-full gap-3">
					<Button
						size="xl"
						fullWidth
						variant="social"
						loading={googleSignInMutation.isPending}
						startContent={<GoogleIcon size={20} />}
						onPress={handleGoogleSignIn}>
						Continue with Google
					</Button>
					<View className="my-1 flex-row items-center gap-3">
						<View className="h-px flex-1 bg-border" />
						<Text
							weight="medium"
							className="text-xs text-muted-foreground uppercase">
							or
						</Text>
						<View className="h-px flex-1 bg-border" />
					</View>
					<Button
						size="xl"
						fullWidth
						variant="primary"
						startContent={
							<Mail
								size={18}
								strokeWidth={2}
								className="text-primary-foreground"
							/>
						}
						onPress={() => router.push("/(auth)/sign-up")}>
						Continue with Email
					</Button>
					<Button
						size="xl"
						fullWidth
						variant="outline"
						onPress={() => router.push("/(auth)/sign-in")}>
						Log In
					</Button>
				</View>
			</View>
		</View>
	);
}
