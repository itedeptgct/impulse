import { updateUserGuild } from "@auth/api";
import { useAuthStore } from "@auth/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { Check, CheckCircle2, Sparkles, X } from "lucide-react-native";
import { useState } from "react";
import {
	Modal,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NeoButton, NeoCard } from "@/components/ui";

import { GUILD_LIST } from "../constants";
import type { GuildId } from "../types";
import { GuildBadge } from "./GuildBadge";

export interface GuildSelectionModalProps {
	open: boolean;
	onOpenChange?: (open: boolean) => void;
	canDismiss?: boolean;
}

export function GuildSelectionModal({
	open,
	onOpenChange,
	canDismiss = true,
}: GuildSelectionModalProps) {
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);
	const setGuild = useAuthStore((state) => state.setGuild);

	const [selectedGuild, setSelectedGuild] = useState<GuildId>(
		profile?.guild || "octagram",
	);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleDismiss = async () => {
		if (user?.id) {
			try {
				await AsyncStorage.setItem(
					`impulse_guild_modal_dismissed_${user.id}`,
					"true",
				);
			} catch {
				// ignore
			}
		}
		if (onOpenChange) {
			onOpenChange(false);
		}
	};

	const handleConfirmPlan = async () => {
		if (!selectedGuild || !user?.id) return;
		setIsSubmitting(true);
		setError(null);
		try {
			await updateUserGuild(user.id, selectedGuild);
			setGuild(selectedGuild);
			await handleDismiss();
		} catch (err: unknown) {
			const e = err as Error;
			setError(e.message || "Failed to update house. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const selectedGuildInfo =
		GUILD_LIST.find((g) => g.id === selectedGuild) || GUILD_LIST[0];

	return (
		<Modal
			visible={open}
			animationType="slide"
			presentationStyle={
				Platform.OS === "ios" ? "pageSheet" : "fullScreen"
			}
			statusBarTranslucent={true}
			onRequestClose={() => {
				if (canDismiss) void handleDismiss();
			}}>
			<View
				style={{ backgroundColor: "#0a0a0c", flex: 1 }}
				className="flex-1 bg-background">
				<SafeAreaView
					style={{ backgroundColor: "#0a0a0c", flex: 1 }}
					className="flex-1 bg-background"
					edges={["top", "bottom"]}>
					{/* Header Section */}
					<View className="flex-row items-center justify-between border-b-2 border-border bg-card px-4 py-3.5 shadow-neo-sm">
						<View className="flex-1 pr-3">
							<Text className="font-display text-lg tracking-tight text-foreground uppercase">
								SELECT HOUSE
							</Text>
							<Text className="font-mono text-xs text-muted-foreground">
								Select your house to unlock specialized
								transmissions and lore.
							</Text>
						</View>
						{canDismiss && (
							<Pressable
								accessibilityLabel="Close house selection"
								onPress={handleDismiss}
								hitSlop={8}
								className="size-8 items-center justify-center rounded-sm border-2 border-border bg-secondary active:translate-x-px active:translate-y-px">
								<X
									size={15}
									color="#ffffff"
									strokeWidth={2.5}
								/>
							</Pressable>
						)}
					</View>

					{error && (
						<View className="mx-4 mt-3 rounded-sm border-2 border-destructive bg-destructive/15 p-3">
							<Text className="font-mono text-xs text-destructive">
								{error}
							</Text>
						</View>
					)}

					{/* House Cards Scroll Container */}
					<ScrollView
						showsVerticalScrollIndicator={false}
						contentContainerStyle={{
							padding: 16,
							paddingBottom: 28,
						}}
						className="flex-1">
						<View className="gap-4">
							{GUILD_LIST.map((guild) => {
								const isSelected = selectedGuild === guild.id;
								return (
									<NeoCard
										key={guild.id}
										onPress={() =>
											setSelectedGuild(guild.id)
										}
										className={`p-4 ${
											isSelected
												? "border-primary bg-background shadow-neo"
												: "border-border bg-card"
										}`}>
										{/* Top Metadata Row */}
										<View className="mb-2.5 flex-row items-center justify-between">
											<View
												className={`rounded-sm border-2 px-2 py-0.5 ${guild.badgeBorderColor} ${guild.badgeBgColor}`}>
												<Text
													className={`font-mono text-[10px] tracking-wider uppercase ${guild.badgeTextColor}`}>
													{guild.badge}
												</Text>
											</View>
										</View>

										{/* Logo and Identity */}
										<View className="flex-row items-center gap-3">
											<View
												className="size-14 items-center justify-center rounded-sm border-2 bg-secondary p-1.5 shadow-neo-sm"
												style={{
													borderColor: isSelected
														? guild.accentColor
														: "#2a2d3d",
												}}>
												<Image
													source={guild.logo}
													style={{
														width: 34,
														height: 34,
													}}
													contentFit="contain"
												/>
											</View>
											<View className="flex-1">
												<Text className="font-display text-lg tracking-tight text-foreground uppercase">
													{guild.name}
												</Text>
												<Text
													className="mt-0.5 font-mono text-xs text-muted-foreground"
													numberOfLines={2}>
													{guild.tagline}
												</Text>
											</View>
										</View>

										{/* Description */}
										<Text className="mt-3 font-sans text-xs leading-relaxed text-muted-foreground">
											{guild.description}
										</Text>

										{/* Divider */}
										<View className="my-3 border-t-2 border-border" />

										{/* Perks Bullet List */}
										<View className="gap-2">
											{guild.perks.map((perk) => (
												<View
													key={perk}
													className="flex-row items-center gap-2">
													<View
														className="size-4 shrink-0 items-center justify-center rounded-sm border-2 border-border"
														style={{
															backgroundColor: `${guild.accentColor}25`,
														}}>
														<Check
															size={10}
															color={
																guild.accentColor
															}
															strokeWidth={3}
														/>
													</View>
													<Text className="flex-1 font-mono text-[11px] text-foreground/80">
														{perk}
													</Text>
												</View>
											))}
										</View>

										{/* Selection Indicator Bar */}
										<View className="mt-4 pt-1">
											<View
												className={`flex-row items-center justify-center gap-1.5 rounded-sm py-2 ${
													isSelected
														? "border-2 border-primary bg-primary shadow-neo-sm"
														: "border-2 border-border bg-secondary"
												}`}>
												{isSelected ? (
													<>
														<CheckCircle2
															size={14}
															color="#0a0a0c"
															strokeWidth={2.5}
														/>
														<Text className="font-display text-xs tracking-wider text-primary-foreground uppercase">
															SELECTED HOUSE
														</Text>
													</>
												) : (
													<Text className="font-display text-xs tracking-wider text-muted-foreground uppercase">
														SELECT {guild.name}
													</Text>
												)}
											</View>
										</View>
									</NeoCard>
								);
							})}
						</View>
					</ScrollView>

					{/* Sticky Bottom Actions */}
					<View className="border-t-2 border-border bg-card p-4 shadow-neo-sm">
						<View className="mb-3 flex-row items-center justify-between">
							<Text className="font-display text-xs text-muted-foreground uppercase">
								SELECTED HOUSE:
							</Text>
							<GuildBadge
								guildId={selectedGuildInfo.id}
								size="sm"
							/>
						</View>

						<View className="flex-row items-center gap-2.5">
							{canDismiss && (
								<NeoButton
									variant="secondary"
									size="md"
									onPress={handleDismiss}
									className="flex-1">
									CANCEL
								</NeoButton>
							)}
							<NeoButton
								variant="primary"
								size="md"
								loading={isSubmitting}
								disabled={!selectedGuild || isSubmitting}
								onPress={handleConfirmPlan}
								startContent={
									!isSubmitting ? (
										<Sparkles
											size={16}
											color="#0a0a0c"
											strokeWidth={2.5}
										/>
									) : undefined
								}
								className="flex-1">
								INDUCT ME
							</NeoButton>
						</View>
					</View>
				</SafeAreaView>
			</View>
		</Modal>
	);
}
