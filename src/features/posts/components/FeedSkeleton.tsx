import { View } from "react-native";

export function FeedSkeleton({ count = 3 }: { count?: number }) {
	return (
		<View className="gap-6 py-2">
			{Array.from({ length: count }, (_, idx) => (
				<View key={idx} className="shadow-neo">
					<View className="flex-row items-center justify-between border-2 border-b-0 border-border bg-neo-surface-active px-3 py-2">
						<View className="flex-row items-center gap-2">
							<View className="size-6 animate-pulse rounded-none border border-border bg-secondary" />
							<View className="h-3.5 w-28 animate-pulse rounded-none bg-secondary" />
						</View>
						<View className="h-3 w-12 animate-pulse rounded-none bg-secondary" />
					</View>

					<View className="border-2 border-border bg-surface p-4">
						<View className="mb-2 h-6 w-4/5 animate-pulse rounded-none bg-secondary" />
						<View className="mb-3.5 h-6 w-3/5 animate-pulse rounded-none bg-secondary" />

						<View className="mb-1.5 h-3.5 w-full animate-pulse rounded-none bg-secondary" />
						<View className="mb-1.5 h-3.5 w-11/12 animate-pulse rounded-none bg-secondary" />
						<View className="mb-3.5 h-3.5 w-3/4 animate-pulse rounded-none bg-secondary" />

						<View className="mb-3 flex-row gap-1.5">
							<View className="h-5 w-16 animate-pulse rounded-none border border-border bg-secondary" />
							<View className="h-5 w-20 animate-pulse rounded-none border border-border bg-secondary" />
						</View>

						<View className="mt-1 flex-row items-center justify-between border-t border-border/20 pt-3">
							<View className="h-9 w-28 animate-pulse rounded-none border-2 border-border bg-secondary" />
							<View className="flex-row items-center gap-2">
								<View className="h-9 w-16 animate-pulse rounded-none border-2 border-border bg-secondary" />
								<View className="size-9 animate-pulse rounded-none border-2 border-border bg-secondary" />
							</View>
						</View>
					</View>
				</View>
			))}
		</View>
	);
}
