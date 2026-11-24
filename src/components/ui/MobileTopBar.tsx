import { useAuthStore } from "@auth/store";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { router, usePathname } from "expo-router";
import {
	ArrowLeft,
	Bell,
	Building2,
	Radio,
	Rows2,
	Search,
	Terminal,
} from "lucide-react-native";
import React from "react";
import {
	Platform,
	Pressable,
	Text,
	View,
	useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMessagesStore } from "@/features/messages/store";
import { useUnreadNotificationCount } from "@/features/notifications";

const DESKTOP_TABS = [
	{
		key: "index",
		label: "FEED",
		href: "/(tabs)",
		icon: Rows2,
		accent: "bg-neo-green",
	},
	{
		key: "guilds",
		label: "HOUSES",
		href: "/(tabs)/guilds",
		icon: Building2,
		accent: "bg-neo-green",
	},
	{
		key: "dispatch",
		label: "DISPATCH",
		href: "/(tabs)/dispatch",
		icon: Radio,
		accent: "bg-neo-yellow",
	},
	{
		key: "messages",
		label: "MESSAGES",
		href: "/(tabs)/messages",
		icon: Terminal,
		accent: "bg-neo-cyan",
	},
] as const;

export interface MobileTopBarProps {
	sector: string;
	dotColor?: string;
	showBackButton?: boolean;
	onBackPress?: () => void;
	desktopCompact?: boolean;
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
	desktopCompact = false,
}: MobileTopBarProps) {
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const compactDesktopHeader =
		desktopCompact && Platform.OS === "web" && width >= 1024;
	const pathname = usePathname();
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);
	const totalUnreadMessages = useMessagesStore((state) =>
		state.conversations.reduce((total, conversation) => {
			return total + conversation.unread_count;
		}, 0),
	);

	const displayName =
		profile?.display_name ||
		profile?.username ||
		user?.email?.split("@")[0] ||
		"0xKAI";
	const initials = displayName.slice(0, 2).toUpperCase();

	const upperSector = sector.toUpperCase();
	const isSearchActive = upperSector === "SEARCH";
	const isNotificationsActive = upperSector === "NOTIFICATIONS";
	const isProfileActive =
		upperSector === "PROFILE" || upperSector === "DOSSIER";

	const { data: unreadCount = 0 } = useUnreadNotificationCount(user?.id);

	const handleBack = () => {
		triggerHaptic();
		if (onBackPress) {
			onBackPress();
			return;
		}
		if (router.canGoBack()) router.back();
		else router.replace("/(tabs)");
	};

	const renderActions = () => (
		<View className="flex-row items-center gap-2">
			{user?.id && (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Open notifications"
					hitSlop={6}
					onPress={() => {
						triggerHaptic();
						router.push("/notifications" as any);
					}}
					className={`relative size-9 items-center justify-center border-2 border-border shadow-neo-xs active:translate-x-px active:translate-y-px ${
						isNotificationsActive ? "bg-primary" : "bg-surface"
					}`}>
					<Bell
						size={15}
						color={isNotificationsActive ? "#FAF9F5" : "#000000"}
						strokeWidth={2.5}
					/>
					{unreadCount > 0 && (
						<View className="absolute -top-1.5 -right-1.5 min-w-4 items-center justify-center border border-border bg-primary px-1 py-px">
							<Text className="font-bold text-2xs leading-none text-primary-foreground">
								{unreadCount > 99 ? "99+" : unreadCount}
							</Text>
						</View>
					)}
				</Pressable>
			)}

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
	);

	if (compactDesktopHeader) {
		const currentRoute = pathname.includes("notifications")
			? "notifications"
			: pathname.includes("guilds")
				? "guilds"
				: pathname.includes("dispatch")
					? "dispatch"
					: pathname.includes("messages")
						? "messages"
						: pathname.includes("search")
							? "search"
							: "index";

		return (
			<View className="z-30 border-b-2 border-border bg-background">
				<View
					className="h-16 flex-row items-center justify-between gap-6 px-6"
					style={{
						width: "100%",
						maxWidth: 1280,
						alignSelf: "center",
					}}>
					<Pressable
						accessibilityRole="link"
						accessibilityLabel="Impulse home"
						onPress={() => router.navigate("/(tabs)")}
						className="flex-row items-baseline">
						<Text className="font-display text-2xl tracking-tight text-foreground uppercase">
							IMPULSE
						</Text>
						<Text className="font-display text-2xl text-primary">
							.
						</Text>
					</Pressable>

					<View className="h-full flex-1 flex-row items-center justify-center gap-1">
						{DESKTOP_TABS.map((item) => {
							const Icon = item.icon;
							const active = currentRoute === item.key;

							return (
								<Pressable
									key={item.key}
									accessibilityRole="tab"
									accessibilityLabel={`${item.label} tab`}
									accessibilityState={{
										selected: active,
									}}
									onPress={() => {
										triggerHaptic();
										router.navigate(item.href);
									}}
									className={`relative h-full flex-row items-center gap-2 border-x border-transparent px-5 active:bg-secondary ${
										active
											? "border-x-border bg-primary"
											: ""
									}`}>
									{active && (
										<View
											className={`absolute inset-x-0 bottom-0 h-1 ${item.accent}`}
										/>
									)}
									<View className="relative">
										<Icon
											size={17}
											color={
												active ? "#FAF9F5" : "#000000"
											}
											strokeWidth={2.5}
										/>
										{item.key === "messages" &&
										totalUnreadMessages > 0 ? (
											<View className="absolute -top-1.5 -right-2.5 min-w-4 items-center justify-center rounded-full border border-border bg-destructive px-1">
												<Text className="font-mono text-2xs text-primary-foreground">
													{totalUnreadMessages > 99
														? "99+"
														: totalUnreadMessages}
												</Text>
											</View>
										) : null}
									</View>
									<Text
										className={`font-bold text-xs tracking-wider uppercase ${
											active
												? "text-primary-foreground"
												: "text-foreground"
										}`}>
										{item.label}
									</Text>
								</Pressable>
							);
						})}
					</View>

					{renderActions()}
				</View>
			</View>
		);
	}

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

				{renderActions()}
			</View>
		</View>
	);
}
