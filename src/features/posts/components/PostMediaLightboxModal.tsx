import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import {
	Check,
	ChevronLeft,
	ChevronRight,
	Download,
	X,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import {
	ActivityIndicator,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { downloadMedia } from "@/features/posts/utils/downloadMedia";

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

export interface PostMediaLightboxModalProps {
	visible: boolean;
	mediaUrls: string[];
	initialIndex?: number;
	onClose: () => void;
	inlineOverlay?: boolean;
}

export function PostMediaLightboxModal({
	visible,
	mediaUrls,
	initialIndex = 0,
	onClose,
	inlineOverlay = false,
}: PostMediaLightboxModalProps) {
	const [activeIndex, setActiveIndex] = useState(initialIndex);
	const [viewportWidth, setViewportWidth] = useState(0);
	const [isDownloading, setIsDownloading] = useState(false);
	const [downloadSuccess, setDownloadSuccess] = useState(false);
	const scrollRef = useRef<ScrollView>(null);

	const safeMediaUrls = mediaUrls ?? [];
	const hasMultiple = safeMediaUrls.length > 1;

	const handleDownload = async () => {
		const currentUrl = safeMediaUrls[safeIndex];
		if (!currentUrl || isDownloading) return;
		setIsDownloading(true);
		setDownloadSuccess(false);
		try {
			const res = await downloadMedia(currentUrl);
			if (res.success) {
				setDownloadSuccess(true);
				setTimeout(() => {
					setDownloadSuccess(false);
				}, 2500);
			}
		} finally {
			setIsDownloading(false);
		}
	};

	useEffect(() => {
		if (!visible) return;
		const clamped = Math.max(
			0,
			Math.min(initialIndex, Math.max(0, safeMediaUrls.length - 1)),
		);
		queueMicrotask(() => {
			setActiveIndex(clamped);
		});
		if (viewportWidth > 0) {
			queueMicrotask(() => {
				scrollRef.current?.scrollTo({
					x: clamped * viewportWidth,
					animated: false,
				});
			});
		}
	}, [visible, initialIndex, safeMediaUrls.length, viewportWidth]);

	if (!visible || safeMediaUrls.length === 0) return null;

	const safeIndex = Math.max(
		0,
		Math.min(activeIndex, Math.max(0, safeMediaUrls.length - 1)),
	);

	const handleMomentumScrollEnd = (
		e: NativeSyntheticEvent<NativeScrollEvent>,
	) => {
		if (viewportWidth > 0) {
			const offset = e.nativeEvent.contentOffset.x;
			const nextIdx = Math.max(
				0,
				Math.min(
					Math.round(offset / viewportWidth),
					safeMediaUrls.length - 1,
				),
			);
			setActiveIndex(nextIdx);
		}
	};

	const handleSelectThumbnail = (index: number) => {
		setActiveIndex(index);
		if (viewportWidth > 0) {
			scrollRef.current?.scrollTo({
				x: index * viewportWidth,
				animated: true,
			});
		}
	};

	const content = (
		<SafeAreaView
			style={{ backgroundColor: "#050505", flex: 1 }}
			className="flex-1 bg-[#050505]"
			edges={["top", "bottom"]}>
			{/* Dark Minimal Top HUD */}
			<View className="flex-row items-center justify-between border-b border-white/15 bg-black/90 px-4 py-3">
				<View className="flex-row items-center gap-2">
					<View className="size-2 bg-neo-green" />
					<Text className="font-ndot-caps text-xs tracking-widest text-white uppercase tabular-nums">
						{hasMultiple
							? `${String(safeIndex + 1).padStart(2, "0")} / ${String(safeMediaUrls.length).padStart(2, "0")}`
							: "MEDIA VIEW"}
					</Text>
				</View>

				<View className="flex-row items-center gap-2">
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Download active media"
						disabled={isDownloading}
						onPress={() => {
							triggerHaptic();
							void handleDownload();
						}}
						className={`h-9 flex-row items-center gap-1.5 border px-3 active:opacity-80 ${
							downloadSuccess
								? "border-neo-green bg-neo-green"
								: "border-white/30 bg-white/10"
						}`}>
						{isDownloading ? (
							<ActivityIndicator size="small" color="#ffffff" />
						) : downloadSuccess ? (
							<>
								<Check
									size={14}
									color="#000000"
									strokeWidth={2.8}
								/>
								<Text className="font-bold text-2xs tracking-widest text-foreground uppercase">
									SAVED
								</Text>
							</>
						) : (
							<>
								<Download
									size={14}
									color="#ffffff"
									strokeWidth={2.2}
								/>
								<Text className="font-bold text-2xs tracking-widest text-white uppercase">
									SAVE
								</Text>
							</>
						)}
					</Pressable>

					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Close maximized media"
						hitSlop={8}
						onPress={() => {
							triggerHaptic();
							onClose();
						}}
						className="size-9 items-center justify-center border border-white/30 bg-white/10 active:bg-white/20">
						<X size={16} color="#ffffff" strokeWidth={2.5} />
					</Pressable>
				</View>
			</View>

			{/* Full-Bleed Media Stage */}
			<View
				className="relative flex-1 bg-[#050505]"
				onLayout={(e) => {
					const w = Math.round(e.nativeEvent.layout.width);
					if (w > 0 && w !== viewportWidth) {
						setViewportWidth(w);
					}
				}}>
				{viewportWidth > 0 && (
					<ScrollView
						ref={scrollRef}
						horizontal
						pagingEnabled
						showsHorizontalScrollIndicator={false}
						onMomentumScrollEnd={handleMomentumScrollEnd}
						scrollEventThrottle={16}
						className="flex-1">
						{safeMediaUrls.map((uri, idx) => (
							<View
								key={`${uri}-${idx}`}
								style={{ width: viewportWidth }}
								className="h-full items-center justify-center">
								<Pressable
									accessibilityLabel="Dismiss maximized media"
									onPress={onClose}
									className="absolute inset-0"
								/>
								<ExpoImage
									source={{ uri }}
									style={{ width: "100%", height: "100%" }}
									contentFit="contain"
								/>
							</View>
						))}
					</ScrollView>
				)}

				{hasMultiple && safeIndex > 0 && (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Previous image"
						onPress={() => {
							triggerHaptic();
							handleSelectThumbnail(safeIndex - 1);
						}}
						className="absolute top-1/2 left-3 -mt-5 size-10 items-center justify-center border border-white/25 bg-black/70 active:bg-white/20">
						<ChevronLeft
							size={18}
							color="#ffffff"
							strokeWidth={2.5}
						/>
					</Pressable>
				)}

				{hasMultiple && safeIndex < safeMediaUrls.length - 1 && (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Next image"
						onPress={() => {
							triggerHaptic();
							handleSelectThumbnail(safeIndex + 1);
						}}
						className="absolute top-1/2 right-3 -mt-5 size-10 items-center justify-center border border-white/25 bg-black/70 active:bg-white/20">
						<ChevronRight
							size={18}
							color="#ffffff"
							strokeWidth={2.5}
						/>
					</Pressable>
				)}
			</View>

			{/* Dark Filmstrip Thumbnail Bar */}
			{hasMultiple && (
				<View className="border-t border-white/15 bg-black/95 px-4 py-3">
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={{
							gap: 8,
							flexGrow: 1,
							justifyContent: "center",
						}}>
						{safeMediaUrls.map((uri, idx) => {
							const isSelected = idx === safeIndex;
							return (
								<Pressable
									key={`${uri}-${idx}`}
									accessibilityRole="button"
									accessibilityLabel={`View media ${idx + 1}`}
									onPress={() => {
										triggerHaptic();
										handleSelectThumbnail(idx);
									}}
									style={{ width: 52, height: 52 }}
									className={`overflow-hidden border-2 bg-black ${
										isSelected
											? "border-neo-green"
											: "border-white/20 opacity-45"
									}`}>
									<ExpoImage
										source={{ uri }}
										style={{
											width: "100%",
											height: "100%",
										}}
										contentFit="cover"
									/>
								</Pressable>
							);
						})}
					</ScrollView>
				</View>
			)}
		</SafeAreaView>
	);

	if (inlineOverlay) {
		return (
			<View
				style={{
					position: "absolute",
					top: 0,
					right: 0,
					bottom: 0,
					left: 0,
					zIndex: 50,
				}}>
				{content}
			</View>
		);
	}

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			statusBarTranslucent
			onRequestClose={onClose}>
			{content}
		</Modal>
	);
}
