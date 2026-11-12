import React from "react";
import {
	type StyleProp,
	Text,
	type TextStyle,
	View,
	type ViewProps,
	type ViewStyle,
} from "react-native";

export type NeoBadgeVariant =
	| "default"
	| "primary"
	| "accent"
	| "outline"
	| "green"
	| "magenta"
	| "cyan";
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
	primary: "bg-primary border-border",
	accent: "bg-accent border-border",
	outline: "bg-transparent border-border",
	green: "bg-neo-green border-border",
	magenta: "bg-neo-magenta border-border",
	cyan: "bg-neo-cyan border-border",
};

const variantTextClasses: Record<NeoBadgeVariant, string> = {
	default: "text-foreground",
	primary: "text-primary-foreground",
	accent: "text-accent-foreground",
	outline: "text-foreground",
	green: "text-foreground",
	magenta: "text-primary-foreground",
	cyan: "text-foreground",
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
		"flex-row items-center justify-center border rounded-none gap-1 self-start select-none",
		variantContainerClasses[variant],
		sizeContainerClasses[size],
		className,
	]
		.filter(Boolean)
		.join(" ");

	const textClasses = [
		"font-bold uppercase tracking-widest",
		variantTextClasses[variant],
		sizeTextClasses[size],
		textClassName,
	]
		.filter(Boolean)
		.join(" ");

	const renderContent = () => {
		if (children == null) return null;

		if (React.isValidElement(children)) {
			return children;
		}

		if (Array.isArray(children)) {
			const isAllElements = children.every(
				(child) => React.isValidElement(child) || child == null,
			);
			if (isAllElements) {
				return children;
			}
		}

		return (
			<Text className={textClasses} style={textStyle}>
				{children}
			</Text>
		);
	};

	const renderAdornment = (content: React.ReactNode) => {
		if (content == null) return null;
		if (typeof content === "string" || typeof content === "number") {
			return (
				<Text className={textClasses} style={textStyle}>
					{content}
				</Text>
			);
		}
		return content;
	};

	return (
		<View ref={ref} className={containerClasses} style={style} {...rest}>
			{renderAdornment(startContent)}
			{renderContent()}
			{renderAdornment(endContent)}
		</View>
	);
});

NeoBadge.displayName = "NeoBadge";
