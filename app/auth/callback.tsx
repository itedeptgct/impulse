import { handleAuthCallbackUrl } from "@auth/api";
import { useAuthStore } from "@auth/store";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { AlertCircle } from "lucide-react-native";
import { Button, Text } from "panelui-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function AuthCallbackScreen() {
	const url = Linking.useURL();
	const setSession = useAuthStore((state) => state.setSession);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!url) return;

		let isMounted = true;

		async function processCallback() {
			try {
				const data = await handleAuthCallbackUrl(url!);
				if (isMounted) {
					if (data?.session) {
						setSession(data.session);
					}
					router.replace("/(tabs)");
				}
			} catch (err: unknown) {
				if (isMounted) {
					const e = err as Error;
					setError(e?.message || "Authentication callback failed.");
				}
			}
		}

		void processCallback();

		return () => {
			isMounted = false;
		};
	}, [url, setSession]);

	if (error) {
		return (
			<View className="flex-1 items-center justify-center bg-background px-6">
				<View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10">
					<AlertCircle size={32} className="text-destructive" />
				</View>
				<Text
					weight="bold"
					className="text-center text-2xl text-foreground">
					Authentication Failed
				</Text>
				<Text className="mt-2 text-center text-sm text-muted-foreground">
					{error}
				</Text>
				<View className="mt-8 w-full max-w-xs">
					<Button
						variant="primary"
						size="lg"
						fullWidth
						onPress={() => router.replace("/(auth)/sign-in")}>
						Return to Sign In
					</Button>
				</View>
			</View>
		);
	}

	return (
		<View className="flex-1 items-center justify-center bg-background px-6">
			<ActivityIndicator size="large" color="#5e6ad2" />
			<Text
				weight="medium"
				className="mt-4 text-sm text-muted-foreground">
				Completing sign in...
			</Text>
		</View>
	);
}
