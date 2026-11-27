import { View } from "react-native";

export function InboxSkeleton({ count = 6 }: { count?: number }) {
	return (
		<View className="flex-1 bg-background">
			{Array.from({ length: count }, (_, idx) => (
				<View
					key={idx}
					className="flex-row items-center gap-3 border-b-2 border-border bg-surface px-4 py-3.5">
					<View className="size-12 animate-pulse rounded-none border-2 border-border bg-secondary shadow-neo-xs" />
					<View className="min-w-0 flex-1 gap-2">
						<View className="flex-row items-center justify-between gap-2">
							<View className="h-4 w-32 animate-pulse rounded-none bg-secondary" />
							<View className="h-3 w-10 animate-pulse rounded-none bg-secondary" />
						</View>
						<View className="h-3 w-4/5 animate-pulse rounded-none bg-secondary" />
					</View>
				</View>
			))}
		</View>
	);
}
