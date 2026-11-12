import { StatusBar } from "expo-status-bar";
import { MessageSquare } from "lucide-react-native";
import { Text, View } from "react-native";

import { MobileTopBar, NeoCard } from "@/components/ui";

export default function MessagesScreen() {
	return (
		<View className="flex-1 bg-background">
			<StatusBar style="dark" />
			<MobileTopBar sector="MESSAGES" dotColor="#00FF66" />

			<View className="flex-1 items-center justify-center px-6">
				<NeoCard className="w-full max-w-md items-center p-8 text-center shadow-neo">
					<View className="mb-4 border-2 border-border bg-neo-green px-2.5 py-0.5 shadow-neo-xs">
						<Text className="font-bold text-[10px] tracking-widest text-foreground uppercase">
							[ COMING SOON ]
						</Text>
					</View>
					<MessageSquare
						size={38}
						color="#000000"
						strokeWidth={2.5}
					/>
					<Text className="mt-4 font-display text-2xl tracking-tight text-foreground uppercase">
						MESSAGING IS COMING
					</Text>
					<Text className="mt-2 text-center font-mono text-xs leading-relaxed text-muted-foreground">
						Private conversations and direct dispatches are being
						wired into Impulse. Check back soon.
					</Text>
				</NeoCard>
			</View>
		</View>
	);
}
