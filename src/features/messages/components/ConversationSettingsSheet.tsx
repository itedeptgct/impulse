import { searchUsers } from "@auth/api";
import { useAuthStore } from "@auth/store";
import type { Profile } from "@auth/types";
import { Image as ExpoImage } from "expo-image";
import {
	ArrowLeft,
	Check,
	ChevronRight,
	Pin,
	Search,
	Trash2,
	UserMinus,
	UserPen,
	UserPlus,
	Users,
} from "lucide-react-native";
import { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";

import { MobileSheet, NeoButton } from "@/components/ui";

import {
	addGroupMember,
	removeGroupMember,
	sendSystemMessage,
	setParticipantNickname,
	updateConversationTitle,
} from "../api";
import { useMessagesStore } from "../store";
import type {
	ConversationParticipant,
	DirectConversationSummary,
	Message,
} from "../types";
import { formatConversationTitle } from "../utils";

interface ConversationSettingsSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	conversation: DirectConversationSummary | null;
	pinnedMessages?: Message[];
	onUnpinMessage?: (messageId: string) => void;
	onJumpToMessage?: (messageId: string) => void;
	onBroadcastMessage?: (message: Message) => void;
}

export function ConversationSettingsSheet({
	open,
	onOpenChange,
	conversation,
	pinnedMessages = [],
	onUnpinMessage,
	onJumpToMessage,
	onBroadcastMessage,
}: ConversationSettingsSheetProps) {
	const currentUserId = useAuthStore((s) => s.user?.id);
	const currentProfile = useAuthStore((s) => s.profile);

	const updateParticipantNicknameLocally = useMessagesStore(
		(s) => s.updateParticipantNicknameLocally,
	);
	const updateConversationTitleLocally = useMessagesStore(
		(s) => s.updateConversationTitleLocally,
	);
	const addParticipantLocally = useMessagesStore(
		(s) => s.addParticipantLocally,
	);
	const removeParticipantLocally = useMessagesStore(
		(s) => s.removeParticipantLocally,
	);
	const receiveRealtimeMessage = useMessagesStore(
		(s) => s.receiveRealtimeMessage,
	);

	const [groupTitleDraft, setGroupTitleDraft] = useState<string | null>(null);
	const [editingParticipant, setEditingParticipant] =
		useState<ConversationParticipant | null>(null);
	const [nicknameInput, setNicknameInput] = useState("");
	const [isAddingMember, setIsAddingMember] = useState(false);
	const [memberQuery, setMemberQuery] = useState("");
	const [searchResults, setSearchResults] = useState<Profile[]>([]);
	const [isSearchingUsers, setIsSearchingUsers] = useState(false);
	const [savingKey, setSavingKey] = useState<string | null>(null);

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) {
			setGroupTitleDraft(null);
			setEditingParticipant(null);
			setNicknameInput("");
			setIsAddingMember(false);
			setMemberQuery("");
			setSearchResults([]);
		}
		onOpenChange(nextOpen);
	};

	if (!conversation) return null;

	const isGroup = conversation.type === "group";
	const displayTitle = formatConversationTitle(conversation);
	const groupTitle = groupTitleDraft ?? conversation.title ?? "";
	const actorName =
		currentProfile?.display_name || currentProfile?.username || "Someone";

	const announceSystemChange = async (text: string) => {
		if (!currentUserId) return;
		try {
			const msg = await sendSystemMessage(
				conversation.id,
				currentUserId,
				text,
			);
			receiveRealtimeMessage(msg, currentUserId);
			onBroadcastMessage?.(msg);
		} catch {
			// System announcement failure should not block the settings update
		}
	};

	const handleSaveGroupTitle = async () => {
		if (savingKey) return;
		setSavingKey("title");
		try {
			const normalized = groupTitle.trim() || null;
			await updateConversationTitle(conversation.id, normalized);
			updateConversationTitleLocally(conversation.id, normalized);
			setGroupTitleDraft(null);
			await announceSystemChange(
				normalized
					? `${actorName} named the group ${normalized}.`
					: `${actorName} cleared the group name.`,
			);
		} catch (err: unknown) {
			const e = err as Error;
			Alert.alert("Error", e?.message || "Failed to update group title.");
		} finally {
			setSavingKey(null);
		}
	};

	const handleSelectParticipant = (participant: ConversationParticipant) => {
		setEditingParticipant(participant);
		setNicknameInput(participant.nickname ?? "");
	};

	const handleSaveNickname = async (nextValue?: string) => {
		if (!editingParticipant || savingKey) return;
		const targetUserId = editingParticipant.user_id;
		const targetName =
			editingParticipant.profile?.display_name ||
			editingParticipant.profile?.username ||
			"User";
		setSavingKey(targetUserId);
		try {
			const raw = nextValue !== undefined ? nextValue : nicknameInput;
			const normalized = raw.trim() || null;
			await setParticipantNickname(
				conversation.id,
				targetUserId,
				normalized,
			);
			updateParticipantNicknameLocally(
				conversation.id,
				targetUserId,
				normalized,
			);
			setEditingParticipant(null);
			setNicknameInput("");
			await announceSystemChange(
				normalized
					? `${actorName} set ${targetName}'s nickname to ${normalized}.`
					: `${actorName} cleared ${targetName}'s nickname.`,
			);
		} catch (err: unknown) {
			const e = err as Error;
			Alert.alert("Error", e?.message || "Failed to update nickname.");
		} finally {
			setSavingKey(null);
		}
	};

	const handleSearchUsers = async (term: string) => {
		setMemberQuery(term);
		const trimmed = term.trim();
		if (!trimmed) {
			setSearchResults([]);
			return;
		}
		setIsSearchingUsers(true);
		try {
			const users = await searchUsers(trimmed);
			const existingIds = new Set(
				conversation.participants.map((p) => p.user_id),
			);
			setSearchResults(users.filter((u) => !existingIds.has(u.id)));
		} catch (err: unknown) {
			const e = err as Error;
			Alert.alert("Error", e?.message || "Failed to search users.");
		} finally {
			setIsSearchingUsers(false);
		}
	};

	const handleAddMember = async (target: Profile) => {
		if (savingKey) return;
		setSavingKey(`add-${target.id}`);
		try {
			const participant = await addGroupMember(
				conversation.id,
				target.id,
			);
			addParticipantLocally(conversation.id, participant);
			setSearchResults((prev) => prev.filter((u) => u.id !== target.id));
			const targetName = target.display_name || target.username || "User";
			await announceSystemChange(
				`${actorName} added ${targetName} to the group.`,
			);
		} catch (err: unknown) {
			const e = err as Error;
			Alert.alert("Error", e?.message || "Failed to add member.");
		} finally {
			setSavingKey(null);
		}
	};

	const handleRemoveMember = async (participant: ConversationParticipant) => {
		if (savingKey) return;
		const targetName =
			participant.profile?.display_name ||
			participant.profile?.username ||
			"User";
		setSavingKey(`remove-${participant.user_id}`);
		try {
			await removeGroupMember(conversation.id, participant.user_id);
			removeParticipantLocally(conversation.id, participant.user_id);
			await announceSystemChange(
				`${actorName} removed ${targetName} from the group.`,
			);
		} catch (err: unknown) {
			const e = err as Error;
			Alert.alert("Error", e?.message || "Failed to remove member.");
		} finally {
			setSavingKey(null);
		}
	};

	const editingProfileName =
		editingParticipant?.profile?.display_name ||
		editingParticipant?.profile?.username ||
		"User";

	const sheetTitle = editingParticipant
		? "SET NICKNAME"
		: isAddingMember
			? "ADD MEMBERS"
			: "CONVERSATION SETTINGS";
	const sheetSubtitle = editingParticipant
		? editingProfileName
		: displayTitle;

	return (
		<MobileSheet
			open={open}
			onOpenChange={handleOpenChange}
			title={sheetTitle}
			subtitle={sheetSubtitle}
			size="half">
			{editingParticipant ? (
				<View className="pb-4">
					<Pressable
						accessibilityRole="button"
						onPress={() => {
							setEditingParticipant(null);
							setNicknameInput("");
						}}
						className="mb-4 flex-row items-center gap-1.5 self-start border border-border bg-secondary px-2.5 py-1">
						<ArrowLeft
							size={14}
							color="#000000"
							strokeWidth={2.5}
						/>
						<Text className="font-mono text-xs text-foreground uppercase">
							Back to Nicknames
						</Text>
					</Pressable>

					<View className="mb-4 flex-row items-center gap-3 border-2 border-border bg-card p-3 shadow-neo-sm">
						<View className="size-11 items-center justify-center overflow-hidden border-2 border-border bg-secondary">
							{editingParticipant.profile?.avatar_url?.startsWith(
								"http",
							) ? (
								<ExpoImage
									source={{
										uri: editingParticipant.profile
											.avatar_url,
									}}
									style={{ width: "100%", height: "100%" }}
									contentFit="cover"
								/>
							) : (
								<Text className="font-bold text-xs text-foreground">
									{editingProfileName
										.slice(0, 2)
										.toUpperCase()}
								</Text>
							)}
						</View>
						<View className="min-w-0 flex-1">
							<Text
								numberOfLines={1}
								className="font-display text-sm text-foreground uppercase">
								{editingProfileName}
							</Text>
							<Text className="font-mono text-2xs text-muted-foreground">
								{editingParticipant.nickname
									? `Current: ${editingParticipant.nickname}`
									: "No nickname set"}
							</Text>
						</View>
					</View>

					<TextInput
						value={nicknameInput}
						onChangeText={setNicknameInput}
						placeholder={`Nickname for ${editingProfileName}`}
						placeholderTextColor="rgba(0, 0, 0, 0.4)"
						maxLength={50}
						autoFocus
						className="mb-4 border-2 border-border bg-surface px-3 py-2.5 font-mono text-sm text-foreground"
					/>

					<View className="flex-row items-center justify-end gap-2">
						{editingParticipant.nickname ? (
							<NeoButton
								variant="outline"
								size="sm"
								loading={
									savingKey === editingParticipant.user_id
								}
								onPress={() => void handleSaveNickname("")}>
								<Text className="font-display text-xs text-destructive uppercase">
									Remove
								</Text>
							</NeoButton>
						) : null}
						<NeoButton
							variant="outline"
							size="sm"
							onPress={() => {
								setEditingParticipant(null);
								setNicknameInput("");
							}}>
							<Text className="font-display text-xs text-foreground uppercase">
								Cancel
							</Text>
						</NeoButton>
						<NeoButton
							variant="primary"
							size="sm"
							loading={savingKey === editingParticipant.user_id}
							onPress={() => void handleSaveNickname()}>
							<Text className="font-display text-xs text-background uppercase">
								Save
							</Text>
						</NeoButton>
					</View>
				</View>
			) : isAddingMember ? (
				<View className="pb-4">
					<Pressable
						accessibilityRole="button"
						onPress={() => {
							setIsAddingMember(false);
							setMemberQuery("");
							setSearchResults([]);
						}}
						className="mb-3 flex-row items-center gap-1.5 self-start border border-border bg-secondary px-2.5 py-1">
						<ArrowLeft
							size={14}
							color="#000000"
							strokeWidth={2.5}
						/>
						<Text className="font-mono text-xs text-foreground uppercase">
							Back to Settings
						</Text>
					</Pressable>

					<View className="mb-3 flex-row items-center gap-2 border-2 border-border bg-surface px-3 py-2">
						<Search size={14} color="#000000" strokeWidth={2.5} />
						<TextInput
							value={memberQuery}
							onChangeText={(text) =>
								void handleSearchUsers(text)
							}
							placeholder="Search operatives to add..."
							placeholderTextColor="rgba(0, 0, 0, 0.4)"
							autoFocus
							autoCapitalize="none"
							autoCorrect={false}
							className="flex-1 font-mono text-xs text-foreground"
						/>
					</View>

					<ScrollView
						className="max-h-72"
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled">
						{isSearchingUsers ? (
							<View className="py-6">
								<ActivityIndicator
									size="small"
									color="#000000"
								/>
							</View>
						) : searchResults.length === 0 ? (
							<Text className="py-6 text-center font-mono text-xs text-muted-foreground">
								{memberQuery.trim()
									? "No matching users found."
									: "Search by username or display name."}
							</Text>
						) : (
							<View className="gap-2">
								{searchResults.map((user) => {
									const name =
										user.display_name ||
										user.username ||
										"User";
									const isAdding =
										savingKey === `add-${user.id}`;
									return (
										<View
											key={user.id}
											className="flex-row items-center justify-between gap-3 border-2 border-border bg-card px-3 py-2 shadow-neo-sm">
											<View className="min-w-0 flex-1 flex-row items-center gap-2.5">
												<View className="size-9 items-center justify-center overflow-hidden border-2 border-border bg-secondary">
													{user.avatar_url?.startsWith(
														"http",
													) ? (
														<ExpoImage
															source={{
																uri: user.avatar_url,
															}}
															style={{
																width: "100%",
																height: "100%",
															}}
															contentFit="cover"
														/>
													) : (
														<Text className="font-bold text-xs text-foreground">
															{name
																.slice(0, 2)
																.toUpperCase()}
														</Text>
													)}
												</View>
												<View className="min-w-0 flex-1">
													<Text
														numberOfLines={1}
														className="font-display text-xs text-foreground uppercase">
														{name}
													</Text>
													<Text
														numberOfLines={1}
														className="font-mono text-2xs text-muted-foreground">
														@{user.username}
													</Text>
												</View>
											</View>
											<NeoButton
												variant="primary"
												size="sm"
												loading={isAdding}
												onPress={() =>
													void handleAddMember(user)
												}>
												<Text className="font-display text-xs text-foreground uppercase">
													Add
												</Text>
											</NeoButton>
										</View>
									);
								})}
							</View>
						)}
					</ScrollView>
				</View>
			) : (
				<ScrollView
					className="max-h-96"
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled">
					{isGroup ? (
						<View className="mb-5">
							<Text className="mb-1.5 font-mono text-xs text-muted-foreground uppercase">
								Group Name
							</Text>
							<View className="flex-row items-center gap-2">
								<TextInput
									value={groupTitle}
									onChangeText={setGroupTitleDraft}
									placeholder="Enter group name..."
									placeholderTextColor="rgba(0, 0, 0, 0.4)"
									maxLength={80}
									className="flex-1 border-2 border-border bg-surface px-3 py-2 font-mono text-sm text-foreground"
								/>
								<NeoButton
									variant="primary"
									size="sm"
									loading={savingKey === "title"}
									onPress={() => void handleSaveGroupTitle()}>
									<Check
										size={16}
										color="#fff"
										strokeWidth={2.5}
									/>
								</NeoButton>
							</View>
						</View>
					) : null}

					<View className="mb-5">
						<View className="mb-2 flex-row items-center gap-1.5">
							<UserPen
								size={13}
								color="#000000"
								strokeWidth={2.5}
							/>
							<Text className="font-mono text-xs text-muted-foreground uppercase">
								Nicknames
							</Text>
						</View>
						<View className="gap-2">
							{conversation.participants.map((participant) => {
								const profileName =
									participant.profile?.display_name ||
									participant.profile?.username ||
									"User";
								const hasNickname = Boolean(
									participant.nickname?.trim(),
								);

								return (
									<Pressable
										key={participant.user_id}
										accessibilityRole="button"
										accessibilityLabel={`Set nickname for ${profileName}`}
										onPress={() =>
											handleSelectParticipant(participant)
										}
										className="flex-row items-center gap-3 border-2 border-border bg-card px-3 py-2.5 shadow-neo-sm active:bg-secondary">
										<View className="size-10 items-center justify-center overflow-hidden border-2 border-border bg-secondary">
											{participant.profile?.avatar_url?.startsWith(
												"http",
											) ? (
												<ExpoImage
													source={{
														uri: participant.profile
															.avatar_url,
													}}
													style={{
														width: "100%",
														height: "100%",
													}}
													contentFit="cover"
												/>
											) : (
												<Text className="font-bold text-xs text-foreground">
													{profileName
														.slice(0, 2)
														.toUpperCase()}
												</Text>
											)}
										</View>

										<View className="min-w-0 flex-1">
											<Text
												numberOfLines={1}
												className="font-display text-sm text-foreground uppercase">
												{hasNickname
													? participant.nickname
													: profileName}
											</Text>
											<Text
												numberOfLines={1}
												className="font-mono text-2xs text-muted-foreground">
												{hasNickname
													? profileName
													: "Set nickname"}
											</Text>
										</View>

										<ChevronRight
											size={16}
											color="#000000"
											strokeWidth={2.5}
										/>
									</Pressable>
								);
							})}
						</View>
					</View>

					{isGroup ? (
						<View className="mb-5">
							<View className="mb-2 flex-row items-center justify-between">
								<View className="flex-row items-center gap-1.5">
									<Users
										size={13}
										color="#000000"
										strokeWidth={2.5}
									/>
									<Text className="font-mono text-xs text-muted-foreground uppercase">
										Members (
										{conversation.participants.length})
									</Text>
								</View>
								<Pressable
									accessibilityRole="button"
									onPress={() => setIsAddingMember(true)}
									className="flex-row items-center gap-1 border border-border bg-neo-green px-2.5 py-1">
									<UserPlus
										size={12}
										color="#000000"
										strokeWidth={2.5}
									/>
									<Text className="font-mono text-2xs text-foreground uppercase">
										Add
									</Text>
								</Pressable>
							</View>
							<View className="gap-2">
								{conversation.participants.map(
									(participant) => {
										const profileName =
											participant.profile?.display_name ||
											participant.profile?.username ||
											"User";
										const isSelf =
											participant.user_id ===
											currentUserId;
										const isRemoving =
											savingKey ===
											`remove-${participant.user_id}`;

										return (
											<View
												key={`member-${participant.user_id}`}
												className="flex-row items-center justify-between gap-2 border-2 border-border bg-card px-3 py-2 shadow-neo-sm">
												<View className="min-w-0 flex-1">
													<Text
														numberOfLines={1}
														className="font-display text-xs text-foreground uppercase">
														{profileName}
														{isSelf ? " (You)" : ""}
													</Text>
													{participant.profile
														?.username ? (
														<Text
															numberOfLines={1}
															className="font-mono text-2xs text-muted-foreground">
															@
															{
																participant
																	.profile
																	.username
															}
														</Text>
													) : null}
												</View>
												{!isSelf ? (
													<Pressable
														accessibilityRole="button"
														accessibilityLabel={`Remove ${profileName}`}
														disabled={isRemoving}
														onPress={() =>
															void handleRemoveMember(
																participant,
															)
														}
														className="flex-row items-center gap-1 border border-border bg-secondary px-2 py-1">
														<UserMinus
															size={12}
															color="#ff2a00"
														/>
														<Text className="font-mono text-2xs text-destructive uppercase">
															Remove
														</Text>
													</Pressable>
												) : null}
											</View>
										);
									},
								)}
							</View>
						</View>
					) : null}

					{pinnedMessages.length > 0 ? (
						<View className="mb-4">
							<View className="mb-2 flex-row items-center gap-1.5">
								<Pin
									size={13}
									color="#000000"
									strokeWidth={2.5}
								/>
								<Text className="font-mono text-xs text-muted-foreground uppercase">
									Pinned Messages ({pinnedMessages.length})
								</Text>
							</View>
							<View className="gap-2">
								{pinnedMessages.map((msg) => (
									<View
										key={msg.id}
										className="flex-row items-center justify-between gap-2 border-2 border-border bg-card p-2.5 shadow-neo-sm">
										<Pressable
											className="flex-1"
											onPress={() => {
												onJumpToMessage?.(msg.id);
												handleOpenChange(false);
											}}>
											<Text
												numberOfLines={2}
												className="font-mono text-xs text-foreground">
												{msg.content ||
													(msg.media_urls.length > 0
														? "Media attachment"
														: "Shared post")}
											</Text>
										</Pressable>
										{onUnpinMessage ? (
											<Pressable
												accessibilityRole="button"
												accessibilityLabel="Unpin message"
												onPress={() =>
													onUnpinMessage(msg.id)
												}
												className="border border-border bg-secondary p-1.5">
												<Trash2
													size={13}
													color="#ff2a00"
												/>
											</Pressable>
										) : null}
									</View>
								))}
							</View>
						</View>
					) : null}
				</ScrollView>
			)}
		</MobileSheet>
	);
}
