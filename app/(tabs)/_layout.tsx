import { useAuthStore } from "@auth/store";
import * as Haptics from "expo-haptics";
import { Redirect, Tabs, router, usePathname } from "expo-router";
import { Building2, Rows2, Terminal } from "lucide-react-native";
import React, { useMemo } from "react";
import {
	ActivityIndicator,
	Platform,
	Pressable,
	Text,
	View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PostComposerModal } from "@/features/posts/components/PostComposerModal";
import { useComposerStore } from "@/features/posts/store";

const triggerTabHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

const TAB_ORDER = ["index", "guilds", "messages"] as const;

export default function TabsLayout() {
	const session = useAuthStore((state) => state.session);
	const isLoading = useAuthStore((state) => state.isLoading);
	const insets = useSafeAreaInsets();
	const pathname = usePathname();

	const isComposerOpen = useComposerStore((state) => state.isOpen);
	const composerInitialTray = useComposerStore((state) => state.initialTray);
	const closeComposer = useComposerStore((state) => state.closeComposer);

	// I present you
	// the worst gesture detection code in the history of mankind
	// but it works and I don't care enough to fix it
	// sponsored by tyrone from cebu
	const currentRoute = pathname.includes("guilds")
		? "guilds"
		: pathname.includes("messages")
			? "messages"
			: pathname.includes("search")
				? "search"
				: pathname.includes("profile")
					? "profile"
					: "index";

	const panGesture = useMemo(() => {
		return Gesture.Pan()
			.runOnJS(true)
			.activeOffsetX([-25, 25])
			.failOffsetY([-15, 15])
			.onEnd((e) => {
				if (isComposerOpen) return;
				const currentIndex = TAB_ORDER.indexOf(currentRoute as any);
				if (currentIndex === -1) return;

				const isSwipeLeft =
					e.translationX < -50 ||
					(e.translationX < -20 && e.velocityX < -400);
				const isSwipeRight =
					e.translationX > 50 ||
					(e.translationX > 20 && e.velocityX > 400);

				if (isSwipeLeft && currentIndex < TAB_ORDER.length - 1) {
					const nextRoute = TAB_ORDER[currentIndex + 1];
					triggerTabHaptic();
					router.navigate(
						nextRoute === "index"
							? "/(tabs)"
							: (`/(tabs)/${nextRoute}` as any),
					);
				} else if (isSwipeRight && currentIndex > 0) {
					const prevRoute = TAB_ORDER[currentIndex - 1];
					triggerTabHaptic();
					router.navigate(
						prevRoute === "index"
							? "/(tabs)"
							: (`/(tabs)/${prevRoute}` as any),
					);
				}
			});
	}, [currentRoute, isComposerOpen]);

	if (isLoading) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator color="#000000" size="large" />
			</View>
		);
	}

	if (!session) {
		return <Redirect href="/(onboarding)/onboarding" />;
	}

	return (
		<>
			<GestureDetector gesture={panGesture}>
				<View className="flex-1">
					<Tabs
						backBehavior="history"
						tabBar={({ state, navigation }) => {
							const activeTabRoute =
								state.routes[state.index]?.name;
							const items = [
								{
									key: "index",
									label: "FEED",
									a11yLabel: "Feed tab",
									role: "tab" as const,
									icon: Rows2,
									active:
										activeTabRoute === "index" &&
										!isComposerOpen,
									barClass: "bg-neo-green",
									pressClass: "active:bg-secondary",
									onPress: () => navigation.navigate("index"),
								},
								{
									key: "guilds",
									label: "Houses",
									a11yLabel: "Guilds tab",
									role: "tab" as const,
									icon: Building2,
									active:
										activeTabRoute === "guilds" &&
										!isComposerOpen,
									barClass: "bg-neo-green",
									pressClass: "active:bg-secondary",
									onPress: () =>
										navigation.navigate("guilds"),
								},
								{
									key: "messages",
									label: "MESSAGES",
									a11yLabel: "Dispatch messages tab",
									role: "tab" as const,
									icon: Terminal,
									active:
										activeTabRoute === "messages" &&
										!isComposerOpen,
									barClass: "bg-neo-cyan",
									pressClass: "active:bg-secondary",
									onPress: () =>
										navigation.navigate("messages"),
								},
							];

							return (
								<View
									style={{
										paddingBottom:
											insets.bottom > 0
												? insets.bottom
												: 6,
										backgroundColor: "#FAF9F5",
									}}
									className="border-t-2 border-border bg-background shadow-neo-top-sm">
									<View className="flex-row">
										{items.map((item, idx) => {
											const Icon = item.icon;
											return (
												<Pressable
													key={item.key}
													accessibilityRole={
														item.role
													}
													accessibilityState={
														item.role === "tab"
															? {
																	selected:
																		item.active,
																}
															: undefined
													}
													accessibilityLabel={
														item.a11yLabel
													}
													onPress={() => {
														triggerTabHaptic();
														item.onPress();
													}}
													className={`relative min-h-14 flex-1 items-center justify-center py-2.5 ${
														idx < items.length - 1
															? "border-r-2 border-border"
															: ""
													} ${
														item.active
															? "bg-primary"
															: `bg-background ${item.pressClass}`
													}`}>
													{item.active && (
														<View
															className={`absolute inset-x-0 top-0 h-1 ${item.barClass}`}
														/>
													)}
													<Icon
														size={18}
														color={
															item.active
																? "#FAF9F5"
																: "#000000"
														}
														strokeWidth={2.5}
													/>
													<Text
														className={`mt-1 font-bold text-[10px] tracking-wider uppercase ${
															item.active
																? "text-primary-foreground"
																: "text-foreground"
														}`}>
														{item.label}
													</Text>
												</Pressable>
											);
										})}
									</View>
								</View>
							);
						}}
						screenOptions={{
							headerShown: false,
							animation: "shift",
						}}>
						<Tabs.Screen name="index" />
						<Tabs.Screen name="guilds" />
						<Tabs.Screen name="messages" />
						<Tabs.Screen name="search" options={{ href: null }} />
						<Tabs.Screen name="profile" options={{ href: null }} />
					</Tabs>
				</View>
			</GestureDetector>

			<PostComposerModal
				visible={isComposerOpen}
				initialTray={composerInitialTray}
				onClose={closeComposer}
				onCreated={() => {
					closeComposer();
					router.replace("/(tabs)");
				}}
			/>
		</>
	);
}
