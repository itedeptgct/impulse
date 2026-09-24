import { updateUserGuild } from "@auth/api";
import { useAuthStore } from "@auth/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { Check, CheckCircle2, Sparkles } from "lucide-react-native";
import { Button, Dialog, Text } from "panelui-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { GUILD_LIST } from "../constants";
import type { GuildId } from "../types";

interface GuildSelectionModalProps {
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

	// Synchronize when modal opens or profile guild changes
	useEffect(() => {
		if (profile?.guild) {
			setSelectedGuild(profile.guild);
		}
	}, [profile?.guild, open]);

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
			setError(e.message || "Failed to update guild plan. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const selectedGuildInfo =
		GUILD_LIST.find((g) => g.id === selectedGuild) || GUILD_LIST[0];

	return (
		<Dialog
			open={open}
			onOpenChange={(newOpen) => {
				if (!newOpen) {
					void handleDismiss();
				} else if (onOpenChange) {
					onOpenChange(true);
				}
			}}>
			<Dialog.Content className="mx-2 max-h-[92vh] w-full max-w-4xl rounded-3xl border border-border bg-card p-5 shadow-2xl sm:p-6">
				{/* Header Section */}
				<View className="mb-4">
					<Dialog.Title
						weight="bold"
						className="text-2xl tracking-tight text-foreground sm:text-3xl">
						Choose Your Faction
					</Dialog.Title>
					<Dialog.Description className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
						Every Impulse user belongs to a faction. Pick your track to unlock
						specialized algorithms, guild badges, and community lore.
					</Dialog.Description>
				</View>
				{error && (
					<View className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3">
						<Text className="text-xs text-destructive">{error}</Text>
					</View>
				)}
				{/* Plan Cards Container */}
				<ScrollView
					showsVerticalScrollIndicator={false}
					className="-mx-1 max-h-[58vh] px-1">
					<View className="flex-col gap-4 py-1 md:flex-row md:items-stretch">
						{GUILD_LIST.map((guild) => {
							const isSelected = selectedGuild === guild.id;
							return (
								<Pressable
									key={guild.id}
									onPress={() => setSelectedGuild(guild.id)}
									className={`relative flex-1 flex-col justify-between rounded-2xl border p-4 transition-all active:scale-[0.98] sm:p-5 ${
										isSelected
											? `${guild.badgeBorderColor} ${guild.badgeBgColor} shadow-lg ring-1 ring-primary/40`
											: "border-border/70 bg-card hover:border-border"
									}`}>
									{/* Top Featured / Plan Tier Badge */}
									<View className="mb-3 flex-row items-center justify-between">
										<View
											className={`rounded-full border px-2.5 py-0.5 ${guild.badgeBorderColor} ${guild.badgeBgColor}`}>
											<Text
												weight="bold"
												className={`text-[9px] tracking-wider uppercase ${guild.badgeTextColor}`}>
												{guild.badge}
											</Text>
										</View>
										{guild.featured && (
											<View className="flex-row items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5">
												<Sparkles size={10} className="text-emerald-400" />
												<Text
													weight="bold"
													className="text-[9px] tracking-tight text-emerald-400 uppercase">
													Featured
												</Text>
											</View>
										)}
									</View>
									{/* Logo and Plan Identity */}
									<View className="items-center text-center">
										<View
											className="mb-3 h-20 w-20 items-center justify-center rounded-2xl border border-border/80 bg-background/80 p-2 shadow-inner"
											style={{
												borderColor: isSelected
													? `${guild.accentColor}70`
													: undefined,
											}}>
											<Image
												source={guild.logo}
												style={{ width: 58, height: 58 }}
												contentFit="contain"
												transition={200}
											/>
										</View>
										<Text
											weight="bold"
											className="text-lg tracking-tight text-foreground">
											{guild.name}
										</Text>
										<Text
											className="mt-0.5 text-center text-xs leading-tight text-muted-foreground"
											numberOfLines={2}>
											{guild.tagline}
										</Text>
									</View>
									{/* Divider */}
									<View className="my-3.5 border-t border-border/50" />
									{/* Perks Bullet List */}
									<View className="flex-1 gap-2">
										<Text
											weight="semibold"
											className="text-[10px] tracking-wider text-muted-foreground uppercase">
											Perks & Traits
										</Text>
										{guild.perks.map((perk) => (
											<View key={perk} className="flex-row items-start gap-2">
												<View
													className="mt-0.5 h-4 w-4 shrink-0 items-center justify-center rounded-full"
													style={{
														backgroundColor: `${guild.accentColor}25`,
													}}>
													<Check
														size={10}
														color={guild.accentColor}
														strokeWidth={3}
													/>
												</View>
												<Text className="flex-1 text-[11px] leading-snug text-foreground/90">
													{perk}
												</Text>
											</View>
										))}
									</View>
									{/* Card Bottom CTA Indicator */}
									<View className="mt-4 pt-1">
										<View
											className={`flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 transition-all ${
												isSelected
													? "bg-primary shadow-sm"
													: "border border-border/80 bg-muted/30"
											}`}>
											{isSelected ? (
												<>
													<CheckCircle2
														size={14}
														className="text-primary-foreground"
													/>
													<Text
														weight="bold"
														className="text-xs text-primary-foreground">
														Selected Plan
													</Text>
												</>
											) : (
												<Text
													weight="medium"
													className="text-xs text-muted-foreground">
													Select {guild.name}
												</Text>
											)}
										</View>
									</View>
								</Pressable>
							);
						})}
					</View>
				</ScrollView>
				{/* Footer with Selected Plan summary & Action Buttons */}
				<Dialog.Footer className="mt-4 flex-col gap-3 border-t border-border pt-3.5 sm:flex-row sm:items-center sm:justify-between">
					<View className="flex-row items-center gap-2">
						<Text className="text-xs text-muted-foreground">
							Selected Track:
						</Text>
						<View
							className={`rounded-full border px-2.5 py-0.5 ${selectedGuildInfo.badgeBorderColor} ${selectedGuildInfo.badgeBgColor}`}>
							<Text
								weight="semibold"
								className={`text-xs ${selectedGuildInfo.badgeTextColor}`}>
								{selectedGuildInfo.name} Faction
							</Text>
						</View>
					</View>
					<View className="flex-row items-center gap-2.5">
						{canDismiss && (
							<Button
								size="md"
								variant="outline"
								className="transition-transform active:scale-[0.96]"
								onPress={handleDismiss}>
								Decide Later
							</Button>
						)}
						<Button
							size="md"
							variant="primary"
							loading={isSubmitting}
							disabled={!selectedGuild || isSubmitting}
							className="transition-transform active:scale-[0.96]"
							startContent={
								<Sparkles size={15} className="text-primary-foreground" />
							}
							onPress={handleConfirmPlan}>
							Confirm
						</Button>
					</View>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	);
}
