import Constants from "expo-constants";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, ArrowUpRight, Code2, Terminal } from "lucide-react-native";
import { useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MobileTopBar, NeoBadge, NeoButton, NeoCard } from "@/components/ui";

interface DeveloperProfile {
	id: string;
	name: string;
	initials: string;
	role: string;
	handle: string;
	bio: string;
	githubUrl: string;
	githubLabel: string;
}

const DEVELOPERS: DeveloperProfile[] = [
	{
		id: "janleigh",
		name: "Jan Leigh Muñoz",
		initials: "JL",
		role: "Lead Developer",
		handle: "@janleigh",
		bio: "hey its me its verity",
		githubUrl: "https://github.com/janleigh",
		githubLabel: "github.com/janleigh",
	},
];

export default function DevelopersScreen() {
	const insets = useSafeAreaInsets();
	const appVersion = Constants.expoConfig?.version ?? "1.0.0";
	const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>(
		{},
	);

	const handleBack = () => {
		if (router.canGoBack()) {
			router.back();
		} else {
			router.replace("/(tabs)");
		}
	};

	const handleOpenUrl = (url: string) => {
		void Linking.openURL(url);
	};

	return (
		<View className="flex-1 bg-background">
			<StatusBar style="dark" />
			<MobileTopBar
				sector="CREDITS"
				dotColor="#00FF66"
				showBackButton={true}
				onBackPress={handleBack}
			/>
			<ScrollView
				className="flex-1"
				contentContainerStyle={{
					flexGrow: 1,
					paddingTop: 16,
					paddingBottom: Math.max(insets.bottom, 16) + 32,
					paddingHorizontal: 16,
					maxWidth: 672,
					width: "100%",
					alignSelf: "center",
				}}
				showsVerticalScrollIndicator={false}>
				{/* Header Section */}
				<View className="mb-6">
					<View className="flex-row items-center justify-between gap-2">
						<NeoBadge variant="accent" size="sm">
							DEV TEAM
						</NeoBadge>
						<Text className="font-mono text-[11px] text-muted-foreground uppercase">
							BUILD v{appVersion}
						</Text>
					</View>

					<Text className="mt-3 font-display text-4xl tracking-tight text-foreground uppercase">
						DEVELOPERS
					</Text>

					<Text className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground uppercase">
						The engineers building and maintaining Impulse.
					</Text>
				</View>

				{/* Developer Cards */}
				<View className="gap-4">
					{DEVELOPERS.map((dev) => (
						<NeoCard key={dev.id} className="p-5 shadow-neo">
							<View className="flex-row items-center gap-4">
								<View className="size-14 shrink-0 items-center justify-center overflow-hidden border-2 border-border bg-neo-green shadow-neo-sm">
									{!failedAvatars[dev.id] ? (
										<ExpoImage
											source={{
												uri: `${dev.githubUrl}.png`,
											}}
											style={{
												width: "100%",
												height: "100%",
											}}
											contentFit="cover"
											onError={() =>
												setFailedAvatars((prev) => ({
													...prev,
													[dev.id]: true,
												}))
											}
										/>
									) : (
										<Text className="font-display text-xl text-foreground uppercase">
											{dev.initials}
										</Text>
									)}
								</View>

								<View className="min-w-0 flex-1">
									<View className="flex-row flex-wrap items-center gap-2">
										<Text className="font-display text-xl tracking-tight text-foreground uppercase">
											{dev.name}
										</Text>
										<NeoBadge variant="primary" size="sm">
											{dev.role.toUpperCase()}
										</NeoBadge>
									</View>
									<Text className="mt-0.5 font-mono text-xs text-muted-foreground">
										{dev.handle}
									</Text>
								</View>
							</View>

							<Text className="mt-4 font-mono text-xs leading-relaxed text-foreground">
								{dev.bio}
							</Text>

							<View className="mt-4 border-t-2 border-border pt-4">
								<Pressable
									accessibilityRole="link"
									accessibilityLabel={`Open ${dev.name}'s GitHub profile`}
									onPress={() => handleOpenUrl(dev.githubUrl)}
									className="flex-row items-center justify-between border-2 border-border bg-primary px-4 py-3 shadow-neo-sm active:translate-x-px active:translate-y-px">
									<View className="flex-row items-center gap-2.5">
										<Code2
											size={16}
											color="#00FF66"
											strokeWidth={2.5}
										/>
										<Text className="font-bold text-xs tracking-wider text-primary-foreground uppercase">
											{dev.githubLabel}
										</Text>
									</View>
									<ArrowUpRight
										size={16}
										color="#FAF9F5"
										strokeWidth={2.5}
									/>
								</Pressable>
							</View>
						</NeoCard>
					))}
				</View>

				{/* Footer Return Action */}
				<View className="mt-8 gap-3 border-t-2 border-border pt-6">
					<NeoButton
						size="lg"
						variant="primary"
						className="w-full"
						startContent={
							<ArrowLeft
								size={16}
								color="#faf9f5"
								strokeWidth={2.5}
							/>
						}
						onPress={handleBack}>
						RETURN TO PREVIOUS SCREEN
					</NeoButton>
				</View>
			</ScrollView>
		</View>
	);
}
