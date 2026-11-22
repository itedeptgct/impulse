import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
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

	const { data: meta } = useQuery({
		queryKey: ["link-preview", link.href],
		queryFn: () => fetchLinkPreviewMetadata(link),
		initialData,
		staleTime: 1000 * 60 * 30,
		gcTime: 1000 * 60 * 60,
		retry: false,
	});

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

	return (
		<Pressable
			accessibilityRole="link"
			accessibilityLabel={`Open ${meta.siteName || meta.categoryTag} link: ${meta.title} (${meta.domainTag})`}
			onPress={handlePress}
			className={`border-2 border-border bg-card shadow-neo-xs active:translate-x-px active:translate-y-px ${className}`}>
			<View className="flex-row items-center justify-between border-b border-border bg-neo-surface-active px-2.5 py-1.5">
				<View className="min-w-0 flex-1 flex-row items-center gap-1.5 pr-2">
					{bannerUri ? (
						<>
							<View
								className={`size-5 shrink-0 items-center justify-center overflow-hidden border border-border ${
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
										size={11}
										color={visual.iconColor}
										strokeWidth={2.5}
									/>
								)}
							</View>
							{showSiteNameInHeader && meta.siteName && (
								<Text
									numberOfLines={1}
									className="shrink-0 font-bold text-[10px] tracking-wider text-foreground uppercase">
									{meta.siteName}
								</Text>
							)}
							<Text
								numberOfLines={1}
								className="min-w-0 shrink font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
								{showSiteNameInHeader
									? `· ${meta.domainTag}`
									: meta.domainTag}
							</Text>
						</>
					) : (
						<>
							<View
								className={`shrink-0 border border-border px-1.5 py-0.5 ${visual.badgeBg}`}>
								<Text
									className={`font-bold text-[10px] tracking-wider uppercase ${visual.badgeText}`}>
									{meta.categoryTag}
								</Text>
							</View>
							<Text
								numberOfLines={1}
								className="min-w-0 shrink font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
								{meta.domainTag}
							</Text>
						</>
					)}
				</View>
				<ArrowUpRight size={13} color="#000000" strokeWidth={2.5} />
			</View>

			{bannerUri ? (
				<>
					<View className="h-36 w-full overflow-hidden border-b-2 border-border bg-secondary">
						<ExpoImage
							source={{ uri: bannerUri }}
							style={{ width: "100%", height: "100%" }}
							contentFit="cover"
							transition={150}
							onError={() => markFailed(bannerUri)}
						/>
					</View>

					<View className="p-3">
						<Text
							numberOfLines={2}
							className="font-bold text-sm leading-snug text-foreground">
							{meta.title}
						</Text>
						{Boolean(meta.description) && (
							<Text
								numberOfLines={2}
								className="mt-1 font-mono text-xs leading-relaxed text-muted-foreground">
								{meta.description}
							</Text>
						)}
					</View>
				</>
			) : (
				<View className="flex-row items-center gap-3 p-3">
					<View
						className={`size-11 shrink-0 items-center justify-center overflow-hidden border-2 border-border ${
							currentLogoUri ? "bg-surface p-1.5" : visual.tileBg
						}`}>
						{currentLogoUri ? (
							<ExpoImage
								source={{ uri: currentLogoUri }}
								style={{ width: "100%", height: "100%" }}
								contentFit="contain"
								transition={150}
								onError={() => markFailed(currentLogoUri)}
							/>
						) : (
							<IconComponent
								size={20}
								color={visual.iconColor}
								strokeWidth={2.3}
							/>
						)}
					</View>

					<View className="min-w-0 flex-1">
						<Text
							numberOfLines={2}
							className="font-bold text-sm leading-snug text-foreground">
							{meta.title}
						</Text>
						<Text
							numberOfLines={2}
							className="mt-0.5 font-mono text-xs leading-relaxed text-muted-foreground">
							{meta.description}
						</Text>
					</View>
				</View>
			)}
		</Pressable>
	);
}

export interface LinkPreviewListProps {
	text: string;
	maxLinks?: number;
	className?: string;
}

export function LinkPreviewList({
	text,
	maxLinks = 3,
	className = "",
}: LinkPreviewListProps) {
	const links = useMemo(
		() => extractLinksFromText(text).slice(0, maxLinks),
		[text, maxLinks],
	);

	if (links.length === 0) return null;

	return (
		<View className={`gap-2.5 ${className}`}>
			{links.map((link) => (
				<LinkPreviewCard key={link.href} link={link} />
			))}
		</View>
	);
}
