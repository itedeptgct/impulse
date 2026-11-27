import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { AlertCircle, Pin, RefreshCw, Reply } from "lucide-react-native";
import { memo, useMemo } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

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
	currentUserId?: string;
	conversationType: ConversationType;
	participants?: ConversationParticipant[];
	previousSenderId?: string | null;
	replyToMessage?: OptimisticMessage | null;
	onRetry?: (message: OptimisticMessage) => void;
	onLongPress?: (message: OptimisticMessage) => void;
	onSwipeReply?: (message: OptimisticMessage) => void;
	onJumpToReply?: (messageId: string) => void;
	onToggleReaction?: (message: OptimisticMessage, emoji: string) => void;
	onMediaPress?: (urls: string[], index: number) => void;
}

interface MediaCollageProps {
	messageId: string;
	urls: string[];
	onMediaPress?: (urls: string[], index: number) => void;
	onLongPress: () => void;
}

function MediaCollage({
	messageId,
	urls,
	onMediaPress,
	onLongPress,
}: MediaCollageProps) {
	if (urls.length === 0) return null;

	const renderTile = (
		url: string,
		index: number,
		styleClass: string,
		extraCount = 0,
	) => (
		<Pressable
			key={`${messageId}-media-${index}`}
			accessibilityRole="button"
			accessibilityLabel={`View media ${index + 1} of ${urls.length} fullscreen`}
			onPress={() => onMediaPress?.(urls, index)}
			onLongPress={onLongPress}
			delayLongPress={300}
			className={`relative overflow-hidden border border-border bg-secondary ${styleClass}`}>
			<ExpoImage
				source={{ uri: url }}
				style={{ width: "100%", height: "100%" }}
				contentFit="cover"
			/>
			{extraCount > 0 ? (
				<View className="absolute inset-0 items-center justify-center bg-black/60">
					<Text className="font-display text-lg text-white">
						+{extraCount}
					</Text>
				</View>
			) : null}
		</Pressable>
	);

	if (urls.length === 1) {
		return renderTile(urls[0], 0, "h-[165px] w-[220px]");
	}

	if (urls.length === 2) {
		return (
			<View className="w-[224px] flex-row gap-1">
				{renderTile(urls[0], 0, "h-32 flex-1")}
				{renderTile(urls[1], 1, "h-32 flex-1")}
			</View>
		);
	}

	if (urls.length === 3) {
		return (
			<View className="h-[172px] w-[224px] flex-row gap-1">
				{renderTile(urls[0], 0, "h-full flex-1")}
				<View className="flex-1 gap-1">
					{renderTile(urls[1], 1, "flex-1")}
					{renderTile(urls[2], 2, "flex-1")}
				</View>
			</View>
		);
	}

	const extraCount = urls.length > 4 ? urls.length - 4 : 0;

	return (
		<View className="w-[224px] gap-1">
			<View className="flex-row gap-1">
				{renderTile(urls[0], 0, "h-24 flex-1")}
				{renderTile(urls[1], 1, "h-24 flex-1")}
			</View>
			<View className="flex-row gap-1">
				{renderTile(urls[2], 2, "h-24 flex-1")}
				{renderTile(urls[3], 3, "h-24 flex-1", extraCount)}
			</View>
		</View>
	);
}

