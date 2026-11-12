import {
	AlertCircle,
	AlertTriangle,
	CheckCircle,
	Info,
} from "lucide-react-native";
import { BottomSheet, Text } from "panelui-native";
import React from "react";
import { View } from "react-native";

import { NeoButton } from "./NeoButton";

export interface AlertAction {
	label: string;
	onPress: () => void | Promise<void>;
	variant?: "primary" | "destructive" | "outline" | "secondary";
	loading?: boolean;
}

export interface MobileAlertSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	type?: "error" | "warning" | "success" | "info";
	icon?: React.ReactNode;
	actions?: AlertAction[];
	children?: React.ReactNode;
}

export function MobileAlertSheet({
	open,
	onOpenChange,
	title,
	description,
	type = "error",
	icon,
	actions,
	children,
}: MobileAlertSheetProps) {
	const defaultIcon = () => {
		if (icon) return icon;
		switch (type) {
			case "warning":
				return <AlertTriangle size={20} color="#ff2a00" />;
			case "success":
				return <CheckCircle size={20} color="#000000" />;
			case "info":
				return <Info size={20} color="#000000" />;
			case "error":
			default:
				return <AlertCircle size={20} color="#ff2a00" />;
		}
	};

	const iconBgClass = () => {
		switch (type) {
			case "warning":
				return "bg-card border-border";
			case "success":
				return "bg-card border-border";
			case "info":
				return "bg-card border-border";
			case "error":
			default:
				return "bg-card border-border";
		}
	};

	const defaultActions: AlertAction[] =
		actions && actions.length > 0
			? actions
			: [
					{
						label: "Dismiss",
						onPress: () => onOpenChange(false),
						variant: "outline",
					},
				];

	return (
		<BottomSheet open={open} onOpenChange={onOpenChange}>
			<BottomSheet.Content
				size="auto"
				showClose={false}
				showGrabber={true}
				className="rounded-none border-x-2 border-t-2 border-border bg-background p-5 shadow-neo-lg">
				<View className="mb-4 flex-row items-start gap-3">
					<View
						className={`size-10 items-center justify-center rounded-none border-2 ${iconBgClass()} shadow-neo-sm`}>
						{defaultIcon()}
					</View>
					<View className="flex-1 pr-2">
						<Text
							weight="bold"
							className="font-mono text-base tracking-tight text-foreground uppercase">
							{title}
						</Text>
						{description && (
							<Text className="mt-1 font-mono text-xs leading-relaxed text-muted-foreground">
								{description}
							</Text>
						)}
					</View>
				</View>

				{children && <View className="mb-4">{children}</View>}

				<View className="mt-2 flex-col gap-2.5">
					{defaultActions.map((action, index) => {
						return (
							<NeoButton
								key={`${action.label}-${index}`}
								size="lg"
								variant={action.variant || "outline"}
								loading={action.loading}
								onPress={action.onPress}
								className="w-full">
								{action.label}
							</NeoButton>
						);
					})}
				</View>
			</BottomSheet.Content>
		</BottomSheet>
	);
}
