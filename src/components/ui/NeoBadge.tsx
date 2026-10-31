import React from "react";
import {
	type StyleProp,
	Text,
	type TextStyle,
	View,
	type ViewProps,
	type ViewStyle,
} from "react-native";

export type NeoBadgeVariant = "default" | "primary" | "accent" | "outline";
export type NeoBadgeSize = "sm" | "md";

export interface NeoBadgeProps extends Omit<ViewProps, "style"> {
	variant?: NeoBadgeVariant;
	size?: NeoBadgeSize;
	startContent?: React.ReactNode;
	endContent?: React.ReactNode;
	children?: React.ReactNode;
	className?: string;
	textClassName?: string;
	style?: StyleProp<ViewStyle>;
	textStyle?: StyleProp<TextStyle>;
}

const variantContainerClasses: Record<NeoBadgeVariant, string> = {
	default: "bg-secondary border-border",
	primary: "bg-primary/15 border-primary",
	accent: "bg-accent border-accent",
	outline: "bg-transparent border-border",
};

const variantTextClasses: Record<NeoBadgeVariant, string> = {
	default: "text-muted-foreground",
	primary: "text-primary",
	accent: "text-accent-foreground",
	outline: "text-foreground",
};

const sizeContainerClasses: Record<NeoBadgeSize, string> = {
	sm: "px-1.5 py-0.5",
	md: "px-2 py-0.5",
};

const sizeTextClasses: Record<NeoBadgeSize, string> = {
	sm: "text-[10px]",
	md: "text-xs",
};

export const NeoBadge = React.forwardRef(function NeoBadge(
	{
		variant = "default",
		size = "md",
		startContent,
		endContent,
		children,
		className = "",
		textClassName = "",
		style,
		textStyle,
		...rest
	}: NeoBadgeProps,
	ref: React.ForwardedRef<View>,
) {
	const containerClasses = [
		"flex-row items-center justify-center border-2 rounded-sm gap-1 self-start select-none",
		variantContainerClasses[variant],
		sizeContainerClasses[size],
		className,
	]
		.filter(Boolean)
		.join(" ");

	const textClasses = [
		"font-mono uppercase tracking-wider",
		variantTextClasses[variant],
		sizeTextClasses[size],
		textClassName,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<View ref={ref} className={containerClasses} style={style} {...rest}>
			{startContent}
			{typeof children === "string" || typeof children === "number" ? (
				<Text className={textClasses} style={textStyle}>
					{children}
				</Text>
			) : (
				children
			)}
			{endContent}
		</View>
	);
});

NeoBadge.displayName = "NeoBadge";