export const MessageBubble = memo(function MessageBubble({
	message,
	isOwnMessage,
	currentUserId,
	conversationType,
	participants,
	previousSenderId,
	replyToMessage,
	onRetry,
	onLongPress,
	onSwipeReply,
	onJumpToReply,
	onToggleReaction,
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
	const mediaOnly =
		isMediaOnlyMessage(message) && !replyToMessage && !message.reply_to;
	const mediaUrls =
		message.attachments && message.attachments.length > 0
			? message.attachments.map((a) => a.url)
			: (message.media_urls ?? []);

	const swipeGesture = useMemo(() => {
		return Gesture.Pan()
			.runOnJS(true)
			.activeOffsetX([18, 1000])
			.failOffsetY([-12, 12])
			.onEnd((e) => {
				if (
					!isUnsent &&
					!isSystem &&
					message.status !== "sending" &&
					e.translationX > 40 &&
					onSwipeReply
				) {
					if (Platform.OS !== "web") {
						void Haptics.impactAsync(
							Haptics.ImpactFeedbackStyle.Light,
						).catch(() => {});
					}
					onSwipeReply(message);
				}
			});
	}, [isUnsent, isSystem, message, onSwipeReply]);

	const reactionEntries = useMemo(() => {
		const map = message.reactions ?? {};
		return Object.entries(map).filter(([, users]) => users.length > 0);
	}, [message.reactions]);

	const replyPreview = useMemo(() => {
		if (replyToMessage) {
			const rSender = participants
				? getParticipantDisplayName(
						participants,
						replyToMessage.sender_id,
						replyToMessage.sender,
					)
				: replyToMessage.sender?.display_name ||
					replyToMessage.sender?.username ||
					"User";
			const rText = replyToMessage.unsent_at
				? "Message unsent"
				: replyToMessage.content?.trim() ||
					((replyToMessage.media_urls?.length ?? 0) > 0
						? "[Photo]"
						: "Message");
			return {
				id: replyToMessage.id,
				senderName: rSender,
				text: rText,
			};
		}
		if (message.reply_to) {
			return {
				id: message.reply_to.id,
				senderName: message.reply_to.sender_name || "User",
				text:
					message.reply_to.content?.trim() ||
					(message.reply_to.has_media ? "[Photo]" : "Message"),
			};
		}
		return null;
	}, [replyToMessage, message.reply_to, participants]);

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
		<GestureDetector gesture={swipeGesture}>
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
						<Text className="italic font-mono text-xs text-muted-foreground">
							{senderName} unsent a message
						</Text>
					</View>
				) : mediaOnly ? (
					<MediaCollage
						messageId={message.id}
						urls={mediaUrls}
						onMediaPress={onMediaPress}
						onLongPress={handleLongPress}
					/>
				) : (
					<Pressable
						onLongPress={handleLongPress}
						delayLongPress={300}
						className={`border-2 border-border px-3 py-2 shadow-neo-xs ${
							isOwnMessage ? "bg-neo-green" : "bg-card"
						}`}>
						{replyPreview ? (
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={`Jump to replied message from ${replyPreview.senderName}`}
								onPress={() => onJumpToReply?.(replyPreview.id)}
								className="mb-1.5 border-l-2 border-border bg-background/70 px-2 py-1">
								<View className="flex-row items-center gap-1">
									<Reply
										size={10}
										color="#000000"
										strokeWidth={2.5}
									/>
									<Text
										numberOfLines={1}
										className="font-bold text-3xs tracking-wider text-foreground uppercase">
										{replyPreview.senderName}
									</Text>
								</View>
								<Text
									numberOfLines={1}
									className="font-mono text-2xs text-muted-foreground">
									{replyPreview.text}
								</Text>
							</Pressable>
						) : null}

						{mediaUrls.length > 0 ? (
							<View className="mb-1.5">
								<MediaCollage
									messageId={message.id}
									urls={mediaUrls}
									onMediaPress={onMediaPress}
									onLongPress={handleLongPress}
								/>
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

				{!isUnsent && reactionEntries.length > 0 ? (
					<View
						className={`mt-1 flex-row flex-wrap gap-1 ${
							isOwnMessage ? "justify-end" : "justify-start"
						}`}>
						{reactionEntries.map(([emoji, users]) => {
							const reacted = Boolean(
								currentUserId && users.includes(currentUserId),
							);
							return (
								<Pressable
									key={emoji}
									accessibilityRole="button"
									accessibilityLabel={`Toggle ${emoji} reaction (${users.length})`}
									onPress={() =>
										onToggleReaction?.(message, emoji)
									}
									className={`flex-row items-center gap-1 border border-border px-1.5 py-0.5 ${
										reacted ? "bg-neo-yellow" : "bg-surface"
									}`}>
									<Text className="text-[11px]">{emoji}</Text>
									<Text className="font-bold text-3xs text-foreground tabular-nums">
										{users.length}
									</Text>
								</Pressable>
							);
						})}
					</View>
				) : null}

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
		</GestureDetector>
	);
});
