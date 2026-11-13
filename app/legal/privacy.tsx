import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MobileTopBar, NeoBadge, NeoButton, NeoCard } from "@/components/ui";
import { PRIVACY_POLICY } from "@/features/legal/constants";

export default function PrivacyScreen() {
	const insets = useSafeAreaInsets();

	const handleBack = () => {
		if (router.canGoBack()) {
			router.back();
		} else {
			router.replace("/(tabs)");
		}
	};

	return (
		<View className="flex-1 bg-background">
			<StatusBar style="dark" />
			<MobileTopBar
				sector="LEGAL"
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
							{PRIVACY_POLICY.badge}
						</NeoBadge>
						<Text className="font-mono text-[11px] text-muted-foreground uppercase">
							REV: {PRIVACY_POLICY.lastUpdated}
						</Text>
					</View>

					<Text className="mt-3 font-display text-4xl tracking-tight text-foreground uppercase">
						{PRIVACY_POLICY.title}
					</Text>

					<Text className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground uppercase">
						{PRIVACY_POLICY.subtitle}
					</Text>
				</View>

				{/* Structured Placeholder Sections */}
				<View className="gap-4">
					{PRIVACY_POLICY.sections.map((section) => (
						<NeoCard key={section.id} className="p-4 shadow-neo-sm">
							<NeoCard.Header className="pb-2">
								<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
									{section.title}
								</Text>
							</NeoCard.Header>
							<View className="gap-2.5">
								{section.clauses.map((clause, idx) => (
									<Text
										key={idx}
										className="font-mono text-xs leading-relaxed text-foreground">
										{clause}
									</Text>
								))}
							</View>
						</NeoCard>
					))}
				</View>

				{/* Footer Return Action & Terms Link */}
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

					<Pressable
						onPress={() => router.push("/legal/terms")}
						hitSlop={8}
						className="items-center py-2 active:opacity-70">
						<Text className="font-mono text-xs text-muted-foreground uppercase underline">
							VIEW TERMS OF SERVICE →
						</Text>
					</Pressable>
				</View>
			</ScrollView>
		</View>
	);
}
