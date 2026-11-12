import { Image as ExpoImage } from "expo-image";
import { Check, Download, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import {
	ActivityIndicator,
	Modal,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NeoButton } from "@/components/ui";
import { downloadMedia } from "@/features/posts/utils/downloadMedia";

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
			style={{ backgroundColor: "rgba(0, 0, 0, 0.96)", flex: 1 }}
			className="flex-1"
			edges={["top", "bottom"]}>
			<View className="flex-row items-center justify-between border-b-2 border-border bg-card px-4 py-3 shadow-neo-sm">
				<Text className="font-mono text-xs tracking-wider text-foreground uppercase">
					{hasMultiple
						? `MEDIA ${safeIndex + 1} / ${safeMediaUrls.length}`
						: "MEDIA PREVIEW"}
				</Text>

				<View className="flex-row items-center gap-2">
					<NeoButton
						size="sm"
						variant="secondary"
						className="h-9 flex-row items-center gap-1.5 px-3"
						accessibilityLabel="Download active media"
						disabled={isDownloading}
						onPress={handleDownload}>
						{isDownloading ? (
							<ActivityIndicator size="small" color="#000000" />
						) : downloadSuccess ? (
							<>
								<Check
									size={14}
									color="#000000"
									strokeWidth={2.5}
								/>
								<Text className="font-bold text-2xs text-foreground uppercase">
									SAVED
								</Text>
							</>
						) : (
							<>
								<Download
									size={14}
									color="#000000"
									strokeWidth={2.2}
								/>
								<Text className="font-bold text-2xs text-foreground uppercase">
									DOWNLOAD
								</Text>
							</>
						)}
					</NeoButton>

					<NeoButton
						size="sm"
						variant="secondary"
						className="size-9 px-0"
						accessibilityLabel="Close maximized media"
						onPress={onClose}>
						<X size={16} color="#000000" strokeWidth={2.5} />
					</NeoButton>
				</View>
			</View>

			<View
				className="relative flex-1"
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
								className="h-full items-center justify-center p-3">
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
			</View>

			{hasMultiple && (
				<View className="border-t-2 border-border bg-card px-4 py-2.5">
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={{ gap: 8 }}>
						{safeMediaUrls.map((uri, idx) => {
							const isSelected = idx === safeIndex;
							return (
								<Pressable
									key={`${uri}-${idx}`}
									accessibilityLabel={`View media ${idx + 1}`}
									onPress={() => handleSelectThumbnail(idx)}
									style={{ width: 52, height: 52 }}
									className={`overflow-hidden rounded-none border-2 bg-primary ${
										isSelected
											? "border-border"
											: "border-border opacity-60"
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
