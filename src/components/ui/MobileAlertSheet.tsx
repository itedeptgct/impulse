import {
	AlertCircle,
	AlertTriangle,
	CheckCircle,
	Info,
} from "lucide-react-native";
import { BottomSheet, Button, Text } from "panelui-native";
import React from "react";
import { View } from "react-native";

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
				return <AlertTriangle size={20} color="#fbbf24" />;
			case "success":
				return <CheckCircle size={20} color="#91e6b1" />;
			case "info":
				return <Info size={20} color="#60a5fa" />;
			case "error":
			default:
				return <AlertCircle size={20} color="#ff5c5c" />;
		}
	};

	const iconBgClass = () => {
		switch (type) {
			case "warning":
				return "bg-warning/15 border-warning/40";
			case "success":
				return "bg-primary/15 border-primary/40";
			case "info":
				return "bg-info/15 border-info/40";
			case "error":
			default:
				return "bg-destructive/15 border-destructive/40";
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
				className="rounded-t-2xl border-x-2 border-t-2 border-border bg-card p-5 shadow-neo-lg">
				<View className="mb-4 flex-row items-start gap-3">
					<View
						className={`size-10 items-center justify-center rounded-xl border-2 ${iconBgClass()} shadow-neo-sm`}>
						{defaultIcon()}
					</View>
					<View className="flex-1 pr-2">
						<Text
							weight="bold"
							className="font-mono text-base tracking-tight text-foreground">
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

				{/* Vertically stacked full-width neo action buttons */}
				<View className="mt-2 flex-col gap-2.5">
					{defaultActions.map((action, index) => {
						const isDestructive = action.variant === "destructive";
						const isPrimary = action.variant === "primary";

						return (
							<Button
								key={`${action.label}-${index}`}
								size="lg"
								fullWidth
								variant={
									isPrimary
										? "primary"
										: isDestructive
											? "destructive"
											: "outline"
								}
								loading={action.loading}
								onPress={action.onPress}
								className={`h-12 border-2 active:scale-95 ${
									isPrimary
										? "border-primary bg-primary shadow-neo-sm"
										: isDestructive
											? "border-destructive bg-destructive/15 text-destructive shadow-neo-sm"
											: "border-border bg-secondary text-foreground shadow-neo-sm"
								}`}>
								<Text
									weight="bold"
									className={`font-mono text-sm tracking-wider uppercase ${
										isPrimary
											? "text-primary-foreground"
											: isDestructive
												? "text-destructive"
												: "text-foreground"
									}`}>
									{action.label}
								</Text>
							</Button>
						);
					})}
				</View>
			</BottomSheet.Content>
		</BottomSheet>
	);
}
