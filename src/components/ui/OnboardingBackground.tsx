import { View } from "react-native";

const GRID_COLUMNS = 6;
const GRID_ROWS = 12;

export function OnboardingBackground() {
	return (
		<View
			pointerEvents="none"
			className="absolute inset-0 opacity-20"
			accessibilityElementsHidden>
			<View className="absolute inset-0 flex-row">
				{Array.from({ length: GRID_COLUMNS - 1 }).map((_, index) => (
					<View
						key={`column-${index}`}
						className="flex-1 border-r border-border/20"
					/>
				))}
				<View className="flex-1" />
			</View>
			<View className="absolute inset-0">
				{Array.from({ length: GRID_ROWS - 1 }).map((_, index) => (
					<View
						key={`row-${index}`}
						className="flex-1 border-b border-border/20"
					/>
				))}
				<View className="flex-1" />
			</View>
			<View className="absolute top-1/4 left-1/2 size-3 bg-destructive" />
		</View>
	);
}
