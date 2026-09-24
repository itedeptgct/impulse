import { Skeleton } from "panelui-native";
import { View } from "react-native";

export function AdminSkeleton() {
	return (
		<View className="min-h-screen flex-1 bg-background text-foreground">
			{/* Admin Header Skeleton */}
			<header className="border-b border-border bg-card/60 px-6 py-4">
				<View className="mx-auto flex-row items-center justify-between lg:max-w-7xl">
					<View className="flex-row items-center gap-3">
						<Skeleton
							className="h-6 w-32 rounded-lg"
							label="Loading admin console..."
						/>
						<Skeleton className="h-5 w-20 rounded-full" />
					</View>
					<View className="flex-row items-center gap-3">
						<Skeleton className="h-9 w-28 rounded-xl" />
						<Skeleton className="h-9 w-9 rounded-xl" />
					</View>
				</View>
			</header>
			<main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
				{/* Header & Subtitle Skeleton */}
				<View className="mb-8">
					<Skeleton className="h-8 w-64 rounded-xl" />
					<Skeleton className="mt-2 h-4 w-96 rounded-md" />
				</View>
				{/* 4 Stats Cards Skeleton */}
				<View className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{[1, 2, 3, 4].map((i) => (
						<View
							key={i}
							className="rounded-2xl border border-border bg-card p-5">
							<Skeleton className="h-4 w-28 rounded-md" />
							<Skeleton className="mt-3 h-8 w-20 rounded-lg" />
							<Skeleton className="mt-2 h-3.5 w-32 rounded-md" />
						</View>
					))}
				</View>
				{/* Search & Tabs Skeleton */}
				<View className="mb-6 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<Skeleton className="h-10 w-full rounded-xl sm:w-80" />
					<View className="flex-row items-center gap-2">
						<Skeleton className="h-9 w-20 rounded-xl" />
						<Skeleton className="h-9 w-24 rounded-xl" />
						<Skeleton className="h-9 w-24 rounded-xl" />
					</View>
				</View>
				{/* Queue Items Skeleton */}
				<View className="gap-3">
					{[1, 2, 3, 4, 5].map((i) => (
						<View
							key={i}
							className="flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
							<View className="flex-row items-center gap-4">
								<Skeleton className="h-12 w-12 rounded-xl" />
								<View className="gap-2">
									<Skeleton className="h-5 w-40 rounded-md" />
									<Skeleton className="h-3.5 w-52 rounded-md" />
								</View>
							</View>
							<View className="flex-row items-center gap-3">
								<Skeleton className="h-6 w-24 rounded-full" />
								<Skeleton className="h-9 w-28 rounded-xl" />
								<Skeleton className="h-9 w-24 rounded-xl" />
							</View>
						</View>
					))}
				</View>
			</main>
		</View>
	);
}
