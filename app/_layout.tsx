import { useAuthStore } from "@auth/store";
import { Anton_400Regular } from "@expo-google-fonts/anton";
import {
	CourierPrime_400Regular,
	CourierPrime_700Bold,
} from "@expo-google-fonts/courier-prime";
import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono";
import {
	isSupabaseConfigured,
	supabase,
	supabaseConfigError,
} from "@lib/supabase";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AlertTriangle } from "lucide-react-native";
import { PanelUIProvider } from "panelui-native";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Uniwind } from "uniwind";

import { MobileAlertSheet, NeoCard } from "@/components/ui";
import {
	registerForPushNotificationsAsync,
	setupNotificationResponseListener,
} from "@/features/notifications/push";
import { useGlobalPresence } from "@/features/presence";

import "@theme/global.css";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60,
			retry: 2,
		},
	},
});

// oxlint-disable-next-line react/only-export-components
export const unstable_settings = {
	anchor: "(tabs)",
	initialRouteName: "(tabs)",
};

export default function RootLayout() {
	const userId = useAuthStore((state) => state.user?.id);
	const sessionExpiredMessage = useAuthStore(
		(state) => state.sessionExpiredMessage,
	);
	const dismissSessionExpired = useAuthStore(
		(state) => state.dismissSessionExpired,
	);

	useGlobalPresence();

	useEffect(() => {
		if (!userId) return;
		void registerForPushNotificationsAsync(userId);
	}, [userId]);

	useEffect(() => {
		return setupNotificationResponseListener((path) => {
			router.push(path as never);
		});
	}, []);

	useEffect(() => {
		if (sessionExpiredMessage) {
			queryClient.clear();
		}
	}, [sessionExpiredMessage]);

	const [fontsLoaded] = useFonts({
		Anton_400Regular,
		CourierPrime_400Regular,
		CourierPrime_700Bold,
		JetBrainsMono_400Regular,
	});

	useEffect(() => {
		try {
			Uniwind.setTheme("light");
		} catch (error) {
			console.error("Failed to set theme to light", error);
		}

		if (!isSupabaseConfigured) {
			return;
		}

		const syncUserData = (userId: string | undefined) => {
			if (!userId) return;
			void useAuthStore.getState().syncUserData(userId);
		};

		void supabase.auth.getSession().then(({ data: { session } }) => {
			useAuthStore.getState().setSession(session);
			syncUserData(session?.user?.id);
		});

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			useAuthStore.getState().setSession(session);
			syncUserData(session?.user?.id);
		});

		return () => {
			subscription.unsubscribe();
		};
	}, []);

	if (!fontsLoaded) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator color="#000000" />
			</View>
		);
	}

	if (!isSupabaseConfigured) {
		return (
			<View className="flex-1 items-center justify-center bg-background px-6">
				<StatusBar style="dark" />
				<NeoCard className="w-full max-w-md items-center p-6 text-center shadow-neo">
					<View className="mb-4 border-2 border-border bg-destructive p-3 shadow-neo-sm">
						<AlertTriangle
							size={32}
							color="#faf9f5"
							strokeWidth={2.5}
						/>
					</View>
					<Text className="font-display text-2xl tracking-tight text-foreground uppercase">
						CONFIGURATION REQUIRED
					</Text>
					<Text className="mt-3 text-center font-mono text-xs leading-relaxed text-foreground">
						{supabaseConfigError}
					</Text>
					<View className="mt-4 w-full border-t border-border/20 pt-4">
						<Text className="text-center font-mono text-[11px] leading-relaxed text-muted-foreground">
							Please add the required variables to your .env file
							and restart the development server.
						</Text>
					</View>
				</NeoCard>
			</View>
		);
	}

	return (
		<GestureHandlerRootView style={{ flex: 1, backgroundColor: "#faf9f5" }}>
			<StatusBar style="dark" />
			<PanelUIProvider>
				<SafeAreaProvider>
					<QueryClientProvider client={queryClient}>
						<Stack
							screenOptions={{
								headerShown: false,
								contentStyle: { backgroundColor: "#faf9f5" },
							}}>
							<Stack.Screen
								name="(tabs)"
								options={{ headerShown: false }}
							/>
							<Stack.Screen
								name="post/[id]"
								options={{ headerShown: false }}
							/>
							<Stack.Screen
								name="u/[username]"
								options={{ headerShown: false }}
							/>
							<Stack.Screen
								name="legal/terms"
								options={{ headerShown: false }}
							/>
							<Stack.Screen
								name="legal/privacy"
								options={{ headerShown: false }}
							/>
							<Stack.Screen
								name="messages/[id]"
								options={{ headerShown: false }}
							/>
							<Stack.Screen
								name="messages/new"
								options={{
									presentation: "modal",
									headerShown: false,
								}}
							/>
						</Stack>
						<MobileAlertSheet
							open={Boolean(sessionExpiredMessage)}
							onOpenChange={(open) => {
								if (!open) {
									dismissSessionExpired();
								}
							}}
							title="Session Expired"
							description={sessionExpiredMessage ?? undefined}
							type="warning"
							actions={[
								{
									label: "SIGN IN",
									variant: "primary",
									onPress: () => {
										dismissSessionExpired();
										router.replace("/(auth)/sign-in");
									},
								},
								{
									label: "Dismiss",
									variant: "outline",
									onPress: () => {
										dismissSessionExpired();
									},
								},
							]}
						/>
					</QueryClientProvider>
				</SafeAreaProvider>
			</PanelUIProvider>
		</GestureHandlerRootView>
	);
}
