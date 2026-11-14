import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";

import { highlightCode, normalizeLanguage } from "@/lib/syntax-highlighter";

export interface TerminalCodeViewportProps {
	code: string;
	language?: string | null;
	className?: string;
	showLineNumbers?: boolean;
	title?: string;
}

export const TerminalCodeViewport: React.FC<TerminalCodeViewportProps> = ({
	code,
	language,
	className = "",
	showLineNumbers = true,
	title,
}) => {
	const trimmedCode = code?.trimEnd() ?? "";
	const normalizedLang = normalizeLanguage(language);
	const displayLang = (language || "TERMINAL").toUpperCase();

	const lines = useMemo(
		() => highlightCode(trimmedCode, normalizedLang),
		[trimmedCode, normalizedLang],
	);

	if (!trimmedCode) return null;

	const padLength = Math.max(2, String(lines.length).length);

	return (
		<View
			className={`overflow-hidden border-2 border-border bg-primary ${className}`}>
			{/* Terminal Header Bar */}
			<View className="flex-row items-center justify-between border-b border-primary-foreground/15 bg-primary-container px-3 py-1.5">
				<Text className="font-bold text-2xs tracking-wider text-neo-green uppercase">
					{title ?? `> CODE EDITOR // SAVED`}
				</Text>
				<Text className="font-mono text-2xs text-on-primary-container uppercase">
					[{displayLang}]
				</Text>
			</View>

			{/* Monospace Code Body */}
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={{ padding: 12 }}>
				<View className="flex-col">
					{lines.map((line) => (
						<View
							key={line.lineNumber}
							className="flex-row items-start">
							{showLineNumbers && (
								<Text
									className="mr-3 font-code text-xs text-on-primary-container select-none"
									style={{
										minWidth: padLength * 8 + 4,
										textAlign: "right",
									}}>
									{String(line.lineNumber).padStart(
										padLength,
										"0",
									)}
								</Text>
							)}
							<Text className="font-code text-xs leading-relaxed select-text">
								{line.tokens.length > 0 ? (
									line.tokens.map((token, tIdx) => (
										<Text
											key={tIdx}
											style={{
												color: token.color,
											}}>
											{token.content}
										</Text>
									))
								) : (
									<Text> </Text>
								)}
							</Text>
						</View>
					))}
				</View>
			</ScrollView>
		</View>
	);
};
