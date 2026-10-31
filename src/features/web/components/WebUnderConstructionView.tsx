import { router } from "expo-router";
import {
	Construction,
	ExternalLink,
	ShieldCheck,
	Smartphone,
} from "lucide-react-native";
import { Button, Text } from "panelui-native";
import { Linking, View } from "react-native";

import { RICKROLL_MOBILE_APP_URL } from "../utils/web-route-guard";

export function WebUnderConstructionView() {
	const handleInstallApp = () => {
		void Linking.openURL(RICKROLL_MOBILE_APP_URL);
	};

	const handleAdminPortal = () => {
		router.replace("/admin");
	};

	return (
		<View className="min-h-screen flex-1 items-center justify-center bg-background px-4 py-8">
			{/* Ambient background glow */}
			<View className="w-full max-w-lg items-center rounded-3xl border border-border bg-card p-8 shadow-2xl">
				{/* Top Status Pill */}
				<View className="mb-6 flex-row items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5">
					<Construction size={14} color="#10b981" />
					<Text weight="medium" className="text-xs text-primary">
						Mobile-First Focus
					</Text>
				</View>

				{/* Primary Smartphone Icon Badge */}
				<View className="mb-6 h-20 w-20 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10 shadow-inner">
					<Smartphone size={36} color="#10b981" />
				</View>

				{/* Title */}
				<Text
					weight="bold"
					className="text-center text-2xl text-foreground sm:text-3xl">
					Impulse is Mobile-First
				</Text>

				{/* Description */}
				<Text className="mt-3 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
					Our student web application is temporarily under
					construction while we focus on crafting the best mobile
					experience for iOS and Android. Join the conversation on
					your phone!
				</Text>

				{/* Action Buttons */}
				<View className="mt-8 w-full max-w-xs flex-col gap-3">
					<Button
						size="lg"
						fullWidth
						variant="primary"
						className="transition-transform active:scale-[0.96]"
						startContent={<Smartphone size={18} color="#000000" />}
						endContent={<ExternalLink size={16} color="#000000" />}
						onPress={handleInstallApp}>
						Install Mobile App
					</Button>

					<Button
						size="md"
						fullWidth
						variant="outline"
						className="border-border text-muted-foreground transition-transform active:scale-[0.96]"
						startContent={<ShieldCheck size={16} color="#a1a1aa" />}
						onPress={handleAdminPortal}>
						Admin Moderation Desk
					</Button>
				</View>

				{/* Bottom subtle note */}
				<Text className="mt-6 text-center text-xs text-muted-foreground/60">
					Admin portal remains operational on desktop browsers.
				</Text>
			</View>
		</View>
	);
}
