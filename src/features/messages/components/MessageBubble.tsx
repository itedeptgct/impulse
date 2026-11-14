import { Image as ExpoImage } from "expo-image";
import { AlertCircle, Pin, RefreshCw } from "lucide-react-native";
import { memo } from "react";
import { Pressable, Text, View } from "react-native";

import type {
	ConversationParticipant,
	ConversationType,
	OptimisticMessage,
} from "../types";
import {
	formatMessageTime,
	getParticipantDisplayName,
	isMediaOnlyMessage,
	isMessageSeenByOthers,
	shouldShowSenderHeader,
} from "../utils";
import { SharedPostEmbedCard } from "./SharedPostEmbedCard";

interface MessageBubbleProps {
	message: OptimisticMessage;
	isOwnMessage: boolean;
	conversationType: ConversationType;
	participants?: ConversationParticipant[];
	previousSenderId?: string | null;
	onRetry?: (message: OptimisticMessage) => void;
	onLongPress?: (message: OptimisticMessage) => void;
	onMediaPress?: (urls: string[], index: number) => void;
}

export const MessageBubble = memo(function MessageBubble({
	message,
	isOwnMessage,
	conversationType,
	participants,
	previousSenderId,
	onRetry,
	onLongPress,
	onMediaPress,
}: MessageBubbleProps) {
	const showSender = shouldShowSenderHeader(
		conversationType,
		isOwnMessage,
		message.sender_id,
		previousSenderId,
	);
	const fallbackSenderName =
		message.sender?.display_name || message.sender?.username || "User";
	const senderName = participants
		? getParticipantDisplayName(
				participants,
				message.sender_id,
				message.sender,
			)
		: fallbackSenderName;
	const timeStr = formatMessageTime(message.created_at);
	const isUnsent = Boolean(message.unsent_at);
	const isSystem = message.message_type === "system" && !isUnsent;
	const mediaOnly = isMediaOnlyMessage(message);

	if (isSystem) {
		return (
			<View className="my-2 items-center px-6">
				<Text className="text-center font-mono text-2xs text-muted-foreground">
					{message.content}
				</Text>
			</View>
		);
	}

	const isSeen =
		isOwnMessage &&
		message.status !== "sending" &&
		message.status !== "failed" &&
		isMessageSeenByOthers(
			message.created_at,
			message.sender_id,
			participants,
		);

	const statusLabel =
		message.status === "sending"
			? "Sending..."
			: message.status === "failed"
				? "Failed"
				: isSeen
					? "Seen"
					: "Sent";

	const handleLongPress = () => {
		if (!isUnsent && message.status !== "sending") {
			onLongPress?.(message);
		}
	};

	return (
		<View
			className={`mb-2.5 max-w-[84%] ${
				isOwnMessage ? "self-end" : "self-start"
			}`}>
			{showSender ? (
				<Text className="mb-1 ml-1 font-mono text-2xs text-muted-foreground uppercase">
					{senderName}
				</Text>
			) : null}

			{isUnsent ? (
				<View className="border border-dashed border-border/50 bg-secondary/50 px-3 py-2">
					<Text className="font-mono text-xs text-muted-foreground italic">
						{senderName} unsent a message
					</Text>
				</View>
			) : mediaOnly ? (
				<View className="gap-1.5">
					{message.media_urls.map((url, idx) => (
						<Pressable
							key={`${message.id}-media-${idx}`}
							accessibilityRole="button"
							accessibilityLabel="View media fullscreen"
							onPress={() =>
								onMediaPress?.(message.media_urls, idx)
							}
							onLongPress={handleLongPress}
							delayLongPress={300}>
							<ExpoImage
								source={{ uri: url }}
								style={{ width: 220, height: 165 }}
								contentFit="cover"
								className="border border-border bg-secondary"
							/>
						</Pressable>
					))}
				</View>
			) : (
				<Pressable
					onLongPress={handleLongPress}
					delayLongPress={300}
					className={`border-2 border-border px-3 py-2 shadow-neo-xs ${
						isOwnMessage ? "bg-neo-green" : "bg-card"
					}`}>
					{message.media_urls && message.media_urls.length > 0 ? (
						<View className="mb-1.5 gap-1.5">
							{message.media_urls.map((url, idx) => (
								<Pressable
									key={`${message.id}-media-${idx}`}
									accessibilityRole="button"
									accessibilityLabel="View media fullscreen"
									onPress={() =>
										onMediaPress?.(message.media_urls, idx)
									}
									onLongPress={handleLongPress}
									delayLongPress={300}>
									<ExpoImage
										source={{ uri: url }}
										style={{ width: 220, height: 165 }}
										contentFit="cover"
										className="border border-border bg-secondary"
									/>
								</Pressable>
							))}
						</View>
					) : null}

					{message.content ? (
						<Text className="font-mono text-xs leading-relaxed text-foreground">
							{message.content}
						</Text>
					) : null}

					{message.shared_post_id ? (
						<SharedPostEmbedCard
							post={message.shared_post}
							sharedPostId={message.shared_post_id}
						/>
					) : null}
				</Pressable>
			)}

			<View
				className={`mt-1 flex-row items-center gap-1.5 ${
					isOwnMessage ? "justify-end" : "justify-start"
				}`}>
				{message.is_pinned && !isUnsent ? (
					<Pin size={10} color="#000000" strokeWidth={2.5} />
				) : null}
				<Text className="font-mono text-2xs text-muted-foreground">
					{timeStr}
					{message.edited_at && !isUnsent ? " · (edited)" : ""}
					{isOwnMessage ? ` · ${statusLabel}` : ""}
				</Text>

				{isOwnMessage && message.status === "failed" && onRetry ? (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Retry sending message"
						onPress={() => onRetry(message)}
						className="flex-row items-center gap-1 border border-destructive bg-destructive/10 px-1.5 py-0.5">
						<AlertCircle size={10} color="#ff2a00" />
						<Text className="font-mono text-2xs text-destructive uppercase">
							Retry
						</Text>
						<RefreshCw size={10} color="#ff2a00" />
					</Pressable>
				) : null}
			</View>
		</View>
	);
});
