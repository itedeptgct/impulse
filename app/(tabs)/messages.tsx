import { MessageSquare } from "lucide-react-native";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NeoCard } from "@/components/ui";

export default function MessagesScreen() {
	const insets = useSafeAreaInsets();

	return (
		<View
			className="flex-1 items-center justify-center bg-background px-6"
			style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
			<NeoCard className="w-full max-w-md items-center p-8 text-center shadow-neo">
				<MessageSquare size={38} color="#91e6b1" strokeWidth={2.2} />
				<Text className="mt-4 font-display text-xl tracking-tight text-foreground uppercase">
					MESSAGING IS COMING
				</Text>
				<Text className="mt-2 text-center font-mono text-xs leading-relaxed text-muted-foreground">
					Private conversations are being wired into Impulse. Check
					back soon :)
				</Text>
			</NeoCard>
		</View>
	);
}
