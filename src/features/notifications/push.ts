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
	if (Platform.OS === "web" || !isSupabaseConfigured || !userId) {
		return null;
	}

	try {
		if (Platform.OS === "android") {
			await Notifications.setNotificationChannelAsync("default", {
				name: "General Notifications",
				importance: Notifications.AndroidImportance.MAX,
				vibrationPattern: [0, 250, 250, 250],
				lightColor: "#00FF66",
			});
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
			const platform =
				Platform.OS === "ios"
					? "ios"
					: Platform.OS === "android"
						? "android"
						: "web";
			const deviceName = Constants.deviceName ?? null;

			const { error } = await supabase.from("user_push_tokens").upsert(
				{
					user_id: userId,
					expo_push_token: token,
					platform,
					device_name: deviceName,
					last_seen_at: new Date().toISOString(),
				},
				{ onConflict: "user_id,expo_push_token" },
			);
			if (error) {
				console.warn(
					"[push] Failed to save push token to user_push_tokens:",
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

export async function unregisterPushTokenAsync(userId: string): Promise<void> {
	if (Platform.OS === "web" || !isSupabaseConfigured || !userId) {
		return;
	}

	try {
		const { status } = await Notifications.getPermissionsAsync();
		if (status !== "granted") {
			return;
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
				.from("user_push_tokens")
				.delete()
				.eq("user_id", userId)
				.eq("expo_push_token", token);
			if (error) {
				console.warn(
					"[push] Failed to delete push token from user_push_tokens:",
					error.message,
				);
			}
		}
	} catch (err) {
		console.warn("[push] Push notification unregistration failed:", err);
	}
}

export function setupNotificationResponseListener(
	navigate: (
		path: string,
		response?: Notifications.NotificationResponse,
	) => void,
) {
	if (Platform.OS === "web") {
		return () => {};
	}

	const subscription = Notifications.addNotificationResponseReceivedListener(
		(response) => {
			const data = response.notification.request.content.data;
			const targetRoute = resolveNotificationRoute(data);
			if (targetRoute) {
				navigate(targetRoute, response);
			}
		},
	);

	return () => {
		subscription.remove();
	};
}
