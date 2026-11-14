import { useAuthStore } from "@auth/store";
import { Check, Send, Share2, Users } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	Text,
	View,
} from "react-native";

import { MobileSheet, NeoButton } from "@/components/ui";
import type { Post } from "@/features/posts/types";
import { sharePost } from "@/features/posts/utils/share";

import { fetchConversations, sendMessage } from "../api";
import { useMessagesStore } from "../store";
import {
	buildSharedPostMessagePayload,
	formatConversationTitle,
} from "../utils";

interface SharePostModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	post: Post;
}

export function SharePostModal({
	open,
	onOpenChange,
	post,
}: SharePostModalProps) {
	const userId = useAuthStore((s) => s.user?.id);
	const conversations = useMessagesStore((s) => s.conversations);
	const setConversations = useMessagesStore((s) => s.setConversations);

	const [isLoading, setIsLoading] = useState(false);
	const [sendingId, setSendingId] = useState<string | null>(null);
	const [sentIds, setSentIds] = useState<Record<string, boolean>>({});

	useEffect(() => {
		if (!open || !userId || conversations.length > 0) return;
		let cancelled = false;
		const load = async () => {
			setIsLoading(true);
			try {
				const data = await fetchConversations(userId);
				if (!cancelled) {
					setConversations(data);
				}
			} finally {
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		};
		void load();
		return () => {
			cancelled = true;
		};
	}, [open, userId, conversations.length, setConversations]);

	const handleSendToChat = async (conversationId: string) => {
		if (!userId || sendingId || sentIds[conversationId]) return;
		setSendingId(conversationId);
		try {
			await sendMessage(
				conversationId,
				userId,
				buildSharedPostMessagePayload(post.id),
			);
			setSentIds((prev) => ({ ...prev, [conversationId]: true }));
		} finally {
			setSendingId(null);
		}
	};

	const handleExternalShare = async () => {
		onOpenChange(false);
		await sharePost(post);
	};

	return (
		<MobileSheet
			open={open}
			onOpenChange={onOpenChange}
			title="SHARE TRANSMISSION">
			<View className="gap-3">
				<Text
					numberOfLines={1}
					className="font-display text-sm text-foreground uppercase">
					{post.title}
				</Text>
				<Text className="font-mono text-2xs tracking-wider text-muted-foreground uppercase">
					SEND TO DIRECT OR GROUP CHAT
				</Text>

				{isLoading ? (
					<View className="py-6">
						<ActivityIndicator size="small" color="#000000" />
					</View>
				) : conversations.length === 0 ? (
					<View className="border-2 border-border bg-surface p-4">
						<Text className="text-center font-mono text-xs text-muted-foreground">
							No active chats yet. Start a conversation in the
							Messages tab.
						</Text>
					</View>
				) : (
					<FlatList
						data={conversations.slice(0, 6)}
						keyExtractor={(item) => item.id}
						style={{ maxHeight: 240 }}
						renderItem={({ item }) => {
							const title = formatConversationTitle(item);
							const isSent = Boolean(sentIds[item.id]);
							const isSending = sendingId === item.id;
							return (
								<View className="mb-2 flex-row items-center justify-between border-2 border-border bg-card px-3 py-2.5 shadow-neo-xs">
									<View className="mr-3 flex-1 flex-row items-center gap-2">
										{item.type === "group" ? (
											<Users
												size={14}
												color="#000000"
												strokeWidth={2.5}
											/>
										) : null}
										<Text
											numberOfLines={1}
											className="flex-1 font-display text-sm text-foreground uppercase">
											{title}
										</Text>
									</View>

									<Pressable
										disabled={isSent || isSending}
										onPress={() =>
											handleSendToChat(item.id)
										}
										className={`flex-row items-center gap-1 border-2 border-border px-2.5 py-1 ${
											isSent
												? "bg-neo-green"
												: "bg-secondary active:translate-x-px"
										}`}>
										{isSending ? (
											<ActivityIndicator
												size="small"
												color="#000000"
											/>
										) : isSent ? (
											<>
												<Check
													size={12}
													color="#000000"
													strokeWidth={3}
												/>
												<Text className="font-mono text-2xs text-foreground uppercase">
													SENT
												</Text>
											</>
										) : (
											<>
												<Send
													size={11}
													color="#000000"
													strokeWidth={2.5}
												/>
												<Text className="font-mono text-2xs text-foreground uppercase">
													SEND
												</Text>
											</>
										)}
									</Pressable>
								</View>
							);
						}}
					/>
				)}

				<View className="border-t-2 border-border pt-3">
					<NeoButton
						variant="outline"
						size="md"
						startContent={
							<Share2
								size={15}
								color="#000000"
								strokeWidth={2.5}
							/>
						}
						onPress={handleExternalShare}>
						SHARE EXTERNALLY
					</NeoButton>
				</View>
			</View>
		</MobileSheet>
	);
}
