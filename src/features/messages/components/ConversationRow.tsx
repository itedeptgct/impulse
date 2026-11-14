import { Image as ExpoImage } from "expo-image";
import { Pin, Users } from "lucide-react-native";
import { memo } from "react";
import { Pressable, Text, View } from "react-native";

import { GuildBadge } from "@/features/guilds/components/GuildBadge";
import { ActiveDot } from "@/features/presence";

import type { DirectConversationSummary } from "../types";
import {
	formatConversationSnippet,
	formatConversationTitle,
	formatShortTimestamp,
} from "../utils";

interface ConversationRowProps {
	conversation: DirectConversationSummary;
	currentUserId: string;
	onPress: (conversationId: string) => void;
	onLongPress?: (conversation: DirectConversationSummary) => void;
}

export const ConversationRow = memo(function ConversationRow({
	conversation,
	currentUserId,
	onPress,
	onLongPress,
}: ConversationRowProps) {
	const isGroup = conversation.type === "group";
	const title = formatConversationTitle(conversation);
	const snippet = formatConversationSnippet(
		conversation.last_message,
		currentUserId,
		conversation.type,
	);
	const timeLabel = formatShortTimestamp(
		conversation.last_message?.created_at ?? conversation.updated_at,
	);
	const hasUnread = conversation.unread_count > 0;
	const other = conversation.other_participant;
	const initials = title.slice(0, 2).toUpperCase();

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`Open conversation with ${title}`}
			onPress={() => onPress(conversation.id)}
			onLongPress={() => onLongPress?.(conversation)}
			delayLongPress={300}
			className={`flex-row items-center gap-3 border-b border-border/15 px-4 py-3 active:bg-secondary ${
				hasUnread
					? "border-l-4 border-l-destructive bg-card"
					: "bg-background"
			}`}>
			<View className="relative shrink-0">
				<View
					className={`size-12 items-center justify-center overflow-hidden border-2 border-border shadow-neo-sm ${
						isGroup ? "bg-neo-green" : "bg-secondary"
					}`}>
					{isGroup ? (
						<Users size={20} color="#000000" strokeWidth={2.5} />
					) : other?.avatar_url?.startsWith("http") ? (
						<ExpoImage
							source={{ uri: other.avatar_url }}
							style={{ width: "100%", height: "100%" }}
							contentFit="cover"
						/>
					) : (
						<Text className="font-bold text-sm text-foreground">
							{initials}
						</Text>
					)}
				</View>
				{!isGroup && other ? (
					<ActiveDot
						userId={other.id}
						targetShowActiveStatus={other.show_active_status}
						size="md"
						className="absolute -right-1 -bottom-1"
					/>
				) : null}
			</View>

			<View className="min-w-0 flex-1">
				<View className="flex-row items-center justify-between gap-2">
					<View className="min-w-0 flex-1 flex-row items-center gap-1.5">
						<Text
							numberOfLines={1}
							className="shrink font-display text-sm tracking-tight text-foreground uppercase">
							{title}
						</Text>
						{!isGroup && other?.guild ? (
							<GuildBadge guildId={other.guild} size="sm" />
						) : null}
						{isGroup ? (
							<View className="border border-border bg-secondary px-1 py-0.5">
								<Text className="font-mono text-2xs text-foreground">
									{conversation.participants.length}
								</Text>
							</View>
						) : null}
					</View>

					<View className="flex-row items-center gap-1.5">
						{conversation.is_pinned ? (
							<Pin size={12} color="#000000" strokeWidth={2.5} />
						) : null}
						<Text
							className={`font-mono text-2xs ${
								hasUnread
									? "text-destructive"
									: "text-muted-foreground"
							}`}>
							{timeLabel}
						</Text>
					</View>
				</View>

				<View className="mt-0.5 flex-row items-center justify-between gap-2">
					<Text
						numberOfLines={1}
						className={`flex-1 text-xs ${
							hasUnread
								? "font-bold text-foreground"
								: "font-mono text-muted-foreground"
						}`}>
						{snippet}
					</Text>

					{hasUnread ? (
						<View className="min-w-5 items-center justify-center rounded-full border border-border bg-destructive px-1.5 py-0.5">
							<Text className="font-mono text-2xs text-primary-foreground">
								{conversation.unread_count > 99
									? "99+"
									: conversation.unread_count}
							</Text>
						</View>
					) : null}
				</View>
			</View>
		</Pressable>
	);
});
