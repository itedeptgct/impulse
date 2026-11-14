import { searchUsers } from "@auth/api";
import { useAuthStore } from "@auth/store";
import type { Profile } from "@auth/types";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Check, Search, Users, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NeoButton } from "@/components/ui";
import { GuildBadge } from "@/features/guilds/components/GuildBadge";
import {
	createGroupConversation,
	getOrCreateDirectConversation,
} from "@/features/messages/api";
import { canCreateGroupChat } from "@/features/messages/utils";
import { ActiveDot } from "@/features/presence";

type ComposeMode = "direct" | "group";

export default function NewConversationModal() {
	const insets = useSafeAreaInsets();
	const currentUserId = useAuthStore((s) => s.user?.id);

	const [mode, setMode] = useState<ComposeMode>("direct");
	const [groupTitle, setGroupTitle] = useState("");
	const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<Profile[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const runSearch = useCallback(
		async (term: string) => {
			const trimmed = term.trim();
			if (!trimmed) {
				setResults([]);
				return;
			}
			setIsSearching(true);
			setError(null);
			try {
				const users = await searchUsers(trimmed);
				setResults(users.filter((u) => u.id !== currentUserId));
			} catch (err: unknown) {
				const e = err as Error;
				setError(e?.message || "Failed to search users.");
			} finally {
				setIsSearching(false);
			}
		},
		[currentUserId],
	);

	useEffect(() => {
		const timer = setTimeout(() => {
			void runSearch(query);
		}, 250);
		return () => clearTimeout(timer);
	}, [query, runSearch]);

	const handleSelectDirect = async (targetUserId: string) => {
		if (isCreating) return;
		setIsCreating(true);
		setError(null);
		try {
			const convId = await getOrCreateDirectConversation(targetUserId);
			router.replace(`/messages/${convId}` as never);
		} catch (err: unknown) {
			const e = err as Error;
			setError(e?.message || "Could not start conversation.");
			setIsCreating(false);
		}
	};

	const toggleGroupMember = (userId: string) => {
		setSelectedUserIds((prev) =>
			prev.includes(userId)
				? prev.filter((id) => id !== userId)
				: [...prev, userId],
		);
	};

	const handleCreateGroup = async () => {
		if (isCreating || !canCreateGroupChat(groupTitle, selectedUserIds)) {
			return;
		}
		setIsCreating(true);
		setError(null);
		try {
			const convId = await createGroupConversation(
				groupTitle.trim(),
				selectedUserIds,
			);
			router.replace(`/messages/${convId}` as never);
		} catch (err: unknown) {
			const e = err as Error;
			setError(e?.message || "Could not create group chat.");
			setIsCreating(false);
		}
	};

	const canSubmitGroup = canCreateGroupChat(groupTitle, selectedUserIds);

	return (
		<View className="flex-1 bg-background">
			<StatusBar style="dark" />

			<View
				style={{ paddingTop: Math.max(insets.top, 12) + 4 }}
				className="flex-row items-center justify-between border-b-2 border-border bg-card px-4 pb-3 shadow-neo-sm">
				<Text className="font-display text-lg tracking-tight text-foreground uppercase">
					NEW TRANSMISSION
				</Text>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Close new message modal"
					onPress={() => router.back()}
					className="size-9 items-center justify-center border-2 border-border bg-secondary shadow-neo-xs">
					<X size={18} color="#000000" strokeWidth={2.5} />
				</Pressable>
			</View>

			<View className="border-b-2 border-border bg-card px-4 py-3">
				<View className="mb-3 flex-row gap-2">
					<Pressable
						onPress={() => {
							setMode("direct");
							setError(null);
						}}
						className={`flex-1 items-center border-2 border-border py-2 shadow-neo-xs ${
							mode === "direct" ? "bg-primary" : "bg-secondary"
						}`}>
						<Text
							className={`font-bold text-xs uppercase ${
								mode === "direct"
									? "text-primary-foreground"
									: "text-foreground"
							}`}>
							DIRECT MESSAGE
						</Text>
					</Pressable>

					<Pressable
						onPress={() => {
							setMode("group");
							setError(null);
						}}
						className={`flex-1 flex-row items-center justify-center gap-1.5 border-2 border-border py-2 shadow-neo-xs ${
							mode === "group" ? "bg-neo-green" : "bg-secondary"
						}`}>
						<Users size={14} color="#000000" strokeWidth={2.5} />
						<Text className="font-bold text-xs text-foreground uppercase">
							GROUP CHAT
						</Text>
					</Pressable>
				</View>

				{mode === "group" ? (
					<View className="mb-3">
						<TextInput
							value={groupTitle}
							onChangeText={setGroupTitle}
							placeholder="Group name (e.g. OS Project Team)"
							placeholderTextColor="rgba(0, 0, 0, 0.4)"
							maxLength={60}
							className="border-2 border-border bg-surface px-3 py-2 font-mono text-xs text-foreground"
						/>
						<Text className="mt-1 font-mono text-2xs text-muted-foreground uppercase">
							SELECTED: {selectedUserIds.length} USERS (MIN 2)
						</Text>
					</View>
				) : null}

				<View className="flex-row items-center border-2 border-border bg-surface px-3 py-2">
					<Search size={15} color="#000000" strokeWidth={2.5} />
					<TextInput
						value={query}
						onChangeText={setQuery}
						placeholder="Search users by name or @handle..."
						placeholderTextColor="rgba(0, 0, 0, 0.4)"
						autoCapitalize="none"
						autoCorrect={false}
						className="flex-1 px-2 font-mono text-xs text-foreground"
					/>
					{query ? (
						<Pressable onPress={() => setQuery("")} hitSlop={8}>
							<X size={14} color="#000000" />
						</Pressable>
					) : null}
				</View>

				{error ? (
					<Text className="mt-2 font-mono text-xs text-destructive">
						{error}
					</Text>
				) : null}
			</View>

			{isSearching ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator size="large" color="#000000" />
				</View>
			) : (
				<FlatList
					data={results}
					keyExtractor={(item) => item.id}
					keyboardShouldPersistTaps="handled"
					contentContainerStyle={{
						padding: 16,
						paddingBottom: insets.bottom + 80,
						flexGrow: 1,
					}}
					ListEmptyComponent={
						<View className="flex-1 items-center justify-center py-12">
							<Text className="text-center font-mono text-xs text-muted-foreground uppercase">
								{query.trim()
									? `NO USERS MATCHING "${query}"`
									: "TYPE A NAME OR HANDLE TO FIND USERS"}
							</Text>
						</View>
					}
					renderItem={({ item }) => {
						const isSelected = selectedUserIds.includes(item.id);
						const name =
							item.display_name || item.username || "User";
						return (
							<Pressable
								disabled={isCreating}
								onPress={() =>
									mode === "direct"
										? handleSelectDirect(item.id)
										: toggleGroupMember(item.id)
								}
								className={`mb-2.5 flex-row items-center justify-between border-2 border-border p-3 shadow-neo-xs ${
									isSelected ? "bg-neo-green/25" : "bg-card"
								}`}>
								<View className="flex-1 flex-row items-center gap-3">
									<View className="relative">
										<View className="size-10 items-center justify-center overflow-hidden border-2 border-border bg-secondary">
											{item.avatar_url?.startsWith(
												"http",
											) ? (
												<ExpoImage
													source={{
														uri: item.avatar_url,
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
										<ActiveDot
											userId={item.id}
											targetShowActiveStatus={
												item.show_active_status
											}
											className="absolute -right-0.5 -bottom-0.5"
										/>
									</View>

									<View className="min-w-0 flex-1">
										<Text
											numberOfLines={1}
											className="font-bold text-sm text-foreground uppercase">
											{name}
										</Text>
										<Text className="font-mono text-xs text-muted-foreground">
											@{item.username}
										</Text>
									</View>
								</View>

								<View className="flex-row items-center gap-2">
									{item.guild ? (
										<GuildBadge
											guildId={item.guild}
											size="sm"
										/>
									) : null}
									{mode === "group" ? (
										<View
											className={`size-6 items-center justify-center border-2 border-border ${
												isSelected
													? "bg-neo-green"
													: "bg-surface"
											}`}>
											{isSelected ? (
												<Check
													size={14}
													color="#000000"
													strokeWidth={3}
												/>
											) : null}
										</View>
									) : null}
								</View>
							</Pressable>
						);
					}}
				/>
			)}

			{mode === "group" ? (
				<View
					style={{ paddingBottom: Math.max(insets.bottom, 12) }}
					className="border-t-2 border-border bg-card px-4 pt-3">
					<NeoButton
						variant="primary"
						size="md"
						disabled={!canSubmitGroup || isCreating}
						onPress={handleCreateGroup}>
						{isCreating ? "CREATING..." : "CREATE GROUP CHAT"}
					</NeoButton>
				</View>
			) : null}
		</View>
	);
}
