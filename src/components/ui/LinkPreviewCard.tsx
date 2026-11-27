import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import {
	ArrowUpRight,
	BarChart3,
	BookOpen,
	Code2,
	FileText,
	Globe,
	Layers,
	Play,
	Search,
	Zap,
	type LucideIcon,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
	type GestureResponderEvent,
	Linking,
	Platform,
	Pressable,
	Text,
	View,
} from "react-native";

import {
	type ExtractedLink,
	type LinkCategory,
	extractLinksFromText,
	fetchLinkPreviewMetadata,
	resolveStaticLinkMetadata,
} from "@/lib/link-preview";

interface CategoryVisual {
	icon: LucideIcon;
	tileBg: string;
	iconColor: string;
	badgeBg: string;
	badgeText: string;
}

const CATEGORY_VISUALS: Record<LinkCategory, CategoryVisual> = {
	search: {
		icon: Search,
		tileBg: "bg-neo-cyan",
		iconColor: "#000000",
		badgeBg: "bg-neo-cyan",
		badgeText: "text-foreground",
	},
	index: {
		icon: BarChart3,
		tileBg: "bg-neo-green",
		iconColor: "#000000",
		badgeBg: "bg-neo-green",
		badgeText: "text-foreground",
	},
	code: {
		icon: Code2,
		tileBg: "bg-primary",
		iconColor: "#00FF66",
		badgeBg: "bg-primary",
		badgeText: "text-neo-green",
	},
	video: {
		icon: Play,
		tileBg: "bg-accent",
		iconColor: "#FAF9F5",
		badgeBg: "bg-accent",
		badgeText: "text-accent-foreground",
	},
	paper: {
		icon: BookOpen,
		tileBg: "bg-secondary",
		iconColor: "#000000",
		badgeBg: "bg-secondary",
		badgeText: "text-foreground",
	},
	docs: {
		icon: FileText,
		tileBg: "bg-secondary",
		iconColor: "#000000",
		badgeBg: "bg-secondary",
		badgeText: "text-foreground",
	},
	design: {
		icon: Layers,
		tileBg: "bg-neo-magenta",
		iconColor: "#FAF9F5",
		badgeBg: "bg-neo-magenta",
		badgeText: "text-primary-foreground",
	},
	impulse: {
		icon: Zap,
		tileBg: "bg-neo-green",
		iconColor: "#000000",
		badgeBg: "bg-neo-green",
		badgeText: "text-foreground",
	},
	web: {
		icon: Globe,
		tileBg: "bg-secondary",
		iconColor: "#000000",
		badgeBg: "bg-secondary",
		badgeText: "text-foreground",
	},
};

export interface LinkPreviewCardProps {
	link: ExtractedLink;
	className?: string;
}

