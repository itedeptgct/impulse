import { MessageSquarePlus } from "lucide-react-native";
import { Text, View } from "react-native";

import { NeoButton, NeoCard } from "@/components/ui";

interface InboxEmptyStateProps {
	onNewMessage: () => void;
	hasSearchQuery?: boolean;
}

export function InboxEmptyState({
	onNewMessage,
	hasSearchQuery = false,
}: InboxEmptyStateProps) {
	return (
		<View className="flex-1 items-center justify-center px-6 py-12">
			<NeoCard className="w-full max-w-md items-center p-8 text-center shadow-neo">
				<MessageSquarePlus
					size={36}
					color="#000000"
					strokeWidth={2.5}
				/>
				<Text className="mt-4 text-center font-display text-2xl tracking-tight text-foreground uppercase">
					{hasSearchQuery
						? "NO CONVERSATIONS FOUND"
						: "START A NEW CONVERSATION"}
				</Text>
				<Text className="mt-2 text-center font-mono text-xs leading-relaxed text-muted-foreground">
					{hasSearchQuery
						? "Try searching another username, handle, or group title."
						: "Connect with any user or spin up a group chat."}
				</Text>
				{!hasSearchQuery ? (
					<NeoButton
						variant="primary"
						size="md"
						className="mt-6 w-full"
						onPress={onNewMessage}>
						NEW MESSAGE
					</NeoButton>
				) : null}
			</NeoCard>
		</View>
	);
}
