import { X } from "lucide-react-native";
import { BottomSheet, Text } from "panelui-native";
import React from "react";
import {
	Modal,
	Platform,
	Pressable,
	ScrollView,
	View,
	useWindowDimensions,
} from "react-native";

export interface MobileSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title?: string;
	subtitle?: string;
	children: React.ReactNode;
	size?: "auto" | "half" | "full";
	showClose?: boolean;
	className?: string;
	desktopCompact?: boolean;
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
	desktopCompact = false,
}: MobileSheetProps) {
	const { width, height } = useWindowDimensions();
	const useDesktopModal =
		desktopCompact && Platform.OS === "web" && width >= 1024;

	if (useDesktopModal) {
		return (
			<Modal
				visible={open}
				transparent
				animationType="fade"
				presentationStyle="overFullScreen"
				onRequestClose={() => onOpenChange(false)}>
				<View className="flex-1 items-center justify-center bg-black/45 p-6">
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Close dialog"
						className="absolute inset-0"
						onPress={() => onOpenChange(false)}
					/>
					<View
						style={{
							width: "100%",
							maxWidth: 720,
							maxHeight: Math.min(height * 0.88, 760),
						}}
						className={`overflow-hidden border-2 border-border bg-background shadow-neo-lg ${
							className || ""
						}`}>
						{(title || subtitle) && (
							<View className="flex-row items-start justify-between gap-4 border-b-2 border-border bg-card p-4">
								<View className="min-w-0 flex-1">
									{title && (
										<Text
											weight="bold"
											className="font-display text-lg tracking-wider text-foreground uppercase">
											{title}
										</Text>
									)}
									{subtitle && (
										<Text className="mt-0.5 font-mono text-xs text-muted-foreground">
											{subtitle}
										</Text>
									)}
								</View>
								{showClose && (
									<Pressable
										accessibilityRole="button"
										accessibilityLabel="Close dialog"
										hitSlop={6}
										onPress={() => onOpenChange(false)}
										className="size-9 shrink-0 items-center justify-center border-2 border-border bg-background shadow-neo-xs">
										<X
											size={16}
											color="#000000"
											strokeWidth={2.5}
										/>
									</Pressable>
								)}
							</View>
						)}
						<ScrollView
							style={{ flexShrink: 1 }}
							contentContainerStyle={{
								paddingHorizontal: 16,
								paddingBottom: 16,
							}}
							keyboardShouldPersistTaps="handled">
							{children}
						</ScrollView>
					</View>
				</View>
			</Modal>
		);
	}

	return (
		<BottomSheet open={open} onOpenChange={onOpenChange}>
			<BottomSheet.Content
				size={size}
				showClose={showClose}
				showGrabber={true}
				className={`rounded-none border-x-2 border-t-2 border-border bg-background px-4 pt-1 shadow-neo-lg ${
					className || ""
				}`}>
				{(title || subtitle) && (
					<BottomSheet.Header className="mb-3 border-b-2 border-border pb-3">
						{title && (
							<Text
								weight="bold"
								className="font-display text-lg tracking-wider text-foreground uppercase">
								{title}
							</Text>
						)}
						{subtitle && (
							<Text className="mt-0.5 font-mono text-xs text-muted-foreground">
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