export function LinkPreviewCard({
	link,
	className = "",
}: LinkPreviewCardProps) {
	const [failedUris, setFailedUris] = useState<Record<string, true>>({});
	const initialData = useMemo(() => resolveStaticLinkMetadata(link), [link]);

	const { data } = useQuery({
		queryKey: ["link-preview", link.href],
		queryFn: () => fetchLinkPreviewMetadata(link),
		placeholderData: initialData,
		staleTime: 1000 * 60 * 30,
		gcTime: 1000 * 60 * 60,
		retry: 1,
	});
	const meta = data ?? initialData;

	const visual = CATEGORY_VISUALS[meta.category] ?? CATEGORY_VISUALS.web;
	const IconComponent = visual.icon;

	const markFailed = (uri: string) => {
		setFailedUris((prev) => (prev[uri] ? prev : { ...prev, [uri]: true }));
	};

	const logoCandidates = useMemo(() => {
		const list = [meta.logoUrl, meta.faviconUrl].filter(
			(uri): uri is string => Boolean(uri),
		);
		return Array.from(new Set(list));
	}, [meta.logoUrl, meta.faviconUrl]);

	const currentLogoUri =
		logoCandidates.find((uri) => !failedUris[uri]) ?? null;

	const bannerUri =
		meta.imageUrl &&
		meta.imageUrl !== currentLogoUri &&
		!failedUris[meta.imageUrl]
			? meta.imageUrl
			: null;

	const showSiteNameInHeader = Boolean(
		meta.siteName && meta.siteName.trim().toUpperCase() !== meta.domainTag,
	);

	const handlePress = (e: GestureResponderEvent) => {
		e.stopPropagation();
		if (Platform.OS !== "web") {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
				() => {},
			);
		}
		void WebBrowser.openBrowserAsync(meta.href).catch(() => {
			void Linking.openURL(meta.href).catch(() => {});
		});
	};

	const footerDomainLabel =
		showSiteNameInHeader && meta.siteName
			? `${meta.siteName} · ${meta.domainTag}`
			: meta.domainTag;

	return (
		<View className={`bg-card shadow-neo-sm ${className}`}>
			<Pressable
				accessibilityRole="link"
				accessibilityLabel={`Open ${meta.siteName || meta.categoryTag} link: ${meta.title} (${meta.domainTag})`}
				onPress={handlePress}
				className="overflow-hidden border-2 border-border bg-surface active:opacity-90">
				{bannerUri ? (
					<>
						{/* Full-bleed OG Banner */}
						<View className="relative h-44 w-full bg-secondary">
							<ExpoImage
								source={{ uri: bannerUri }}
								style={{ width: "100%", height: "100%" }}
								contentFit="cover"
								transition={150}
								onError={() => markFailed(bannerUri)}
							/>

							<LinearGradient
								colors={[
									"rgba(0,0,0,0.3)",
									"rgba(0,0,0,0)",
									"rgba(0,0,0,0.78)",
								]}
								locations={[0, 0.45, 1]}
								style={{
									position: "absolute",
									top: 0,
									right: 0,
									bottom: 0,
									left: 0,
								}}
								pointerEvents="none"
							/>

							{/* Top-left Category Stamp */}
							<View className="absolute top-2.5 left-2.5">
								<View
									className={`border border-border px-2 py-0.5 ${visual.badgeBg}`}>
									<Text
										className={`font-bold text-3xs tracking-widest uppercase ${visual.badgeText}`}>
										{meta.categoryTag}
									</Text>
								</View>
							</View>

							{/* Bottom-left Source Stamp */}
							<View className="absolute right-2.5 bottom-2.5 left-2.5 flex-row items-center gap-2">
								<View
									className={`size-6 shrink-0 items-center justify-center overflow-hidden border border-white/40 ${
										currentLogoUri
											? "bg-surface p-0.5"
											: visual.tileBg
									}`}>
									{currentLogoUri ? (
										<ExpoImage
											source={{ uri: currentLogoUri }}
											style={{
												width: "100%",
												height: "100%",
											}}
											contentFit="contain"
											onError={() =>
												markFailed(currentLogoUri)
											}
										/>
									) : (
										<IconComponent
											size={12}
											color={visual.iconColor}
											strokeWidth={2.5}
										/>
									)}
								</View>
								<Text
									numberOfLines={1}
									className="min-w-0 flex-1 font-mono text-2xs tracking-widest text-white uppercase">
									{meta.domainTag}
								</Text>
							</View>
						</View>

						{/* Editorial Body */}
						<View className="border-t-2 border-border bg-surface px-3.5 py-3">
							<Text
								numberOfLines={2}
								className="font-bold text-sm leading-snug text-foreground">
								{meta.title}
							</Text>
							{Boolean(meta.description) && (
								<Text
									numberOfLines={2}
									className="mt-1 font-sans text-xs leading-relaxed text-muted-foreground">
									{meta.description}
								</Text>
							)}
						</View>
					</>
				) : (
					/* Compact Split Tile Preview */
					<View className="flex-row items-stretch bg-surface">
						<View
							className={`w-16 shrink-0 items-center justify-center border-r-2 border-border p-3 ${
								currentLogoUri ? "bg-surface" : visual.tileBg
							}`}>
							{currentLogoUri ? (
								<ExpoImage
									source={{ uri: currentLogoUri }}
									style={{ width: 28, height: 28 }}
									contentFit="contain"
									transition={150}
									onError={() => markFailed(currentLogoUri)}
								/>
							) : (
								<IconComponent
									size={22}
									color={visual.iconColor}
									strokeWidth={2.3}
								/>
							)}
						</View>

						<View className="min-w-0 flex-1 justify-center px-3.5 py-3">
							<Text
								numberOfLines={2}
								className="font-bold text-sm leading-snug text-foreground">
								{meta.title}
							</Text>
							{Boolean(meta.description) && (
								<Text
									numberOfLines={2}
									className="mt-1 font-sans text-xs leading-relaxed text-muted-foreground">
									{meta.description}
								</Text>
							)}
						</View>
					</View>
				)}

				{/* Docked Bottom Link Footer */}
				<View className="flex-row items-center justify-between border-t-2 border-border bg-card px-3 py-2">
					<View className="min-w-0 flex-1 flex-row items-center gap-2 pr-2">
						{!bannerUri && (
							<View
								className={`shrink-0 border border-border px-1.5 py-0.5 ${visual.badgeBg}`}>
								<Text
									className={`font-bold text-3xs tracking-widest uppercase ${visual.badgeText}`}>
									{meta.categoryTag}
								</Text>
							</View>
						)}
						<Text
							numberOfLines={1}
							className="min-w-0 shrink font-mono text-2xs tracking-wider text-muted-foreground uppercase">
							{footerDomainLabel}
						</Text>
					</View>

					<View className="shrink-0 flex-row items-center gap-1">
						<Text className="font-bold text-3xs tracking-widest text-foreground uppercase">
							OPEN
						</Text>
						<ArrowUpRight
							size={13}
							color="#000000"
							strokeWidth={2.5}
						/>
					</View>
				</View>
			</Pressable>
		</View>
	);
}

export interface LinkPreviewListProps {
	text: string;
	hasMedia?: boolean;
	className?: string;
}

export function LinkPreviewList({
	text,
	hasMedia = false,
	className = "",
}: LinkPreviewListProps) {
	const links = useMemo(() => extractLinksFromText(text), [text]);

	if (hasMedia || links.length !== 1) return null;

	return (
		<View className={className}>
			<LinkPreviewCard link={links[0]} />
		</View>
	);
}
