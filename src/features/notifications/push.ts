import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

import { resolveNotificationRoute } from "./push-routing";

Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowBanner: true,
		shouldShowList: true,
		shouldPlaySound: true,
		shouldSetBadge: true,
	}),
});

export async function registerForPushNotificationsAsync(
	userId: string,
): Promise<string | null> {
	if (Platform.OS === "web" || !isSupabaseConfigured) {
		return null;
	}

	try {
		if (Platform.OS === "android") {
			await Notifications.setNotificationChannelAsync("messages", {
				name: "Direct & Group Messages",
				importance: Notifications.AndroidImportance.MAX,
				vibrationPattern: [0, 200, 150, 200],
				lightColor: "#00FF66",
			});
		}

		const { status: existingStatus } =
			await Notifications.getPermissionsAsync();
		let finalStatus = existingStatus;

		if (existingStatus !== "granted") {
			const { status } = await Notifications.requestPermissionsAsync();
			finalStatus = status;
		}

		if (finalStatus !== "granted") {
			console.warn(
				"[push] Notification permission not granted:",
				finalStatus,
			);
			return null;
		}

		const projectId =
			Constants.expoConfig?.extra?.eas?.projectId ??
			Constants.easConfig?.projectId;

		const tokenResponse = await Notifications.getExpoPushTokenAsync(
			projectId ? { projectId } : undefined,
		);
		const token = tokenResponse.data;

		if (token) {
			const { error } = await supabase
				.from("profiles")
				.update({ expo_push_token: token })
				.eq("id", userId);
			if (error) {
				console.warn(
					"[push] Failed to save expo_push_token:",
					error.message,
				);
			}
		}

		return token;
	} catch (err) {
		console.warn("[push] Push notification registration failed:", err);
		return null;
	}
}

export function setupNotificationResponseListener(
	navigate: (path: string) => void,
) {
	if (Platform.OS === "web") {
		return () => {};
	}

	const subscription = Notifications.addNotificationResponseReceivedListener(
		(response) => {
			const data = response.notification.request.content.data;
			const targetRoute = resolveNotificationRoute(data);
			if (targetRoute) {
				navigate(targetRoute);
			}
		},
	);

	return () => {
		subscription.remove();
	};
}
