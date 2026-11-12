import { useAuthStore } from "@auth/store";
import { Anton_400Regular } from "@expo-google-fonts/anton";
import {
	CourierPrime_400Regular,
	CourierPrime_700Bold,
} from "@expo-google-fonts/courier-prime";
import {
	DMSans_400Regular,
	DMSans_500Medium,
	DMSans_600SemiBold,
	DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import {
	IBMPlexMono_400Regular,
	IBMPlexMono_500Medium,
	IBMPlexMono_600SemiBold,
	IBMPlexMono_700Bold,
} from "@expo-google-fonts/ibm-plex-mono";
import {
	SpaceGrotesk_500Medium,
	SpaceGrotesk_600SemiBold,
	SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { supabase } from "@lib/supabase";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PanelUIProvider } from "panelui-native";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Uniwind } from "uniwind";

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
	const [fontsLoaded] = useFonts({
		Anton_400Regular,
		CourierPrime_400Regular,
		CourierPrime_700Bold,
		DMSans_400Regular,
		DMSans_500Medium,
		DMSans_600SemiBold,
		DMSans_700Bold,
		IBMPlexMono_400Regular,
		IBMPlexMono_500Medium,
		IBMPlexMono_600SemiBold,
		IBMPlexMono_700Bold,
		SpaceGrotesk_500Medium,
		SpaceGrotesk_600SemiBold,
		SpaceGrotesk_700Bold,
	});

	useEffect(() => {
		try {
			Uniwind.setTheme("light");
		} catch (error) {
			console.error("Failed to set theme to light", error);
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
						</Stack>
					</QueryClientProvider>
				</SafeAreaProvider>
			</PanelUIProvider>
		</GestureHandlerRootView>
	);
}
