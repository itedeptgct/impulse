import * as Haptics from "expo-haptics";
import React from "react";
import {
	ActivityIndicator,
	GestureResponderEvent,
	Platform,
	Pressable,
	type PressableProps,
	Text,
	type TextStyle,
	View,
} from "react-native";

export type NeoButtonVariant =
	| "primary"
	| "secondary"
	| "outline"
	| "destructive";
export type NeoButtonSize = "sm" | "md" | "lg";

export interface NeoButtonProps extends Omit<PressableProps, "children"> {
	variant?: NeoButtonVariant;
	size?: NeoButtonSize;
	loading?: boolean;
	disabled?: boolean;
	startContent?: React.ReactNode;
	endContent?: React.ReactNode;
	children?: React.ReactNode;
	className?: string;
	textClassName?: string;
	textStyle?: TextStyle;
}

const variantContainerClasses: Record<NeoButtonVariant, string> = {
	primary: "bg-primary border-primary",
	secondary: "bg-secondary border-border",
	outline: "bg-card border-border",
	destructive: "bg-destructive border-destructive",
};

const variantTextClasses: Record<NeoButtonVariant, string> = {
	primary: "text-primary-foreground",
	secondary: "text-foreground",
	outline: "text-foreground",
	destructive: "text-destructive-foreground",
};

const variantIndicatorColor: Record<NeoButtonVariant, string> = {
	primary: "#0a0a0c",
	secondary: "#ffffff",
	outline: "#ffffff",
	destructive: "#ffffff",
};

const sizeContainerClasses: Record<NeoButtonSize, string> = {
	sm: "h-9 px-3 shadow-neo-sm",
	md: "h-11 px-4 shadow-neo",
	lg: "h-13 px-6 shadow-neo",
};

const sizeTextClasses: Record<NeoButtonSize, string> = {
	sm: "text-xs",
	md: "text-sm",
	lg: "text-base",
};

export const NeoButton = React.forwardRef(function NeoButton(
	{
		variant = "primary",
		size = "md",
		loading = false,
		disabled = false,
		startContent,
		endContent,
		children,
		className = "",
		textClassName = "",
		textStyle,
		onPress,
		...rest
	}: NeoButtonProps,
	ref: React.ForwardedRef<View>,
) {
	const isDisabled = disabled || loading;

	const handlePress = (e: GestureResponderEvent) => {
		if (isDisabled) return;
		if (Platform.OS !== "web") {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
				() => {},
			);
		}
		onPress?.(e);
	};

	const containerClasses = [
		"flex-row items-center justify-center border-2 rounded-sm gap-2 select-none",
		"active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
		variantContainerClasses[variant],
		sizeContainerClasses[size],
		isDisabled ? "opacity-50 pointer-events-none" : "",
		className,
	]
		.filter(Boolean)
		.join(" ");

	const textClasses = [
		"font-display uppercase tracking-wider text-center",
		variantTextClasses[variant],
		sizeTextClasses[size],
		textClassName,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<Pressable
			ref={ref}
			disabled={isDisabled}
			onPress={handlePress}
			className={containerClasses}
			accessibilityRole="button"
			accessibilityState={{ disabled: isDisabled, busy: loading }}
			{...rest}>
			{loading ? (
				<ActivityIndicator
					size={size === "sm" ? 14 : 18}
					color={variantIndicatorColor[variant]}
				/>
			) : (
				startContent
			)}

			{typeof children === "string" || typeof children === "number" ? (
				<Text className={textClasses} style={textStyle}>
					{children}
				</Text>
			) : (
				children
			)}

			{!loading && endContent}
		</Pressable>
	);
});

NeoButton.displayName = "NeoButton";
