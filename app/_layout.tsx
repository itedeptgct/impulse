import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { PanelUIProvider } from "panelui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import "@theme/global.css";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60,
			retry: 2,
		},
	},
});

export default function RootLayout() {
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
