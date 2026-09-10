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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { PanelUIProvider } from "panelui-native";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Uniwind } from "uniwind";

import "@theme/global.css";

// Set Moon Dark as default theme for PanelUI
try {
	Uniwind.setTheme("moon-dark");
} catch {
	// Fallback if themes are initializing
}

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60,
			retry: 2,
		},
	},
});

export default function RootLayout() {
	const [fontsLoaded] = useFonts({
		DMSans_400Regular,
		DMSans_500Medium,
		DMSans_600SemiBold,
		DMSans_700Bold,
		IBMPlexMono_400Regular,
		IBMPlexMono_500Medium,
		IBMPlexMono_600SemiBold,
		IBMPlexMono_700Bold,
	});

	useEffect(() => {
		try {
			Uniwind.setTheme("moon-dark");
		} catch {
			// handled
		}
	}, []);

	if (!fontsLoaded) {
		return (
			<View className="flex-1 items-center justify-center bg-[#010102]">
				<ActivityIndicator color="#5e6ad2" />
			</View>
		);
	}

	return (
		<GestureHandlerRootView>
			<PanelUIProvider>
				<SafeAreaProvider>
					<QueryClientProvider client={queryClient}>
						<Stack screenOptions={{ headerShown: false }} />
					</QueryClientProvider>
				</SafeAreaProvider>
			</PanelUIProvider>
		</GestureHandlerRootView>
	);
}
