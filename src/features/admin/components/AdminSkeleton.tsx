import { View } from "react-native";

export function AdminSkeleton() {
	return (
		<View className="flex-1 bg-background">
			<View className="border-b-2 border-border bg-card px-4 py-3">
				<View className="flex-row items-center justify-between">
					<View className="flex-row items-center gap-3">
						<View className="h-6 w-36 animate-pulse rounded-none border-2 border-border bg-secondary" />
						<View className="h-5 w-16 animate-pulse rounded-none border-2 border-border bg-secondary" />
					</View>
					<View className="flex-row items-center gap-2">
						<View className="h-9 w-24 animate-pulse rounded-none border-2 border-border bg-secondary" />
						<View className="size-9 animate-pulse rounded-none border-2 border-border bg-secondary" />
					</View>
				</View>
			</View>

			<View className="flex-1 px-4 py-6">
				<View className="mb-6">
					<View className="h-7 w-60 animate-pulse rounded-none border-2 border-border bg-secondary" />
					<View className="mt-2 h-4 w-80 animate-pulse rounded-none border-2 border-border bg-secondary" />
				</View>

				<View className="mb-6 flex-row flex-wrap gap-3">
					{[1, 2, 3, 4].map((i) => (
						<View
							key={i}
							className="min-w-[45%] flex-1 rounded-none border-2 border-border bg-card p-4 shadow-neo-sm">
							<View className="h-4 w-24 animate-pulse rounded-none bg-secondary" />
							<View className="mt-3 h-8 w-16 animate-pulse rounded-none bg-secondary" />
							<View className="mt-2 h-3.5 w-32 animate-pulse rounded-none bg-secondary" />
						</View>
					))}
				</View>

				<View className="mb-6 gap-3">
					<View className="h-10 w-full animate-pulse rounded-none border-2 border-border bg-card" />
					<View className="flex-row items-center gap-2">
						<View className="h-8 w-24 animate-pulse rounded-none border-2 border-border bg-secondary" />
						<View className="h-8 w-24 animate-pulse rounded-none border-2 border-border bg-secondary" />
						<View className="h-8 w-24 animate-pulse rounded-none border-2 border-border bg-secondary" />
					</View>
				</View>

				<View className="gap-3">
					{[1, 2, 3].map((i) => (
						<View
							key={i}
							className="rounded-none border-2 border-border bg-card p-4 shadow-neo-sm">
							<View className="flex-row items-center gap-3">
								<View className="size-11 animate-pulse rounded-none border-2 border-border bg-secondary" />
								<View className="flex-1 gap-2">
									<View className="h-4 w-36 animate-pulse rounded-none bg-secondary" />
									<View className="h-3 w-48 animate-pulse rounded-none bg-secondary" />
								</View>
							</View>
						</View>
					))}
				</View>
			</View>
		</View>
	);
}
