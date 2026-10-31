import { router } from "expo-router";
import { ArrowLeft, Monitor } from "lucide-react-native";
import { Button, Text } from "panelui-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AdminNativeScreen() {
	const insets = useSafeAreaInsets();

	return (
		<View
			className="flex-1 items-center justify-center bg-background px-6"
			style={{
				paddingTop: insets.top + 20,
				paddingBottom: insets.bottom + 20,
			}}>
			<View className="w-full max-w-sm items-center rounded-3xl border border-border bg-card p-8 text-center shadow-lg">
				<View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
					<Monitor size={32} className="text-primary" />
				</View>
				<Text
					weight="bold"
					className="text-center text-xl text-foreground">
					Web Only
				</Text>
				<Text className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">
					The Impulse Admin moderation desk is optimized for desktop
					browsers. Please access this portal via your computer or web
					browser.
				</Text>
				<View className="mt-6 w-full">
					<Button
						size="lg"
						fullWidth
						variant="primary"
						className="transition-transform active:scale-[0.96]"
						startContent={
							<ArrowLeft
								size={16}
								className="text-primary-foreground"
							/>
						}
						onPress={() => router.replace("/(tabs)")}>
						Return to Student Portal
					</Button>
				</View>
			</View>
		</View>
	);
}
