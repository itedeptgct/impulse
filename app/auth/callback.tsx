import { handleAuthCallbackUrl } from "@auth/api";
import { useAuthStore } from "@auth/store";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { AlertCircle } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { NeoButton } from "@/components/ui";

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
				<View className="mb-6 size-16 items-center justify-center rounded-none border-2 border-destructive bg-destructive/10">
					<AlertCircle size={32} color="#ff2a00" />
				</View>
				<Text className="text-center font-display text-2xl text-foreground uppercase">
					Authentication Failed
				</Text>
				<Text className="mt-2 text-center font-mono text-xs text-muted-foreground">
					{error}
				</Text>
				<View className="mt-8 w-full max-w-xs">
					<NeoButton
						variant="primary"
						size="lg"
						className="w-full"
						onPress={() => router.replace("/(auth)/sign-in")}>
						RETURN TO SIGN IN
					</NeoButton>
				</View>
			</View>
		);
	}

	return (
		<View className="flex-1 items-center justify-center bg-background px-6">
			<ActivityIndicator size="large" color="#000000" />
			<Text className="mt-4 font-mono text-xs text-muted-foreground uppercase">
				Completing sign in...
			</Text>
		</View>
	);
}
