export interface PushNotificationData {
	type?: string;
	conversationId?: string;
}

export function resolveNotificationRoute(
	data: PushNotificationData | Record<string, unknown> | undefined | null,
): string | null {
	if (!data || typeof data !== "object") return null;

	const payload = data as PushNotificationData;
	if (
		payload.type === "chat_message" &&
		typeof payload.conversationId === "string" &&
		payload.conversationId.trim().length > 0
	) {
		return `/messages/${payload.conversationId}`;
	}

	return null;
}
