import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";

export interface PostMediaCarouselProps {
	mediaUrls: string[];
	height?: number;
	onMediaPress?: (index: number) => void;
	className?: string;
}

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

export function PostMediaCarousel({
	mediaUrls,
	height = 215,
	onMediaPress,
	className,
}: PostMediaCarouselProps) {
	const [cardWidth, setCardWidth] = useState(0);
	const [activeIndex, setActiveIndex] = useState(0);

	if (!mediaUrls || mediaUrls.length === 0) {
		return null;
	}

	const handleImagePress = (index: number) => {
		triggerHaptic();
		onMediaPress?.(index);
	};

	if (mediaUrls.length === 1) {
		return (
			<View
				style={{ height }}
				className={`relative overflow-hidden border-2 border-border bg-primary ${className ?? ""}`}>
				<Pressable
					accessibilityRole="imagebutton"
					accessibilityLabel="Inspect render asset"
					onPress={() => handleImagePress(0)}
					className="size-full active:opacity-95">
					<ExpoImage
						source={{ uri: mediaUrls[0] }}
						style={{ width: "100%", height: "100%" }}
						contentFit="cover"
					/>
				</Pressable>

				<View className="pointer-events-none absolute right-2.5 bottom-2.5 border border-white/40 bg-primary/90 px-2 py-0.5">
					<Text className="font-mono text-2xs tracking-widest text-primary-foreground uppercase tabular-nums">
						SINGLE ASSET RENDER
					</Text>
				</View>
			</View>
		);
	}

	const handleMomentumScrollEnd = (
		e: NativeSyntheticEvent<NativeScrollEvent>,
	) => {
		if (cardWidth > 0) {
			const offset = e.nativeEvent.contentOffset.x;
			const nextIdx = Math.max(
				0,
				Math.min(Math.round(offset / cardWidth), mediaUrls.length - 1),
			);
			setActiveIndex(nextIdx);
		}
	};

	return (
		<View
			onLayout={(e) => {
				const w = Math.round(e.nativeEvent.layout.width);
				if (w > 0 && w !== cardWidth) {
					setCardWidth(w);
				}
			}}
			style={{ height }}
			className={`relative overflow-hidden border-2 border-border bg-primary ${className ?? ""}`}>
			{cardWidth > 0 && (
				<ScrollView
					horizontal
					pagingEnabled
					nestedScrollEnabled
					showsHorizontalScrollIndicator={false}
					onMomentumScrollEnd={handleMomentumScrollEnd}
					scrollEventThrottle={16}
					style={{ width: cardWidth, height: "100%" }}>
					{mediaUrls.map((uri, index) => (
						<Pressable
							key={`${uri}-${index}`}
							accessibilityRole="imagebutton"
							accessibilityLabel={`Inspect asset ${index + 1} of ${mediaUrls.length}`}
							onPress={() => handleImagePress(index)}
							style={{ width: cardWidth, height: "100%" }}
							className="active:opacity-95">
							<ExpoImage
								source={{ uri }}
								style={{ width: "100%", height: "100%" }}
								contentFit="cover"
							/>
						</Pressable>
					))}
				</ScrollView>
			)}

			{/* Indicator Badge */}
			<View className="pointer-events-none absolute right-2.5 bottom-2.5 border border-white/40 bg-primary/90 px-2 py-0.5">
				<Text className="font-mono text-2xs tracking-widest text-primary-foreground uppercase tabular-nums">
					{`${activeIndex + 1} of ${mediaUrls.length}`}
				</Text>
			</View>

			{/* Paging Dots Indicator */}
			<View className="pointer-events-none absolute bottom-2.5 left-2.5 flex-row items-center gap-1">
				{mediaUrls.map((_, idx) => (
					<View
						key={idx}
						className={`h-1.5 ${
							idx === activeIndex
								? "w-4 bg-neo-green"
								: "w-1.5 bg-white/50"
						}`}
					/>
				))}
			</View>
		</View>
	);
}
