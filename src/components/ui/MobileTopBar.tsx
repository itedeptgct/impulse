import { useAuthStore } from "@auth/store";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { ArrowLeft, Search } from "lucide-react-native";
import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface MobileTopBarProps {
	sector: string;
	dotColor?: string;
	showBackButton?: boolean;
	onBackPress?: () => void;
}

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

export function MobileTopBar({
	sector,
	dotColor = "#00FF66",
	showBackButton = false,
	onBackPress,
}: MobileTopBarProps) {
	const insets = useSafeAreaInsets();
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);

	const displayName =
		profile?.display_name ||
		profile?.username ||
		user?.email?.split("@")[0] ||
		"0xKAI";
	const initials = displayName.slice(0, 2).toUpperCase();

	const upperSector = sector.toUpperCase();
	const isSearchActive = upperSector === "SEARCH";
	const isProfileActive =
		upperSector === "PROFILE" || upperSector === "DOSSIER";

	const handleBack = () => {
		triggerHaptic();
		if (onBackPress) {
			onBackPress();
			return;
		}
		if (router.canGoBack()) router.back();
		else router.replace("/(tabs)");
	};

	return (
		<View
			style={{ paddingTop: Math.max(insets.top, 8) }}
			className="z-30 bg-background">
			<View className="flex-row items-center justify-between border-b-2 border-border bg-background px-4 py-2.5">
				<View className="flex-row items-center gap-2.5">
					{showBackButton && (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Go back"
							hitSlop={8}
							onPress={handleBack}
							className="size-9 items-center justify-center border-2 border-border bg-surface shadow-neo-xs active:translate-x-px active:translate-y-px">
							<ArrowLeft
								size={16}
								color="#000000"
								strokeWidth={2.5}
							/>
						</Pressable>
					)}

					<Pressable
						onPress={() => {
							triggerHaptic();
							router.navigate("/(tabs)");
						}}
						className="flex-row items-baseline active:opacity-80">
						<Text className="font-display text-2xl leading-none tracking-tight text-foreground uppercase">
							IMPULSE
						</Text>
						<Text
							style={{ color: dotColor }}
							className="font-display text-2xl leading-none">
							.
						</Text>
						<Text className="font-display text-2xl leading-none tracking-tight text-foreground uppercase">
							{sector}
						</Text>
					</Pressable>
				</View>

				<View className="flex-row items-center gap-2">
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Search network"
						hitSlop={6}
						onPress={() => {
							triggerHaptic();
							router.push("/(tabs)/search");
						}}
						className={`size-9 items-center justify-center border-2 border-border shadow-neo-xs active:translate-x-px active:translate-y-px ${
							isSearchActive ? "bg-primary" : "bg-surface"
						}`}>
						<Search
							size={15}
							color={isSearchActive ? "#FAF9F5" : "#000000"}
							strokeWidth={2.5}
						/>
					</Pressable>

					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Open operator profile"
						hitSlop={6}
						onPress={() => {
							triggerHaptic();
							router.push("/(tabs)/profile");
						}}
						className={`relative size-9 items-center justify-center border-2 border-border shadow-neo-xs active:translate-x-px active:translate-y-px ${
							isProfileActive ? "bg-neo-green" : "bg-primary"
						}`}>
						{profile?.avatar_url?.startsWith("http") ? (
							<ExpoImage
								source={{ uri: profile.avatar_url }}
								style={{ width: "100%", height: "100%" }}
								contentFit="cover"
							/>
						) : (
							<Text
								className={`font-bold text-xs ${
									isProfileActive
										? "text-foreground"
										: "text-primary-foreground"
								}`}>
								{initials}
							</Text>
						)}
					</Pressable>
				</View>
			</View>
		</View>
	);
}
