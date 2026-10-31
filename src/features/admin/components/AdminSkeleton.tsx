import { View } from "react-native";

export function AdminSkeleton() {
	return (
		<View className="flex-1 bg-background">
			{/* Admin Header Skeleton */}
			<View className="border-b-2 border-border bg-card px-4 py-3">
				<View className="flex-row items-center justify-between">
					<View className="flex-row items-center gap-3">
						<View className="h-6 w-36 animate-pulse rounded-sm border-2 border-border bg-secondary" />
						<View className="h-5 w-16 animate-pulse rounded-sm border-2 border-border bg-secondary" />
					</View>
					<View className="flex-row items-center gap-2">
						<View className="h-9 w-24 animate-pulse rounded-sm border-2 border-border bg-secondary" />
						<View className="size-9 animate-pulse rounded-sm border-2 border-border bg-secondary" />
					</View>
				</View>
			</View>

			<View className="flex-1 px-4 py-6">
				{/* Header & Subtitle Skeleton */}
				<View className="mb-6">
					<View className="h-7 w-60 animate-pulse rounded-sm border-2 border-border bg-secondary" />
					<View className="mt-2 h-4 w-80 animate-pulse rounded-sm border-2 border-border bg-secondary" />
				</View>

				{/* 4 Stats Cards Skeleton */}
				<View className="mb-6 flex-row flex-wrap gap-3">
					{[1, 2, 3, 4].map((i) => (
						<View
							key={i}
							className="min-w-[45%] flex-1 rounded-sm border-2 border-border bg-card p-4 shadow-neo-sm">
							<View className="h-4 w-24 animate-pulse rounded-sm bg-secondary" />
							<View className="mt-3 h-8 w-16 animate-pulse rounded-sm bg-secondary" />
							<View className="mt-2 h-3.5 w-32 animate-pulse rounded-sm bg-secondary" />
						</View>
					))}
				</View>

				{/* Search & Tabs Skeleton */}
				<View className="mb-6 gap-3">
					<View className="h-10 w-full animate-pulse rounded-sm border-2 border-border bg-card" />
					<View className="flex-row items-center gap-2">
						<View className="h-8 w-24 animate-pulse rounded-sm border-2 border-border bg-secondary" />
						<View className="h-8 w-24 animate-pulse rounded-sm border-2 border-border bg-secondary" />
						<View className="h-8 w-24 animate-pulse rounded-sm border-2 border-border bg-secondary" />
					</View>
				</View>

				{/* Queue Items Skeleton */}
				<View className="gap-3">
					{[1, 2, 3].map((i) => (
						<View
							key={i}
							className="rounded-sm border-2 border-border bg-card p-4 shadow-neo-sm">
							<View className="flex-row items-center gap-3">
								<View className="size-11 animate-pulse rounded-sm border-2 border-border bg-secondary" />
								<View className="flex-1 gap-2">
									<View className="h-4 w-36 animate-pulse rounded-sm bg-secondary" />
									<View className="h-3 w-48 animate-pulse rounded-sm bg-secondary" />
								</View>
							</View>
						</View>
					))}
				</View>
			</View>
		</View>
	);
}
