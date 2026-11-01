import { BottomSheet, Text } from "panelui-native";
import React from "react";

export interface MobileSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title?: string;
	subtitle?: string;
	children: React.ReactNode;
	size?: "auto" | "half" | "full";
	showClose?: boolean;
	className?: string;
}

export function MobileSheet({
	open,
	onOpenChange,
	title,
	subtitle,
	children,
	size = "auto",
	showClose = true,
	className,
}: MobileSheetProps) {
	return (
		<BottomSheet open={open} onOpenChange={onOpenChange}>
			<BottomSheet.Content
				size={size}
				showClose={showClose}
				showGrabber={true}
				className={`rounded-t-2xl border-x-2 border-t-2 border-border bg-card px-4 pt-1 shadow-neo-lg ${
					className || ""
				}`}>
				{(title || subtitle) && (
					<BottomSheet.Header className="mb-3 border-b-2 border-border pb-3">
						{title && (
							<Text
								weight="bold"
								className="font-display text-lg text-foreground">
								{title}
							</Text>
						)}
						{subtitle && (
							<Text className="mt-0.5 font-display text-xs text-muted-foreground">
								{subtitle}
							</Text>
						)}
					</BottomSheet.Header>
				)}
				{children}
			</BottomSheet.Content>
		</BottomSheet>
	);
}

MobileSheet.Body = BottomSheet.Body;
MobileSheet.Footer = BottomSheet.Footer;
