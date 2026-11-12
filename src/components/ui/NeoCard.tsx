import * as Haptics from "expo-haptics";
import React from "react";
import {
	GestureResponderEvent,
	Platform,
	Pressable,
	type PressableProps,
	type StyleProp,
	View,
	type ViewProps,
	type ViewStyle,
} from "react-native";

export type NeoCardVariant = "default" | "raised" | "accent";

export interface NeoCardProps extends Omit<ViewProps, "style"> {
	variant?: NeoCardVariant;
	onPress?: PressableProps["onPress"];
	disabled?: boolean;
	children?: React.ReactNode;
	className?: string;
	style?: StyleProp<ViewStyle>;
	pressableProps?: Omit<
		PressableProps,
		"onPress" | "disabled" | "children" | "className" | "style"
	>;
}

export interface NeoCardHeaderProps extends ViewProps {
	className?: string;
	children?: React.ReactNode;
}

export function NeoCardHeader({
	className = "",
	children,
	...props
}: NeoCardHeaderProps) {
	return (
		<View
			className={`mb-3 flex-row items-center justify-between border-b border-border pb-2 ${className}`}
			{...props}>
			{children}
		</View>
	);
}

const variantClasses: Record<NeoCardVariant, string> = {
	default: "bg-card border-border",
	raised: "bg-secondary border-border",
	accent: "bg-card border-border",
};

interface NeoCardComponent extends React.ForwardRefExoticComponent<
	NeoCardProps & React.RefAttributes<View>
> {
	Header: typeof NeoCardHeader;
}

export const NeoCard = React.forwardRef(function NeoCard(
	{
		variant = "default",
		onPress,
		disabled = false,
		children,
		className = "",
		style,
		pressableProps,
		...rest
	}: NeoCardProps,
	ref: React.ForwardedRef<View>,
) {
	const baseClasses = [
		"border-2 border-border rounded-none shadow-neo p-4",
		variantClasses[variant],
		className,
	]
		.filter(Boolean)
		.join(" ");

	if (onPress) {
		const handlePress = (e: GestureResponderEvent) => {
			if (disabled) return;
			if (Platform.OS !== "web") {
				Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
					() => {},
				);
			}
			onPress(e);
		};

		const interactiveClasses = [
			baseClasses,
			"active:translate-x-0.5 active:translate-y-0.5 active:shadow-none select-none",
			disabled ? "opacity-50 pointer-events-none" : "",
		]
			.filter(Boolean)
			.join(" ");

		return (
			<Pressable
				ref={ref}
				disabled={disabled}
				onPress={handlePress}
				className={interactiveClasses}
				style={style}
				accessibilityRole="button"
				accessibilityState={{ disabled }}
				{...pressableProps}
				{...rest}>
				{children}
			</Pressable>
		);
	}

	return (
		<View ref={ref} className={baseClasses} style={style} {...rest}>
			{children}
		</View>
	);
}) as unknown as NeoCardComponent;

NeoCard.Header = NeoCardHeader;
NeoCard.displayName = "NeoCard";
