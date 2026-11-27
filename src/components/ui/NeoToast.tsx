import * as Haptics from "expo-haptics";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react-native";
import { useEffect } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Animated, {
	FadeInUp,
	FadeOutUp,
	LinearTransition,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type ToastItem, type ToastVariant, useToastStore } from "@/lib/toast";

const VARIANT_META: Record<
	ToastVariant,
	{ accentClass: string; iconColor: string; defaultLabel: string }
> = {
	success: {
		accentClass: "bg-neo-green",
		iconColor: "#000000",
		defaultLabel: "OK",
	},
	error: {
		accentClass: "bg-destructive",
		iconColor: "#ff2a00",
		defaultLabel: "ERROR",
	},
	info: {
		accentClass: "bg-neo-yellow",
		iconColor: "#000000",
		defaultLabel: "INFO",
	},
};

function ToastRow({
	item,
	onDismiss,
}: {
	item: ToastItem;
	onDismiss: (id: string) => void;
}) {
	const meta = VARIANT_META[item.variant];

	useEffect(() => {
		if (Platform.OS === "web") return;
		if (item.variant === "success") {
			void Haptics.notificationAsync(
				Haptics.NotificationFeedbackType.Success,
			).catch(() => {});
		} else if (item.variant === "error") {
			void Haptics.notificationAsync(
				Haptics.NotificationFeedbackType.Error,
			).catch(() => {});
		} else {
			void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
				() => {},
			);
		}
	}, [item.id, item.variant]);

	const Icon =
		item.variant === "success"
			? CheckCircle2
			: item.variant === "error"
				? AlertCircle
				: Info;

	return (
		<Animated.View
			entering={FadeInUp.duration(180)}
			exiting={FadeOutUp.duration(150)}
			layout={LinearTransition.duration(150)}
			className="mb-2">
			<Pressable
				accessibilityRole="alert"
				accessibilityLabel={`${item.title ?? meta.defaultLabel}: ${item.message}`}
				onPress={() => onDismiss(item.id)}
				className="flex-row items-stretch rounded-none border-2 border-border bg-surface shadow-neo-sm active:translate-x-px active:translate-y-px">
				<View className={`w-1.5 ${meta.accentClass}`} />
				<View className="flex-1 flex-row items-center gap-2.5 px-3 py-2.5">
					<Icon size={16} color={meta.iconColor} strokeWidth={2.5} />
					<View className="min-w-0 flex-1">
						{item.title ? (
							<Text
								numberOfLines={1}
								className="font-bold text-2xs tracking-wider text-foreground uppercase">
								{item.title}
							</Text>
						) : null}
						<Text
							numberOfLines={2}
							className="font-mono text-xs leading-snug text-foreground">
							{item.message}
						</Text>
					</View>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Dismiss notification"
						hitSlop={8}
						onPress={(e) => {
							e.stopPropagation();
							onDismiss(item.id);
						}}
						className="border border-border bg-card p-1">
						<X size={12} color="#000000" strokeWidth={2.5} />
					</Pressable>
				</View>
			</Pressable>
		</Animated.View>
	);
}

export function NeoToastViewport() {
	const insets = useSafeAreaInsets();
	const toasts = useToastStore((s) => s.toasts);
	const dismiss = useToastStore((s) => s.dismiss);

	if (toasts.length === 0) {
		return null;
	}

	return (
		<View
			pointerEvents="box-none"
			style={{
				position: "absolute",
				top: insets.top + 8,
				left: 16,
				right: 16,
				zIndex: 9999,
				elevation: 9999,
			}}>
			{toasts.map((item) => (
				<ToastRow key={item.id} item={item} onDismiss={dismiss} />
			))}
		</View>
	);
}
