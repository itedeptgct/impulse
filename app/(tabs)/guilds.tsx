import { useAuthStore } from "@auth/store";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowRight, Clock, Lock } from "lucide-react-native";
import { useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Platform,
	Pressable,
	Text,
	View,
} from "react-native";

import { MobileAlertSheet, MobileTopBar, NeoBadge } from "@/components/ui";
import { updateUserProfile } from "@/features/auth/api";
import { canSwitchGuild } from "@/features/auth/permissions";
import { GUILD_LIST } from "@/features/guilds/constants";
import type { GuildInfo } from "@/features/guilds/types";

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

export default function GuildsScreen() {
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);
	const verification = useAuthStore((state) => state.verification);
	const setProfile = useAuthStore((state) => state.setProfile);
	const [updatingGuildId, setUpdatingGuildId] = useState<string | null>(null);
	const [joinedGuildAlert, setJoinedGuildAlert] = useState<GuildInfo | null>(
		null,
	);
	const [errorAlert, setErrorAlert] = useState<string | null>(null);

	const isSwitchLocked = !canSwitchGuild(profile?.role);
	const isPending =
		profile?.role !== "admin" &&
		(verification?.status === "pending" || !verification);

	const handleJoinGuild = async (guild: GuildInfo) => {
		if (!user?.id) return;
		triggerHaptic();

		if (profile?.guild === guild.id) {
			router.push(`/(tabs)?guild=${guild.id}` as any);
			return;
		}

		if (isSwitchLocked) {
			setErrorAlert(
				"House Mod status active: House alignment is locked. Contact administration to change your assigned house.",
			);
			return;
		}

		if (isPending) {
			setErrorAlert(
				"House affiliation restricted: Your student identification is currently pending verification. House selection will be unlocked once your account is approved by an administrator.",
			);
			return;
		}

		setUpdatingGuildId(guild.id);
		try {
			const updated = await updateUserProfile(user.id, {
				guild: guild.id,
			});
			if (updated) {
				setProfile(updated);
				setJoinedGuildAlert(guild);
			}
		} catch {
			setErrorAlert("Could not complete guild registration ledger.");
		} finally {
			setUpdatingGuildId(null);
		}
	};

	const renderGuildHeader = () => (
		<View className="mb-5 pt-2">
			<Text className="mb-2 font-display text-3xl leading-none tracking-tight text-foreground uppercase sm:text-4xl">
				HOUSE DIRECTORY
			</Text>
			<Text className="font-mono text-xs leading-relaxed tracking-wide text-foreground/75 uppercase">
				SELECT YOUR DOMAIN. GET AFFILIATED. ACCESS HOUSE-ENCRYPTED
				CHANNELS AND DISPATCHES.
			</Text>

			{isSwitchLocked && (
				<View className="mt-3.5 flex-row items-center gap-2.5 border-2 border-border bg-destructive/10 p-3 shadow-neo-xs">
					<Lock size={16} color="#ff2a00" strokeWidth={2.2} />
					<View className="flex-1">
						<Text className="font-bold text-xs tracking-wider text-destructive uppercase">
							HOUSE MOD STATUS ACTIVE - ALIGNMENT LOCKED
						</Text>
						<Text className="font-mono text-2xs text-foreground/80 uppercase">
							House affiliation is locked while serving as House
							Moderator.
						</Text>
					</View>
				</View>
			)}

			{isPending && (
				<View className="mt-3.5 flex-row items-center gap-2.5 border-2 border-border bg-amber-400/20 p-3 shadow-neo-xs">
					<Clock size={16} color="#000000" strokeWidth={2.2} />
					<View className="flex-1">
						<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
							VERIFICATION PENDING
						</Text>
						<Text className="font-mono text-2xs text-foreground/80 uppercase">
							House affiliation is locked while your student ID is
							pending administrative review.
						</Text>
					</View>
				</View>
			)}
		</View>
	);

	const renderGuildCard = ({ item: guild }: { item: GuildInfo }) => {
		const isMember = profile?.guild === guild.id;
		const isUpdating = updatingGuildId === guild.id;
		const { HeroIcon, metrics } = guild;

		return (
			<View className="mb-6 border-2 border-border bg-surface p-4 shadow-neo">
				<View className="mb-3 flex-row flex-wrap items-center justify-between gap-2 border border-border/25 bg-secondary p-2">
					<Text
						className={`flex-1 bg-linear-to-r from-primary via-accent to-primary/60 bg-clip-text font-display text-xl tracking-[0.12em] text-transparent uppercase`}>
						{guild.name.toUpperCase()}
					</Text>

					<View className="border border-border bg-primary px-2 py-1">
						<Text className="trackisng-widest font-bold text-[10px] text-primary-foreground uppercase">
							[HOUSE // {guild.houseNumber || "01"}]
						</Text>
					</View>
				</View>

				<View className="mb-3 overflow-hidden border-2 border-border bg-primary">
					<View className="relative h-34 items-center justify-center bg-primary p-3">
						<View className="absolute inset-0 flex-row flex-wrap opacity-20" />

						{guild.banner ? (
							<ExpoImage
								source={guild.banner}
								style={{ width: "100%", height: "100%" }}
								contentFit="cover"
							/>
						) : (
							<View className="flex-row items-center gap-4">
								<View
									style={{ borderColor: guild.accentColor }}
									className="size-16 items-center justify-center border-2 bg-primary p-2 shadow-neo-sm">
									{guild.logo ? (
										<ExpoImage
											source={guild.logo}
											style={{ width: 42, height: 42 }}
											contentFit="contain"
										/>
									) : (
										<HeroIcon
											size={36}
											color={guild.accentColor}
											strokeWidth={1.8}
										/>
									)}
								</View>
							</View>
						)}

						<View className="absolute bottom-2 left-2 border border-white/40 bg-primary px-2.5 py-0.5">
							<Text className="font-bold text-[10px] tracking-widest text-primary-foreground uppercase">
								SECTOR: {guild.sector || guild.tagline}
							</Text>
						</View>
					</View>
				</View>

				<View className="mb-3 border border-border/30 bg-secondary p-3">
					<Text className="mb-1 font-bold text-[10px] tracking-widest text-foreground/60 uppercase">
						// MANIFESTO EXCERPT
					</Text>
					<Text className="font-bold text-xs leading-relaxed text-foreground">
						"{guild.manifesto}"
					</Text>
				</View>

				<View className="mb-3.5 flex-row border-2 border-border bg-card">
					<View className="flex-1 border-r border-border p-2.5">
						<Text className="font-mono text-2xs tracking-wider text-foreground/60 uppercase">
							{metrics.col1Label}
						</Text>
						<Text className="my-0.5 font-display text-lg text-foreground tabular-nums">
							{metrics.col1Val}
						</Text>
						<Text
							className="font-bold text-3xs uppercase"
							style={{ color: metrics.col1SubColor }}>
							{metrics.col1Sub}
						</Text>
					</View>

					<View className="flex-1 border-r border-border p-2.5">
						<Text className="font-mono text-2xs tracking-wider text-foreground/60 uppercase">
							{metrics.col2Label}
						</Text>
						<Text className="my-0.5 font-display text-lg text-foreground tabular-nums">
							{metrics.col2Val}
						</Text>
						<Text className="font-mono text-3xs text-foreground/70 uppercase">
							{metrics.col2Sub}
						</Text>
					</View>
				</View>

				{isSwitchLocked && !isMember && (
					<View className="mb-3 self-start">
						<NeoBadge
							variant="outline"
							size="sm"
							className="border-2 border-destructive bg-destructive/10"
							textClassName="text-destructive font-mono"
							startContent={
								<Lock
									size={12}
									color="#ff2a00"
									strokeWidth={2.5}
								/>
							}>
							HOUSE MOD STATUS ACTIVE - ALIGNMENT LOCKED
						</NeoBadge>
					</View>
				)}

				<Pressable
					accessibilityRole="button"
					accessibilityLabel={`${guild.actionLabel} for ${guild.name}`}
					onPress={() => handleJoinGuild(guild)}
					disabled={
						isUpdating || isPending || (isSwitchLocked && !isMember)
					}
					className={`min-h-12 flex-row items-center justify-between border-2 border-border px-4 py-3 shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 ${
						isPending || (isSwitchLocked && !isMember)
							? "border-border/50 bg-secondary"
							: "bg-primary"
					}`}>
					{isUpdating ? (
						<ActivityIndicator size={16} color="#FFFFFF" />
					) : isPending ? (
						<View className="flex-row items-center gap-2">
							<Lock size={15} color="#000000" strokeWidth={2.2} />
							<Text className="font-bold text-xs tracking-widest text-foreground uppercase">
								[ LOCKED // VERIFICATION PENDING ]
							</Text>
						</View>
					) : isSwitchLocked && !isMember ? (
						<View className="flex-row items-center gap-2">
							<Lock size={15} color="#ff2a00" strokeWidth={2.2} />
							<Text className="font-bold text-xs tracking-widest text-destructive uppercase">
								[ LOCKED // HOUSE MOD STATUS ACTIVE ]
							</Text>
						</View>
					) : (
						<>
							<Text className="font-bold text-xs tracking-widest text-primary-foreground uppercase">
								{isMember
									? `[ ALIGNED // ${guild.actionLabel.replace(/^\[ | \]$/g, "")} ]`
									: guild.actionLabel}
							</Text>
							<ArrowRight
								size={16}
								color="#FFFFFF"
								strokeWidth={2.5}
							/>
						</>
					)}
				</Pressable>
			</View>
		);
	};

	return (
		<View className="flex-1 bg-background">
			<StatusBar style="dark" />
			<MobileTopBar sector="HOUSES" dotColor="#00FF66" />

			<FlatList
				data={GUILD_LIST}
				keyExtractor={(item) => item.id}
				renderItem={renderGuildCard}
				ListHeaderComponent={renderGuildHeader}
				contentContainerStyle={{
					paddingTop: 10,
					paddingHorizontal: 16,
					paddingBottom: 36,
					maxWidth: 672,
					width: "100%",
					alignSelf: "center",
				}}
				showsVerticalScrollIndicator={false}
			/>

			<MobileAlertSheet
				open={Boolean(joinedGuildAlert)}
				onOpenChange={(open) => {
					if (!open) setJoinedGuildAlert(null);
				}}
				type="success"
				title="AFFILIATION GRANTED"
				description={
					joinedGuildAlert
						? `You have aligned with [${joinedGuildAlert.name.toUpperCase()}]. Dispatches and house-encrypted channels are now linked to your operator profile.`
						: ""
				}
				actions={[
					{
						label: "PROCEED TO SECTOR FEED",
						variant: "primary",
						onPress: () => {
							const targetId = joinedGuildAlert?.id;
							setJoinedGuildAlert(null);
							if (targetId) {
								router.push(`/(tabs)?guild=${targetId}` as any);
							}
						},
					},
					{
						label: "REMAIN IN DIRECTORY",
						variant: "outline",
						onPress: () => setJoinedGuildAlert(null),
					},
				]}
			/>

			<MobileAlertSheet
				open={Boolean(errorAlert)}
				onOpenChange={(open) => {
					if (!open) setErrorAlert(null);
				}}
				type="error"
				title="COMMUNICATION ERROR"
				description={errorAlert || ""}
				actions={[
					{
						label: "DISMISS",
						variant: "outline",
						onPress: () => setErrorAlert(null),
					},
				]}
			/>
		</View>
	);
}
