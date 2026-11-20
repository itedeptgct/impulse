import { completeGitHubSignIn } from "@auth/api";
import { useAuthStore } from "@auth/store";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { AlertCircle } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { NeoButton } from "@/components/ui";

// Dismiss the in-app browser if it's still open (e.g. the deep link
// fired before WebBrowser.openAuthSessionAsync could intercept it).
WebBrowser.maybeCompleteAuthSession();

export default function AuthCallbackScreen() {
	const deepLinkUrl = Linking.useURL();
	const params = useLocalSearchParams<{ url?: string }>();
	const setSession = useAuthStore((state) => state.setSession);
	const [errorState, setErrorState] = useState<{
		url: string | null;
		message: string;
	} | null>(null);

	// Use whichever URL is available: route param (from sign-in.tsx
	// navigation) or deep link URL (from OS-level deep link).
	const url = params.url || deepLinkUrl;
	const error = errorState?.url === (url ?? null) ? errorState.message : null;

	useEffect(() => {
		let isMounted = true;
		let retryTimer: ReturnType<typeof setTimeout> | undefined;

		async function processCallback() {
			try {
				const session = await completeGitHubSignIn(url || undefined);
				if (!isMounted) return;
				setSession(session);
				router.replace("/(tabs)");
			} catch (err: unknown) {
				if (!isMounted) return;

				try {
					const session = await completeGitHubSignIn();
					if (!isMounted) return;
					setSession(session);
					router.replace("/(tabs)");
				} catch {
					if (isMounted) {
						const e = err as Error;
						setErrorState({
							url: url ?? null,
							message:
								e?.message || "Authentication callback failed.",
						});
					}
				}
			}
		}

		if (url) {
			void processCallback();
		} else {
			retryTimer = setTimeout(() => {
				void processCallback();
			}, 800);
		}

		return () => {
			isMounted = false;
			if (retryTimer) clearTimeout(retryTimer);
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
				<Text className="mt-3 text-center font-mono text-xs leading-relaxed text-muted-foreground">
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
