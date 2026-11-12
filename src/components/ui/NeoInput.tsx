import React, { useState } from "react";
import { Text, TextInput, type TextInputProps, View } from "react-native";

export interface NeoInputProps extends TextInputProps {
	label?: string;
	helperText?: string;
	error?: string;
	startContent?: React.ReactNode;
	endContent?: React.ReactNode;
	containerClassName?: string;
	inputWrapperClassName?: string;
	labelClassName?: string;
	helperClassName?: string;
	errorClassName?: string;
}

export const NeoInput = React.forwardRef(function NeoInput(
	{
		label,
		helperText,
		error,
		startContent,
		endContent,
		containerClassName = "",
		inputWrapperClassName = "",
		labelClassName = "",
		helperClassName = "",
		errorClassName = "",
		className = "",
		placeholderTextColor = "rgba(0, 0, 0, 0.4)",
		onFocus,
		onBlur,
		editable = true,
		...rest
	}: NeoInputProps,
	ref: React.ForwardedRef<TextInput>,
) {
	const [isFocused, setIsFocused] = useState(false);

	const handleFocus: TextInputProps["onFocus"] = (e) => {
		setIsFocused(true);
		onFocus?.(e);
	};

	const handleBlur: TextInputProps["onBlur"] = (e) => {
		setIsFocused(false);
		onBlur?.(e);
	};

	const hasError = Boolean(error);

	const getBorderAndShadowClass = () => {
		if (hasError) {
			return isFocused
				? "border-destructive shadow-neo-sm"
				: "border-destructive";
		}
		if (isFocused) {
			return "border-border shadow-neo-sm";
		}
		return "border-border";
	};

	const wrapperClasses = [
		"flex-row items-center bg-card border-2 rounded-none px-3",
		getBorderAndShadowClass(),
		!editable ? "opacity-50" : "",
		inputWrapperClassName,
	]
		.filter(Boolean)
		.join(" ");

	const textInputClasses = [
		"flex-1 py-2 font-mono text-sm text-foreground",
		className,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<View className={`w-full ${containerClassName}`}>
			{label ? (
				<Text
					className={`mb-1.5 font-bold text-xs tracking-wider text-muted-foreground uppercase ${labelClassName}`}>
					{label}
				</Text>
			) : null}

			<View className={wrapperClasses}>
				{startContent ? (
					<View className="mr-2 items-center justify-center">
						{startContent}
					</View>
				) : null}

				<TextInput
					ref={ref}
					editable={editable}
					onFocus={handleFocus}
					onBlur={handleBlur}
					placeholderTextColor={placeholderTextColor}
					className={textInputClasses}
					{...rest}
				/>

				{endContent ? (
					<View className="ml-2 items-center justify-center">
						{endContent}
					</View>
				) : null}
			</View>

			{hasError ? (
				<Text
					className={`mt-1 font-bold text-xs text-destructive ${errorClassName}`}>
					{error}
				</Text>
			) : helperText ? (
				<Text
					className={`mt-1 font-mono text-xs text-muted-foreground ${helperClassName}`}>
					{helperText}
				</Text>
			) : null}
		</View>
	);
});

NeoInput.displayName = "NeoInput";
