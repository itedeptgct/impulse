import * as WebBrowser from "expo-web-browser";
import React, { useMemo } from "react";
import { Linking, Text, type TextProps } from "react-native";

import {
	formatCompactInlineLink,
	normalizeHref,
	splitUrlTrailingPunctuation,
	stripStandaloneLinkLines,
} from "@/lib/link-preview";

export interface LinkifiedTextProps extends Omit<TextProps, "children"> {
	children: string;
	linkClassName?: string;
	hideStandaloneUrls?: boolean;
	compactInlineLinks?: boolean;
}

const URL_REGEX = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;

interface TextSegment {
	type: "text" | "link";
	value: string;
	href?: string;
}

function parseSegments(text: string): TextSegment[] {
	if (!text) return [];

	const segments: TextSegment[] = [];
	let lastIndex = 0;

	for (const match of text.matchAll(URL_REGEX)) {
		const rawMatch = match[0];
		const matchIndex = match.index ?? 0;

		if (matchIndex > lastIndex) {
			segments.push({
				type: "text",
				value: text.slice(lastIndex, matchIndex),
			});
		}

		const { url, trailing } = splitUrlTrailingPunctuation(rawMatch);
		const href = url ? normalizeHref(url) : null;

		if (href) {
			segments.push({
				type: "link",
				value: url,
				href,
			});
			if (trailing) {
				segments.push({
					type: "text",
					value: trailing,
				});
			}
		} else {
			segments.push({
				type: "text",
				value: rawMatch,
			});
		}

		lastIndex = matchIndex + rawMatch.length;
	}

	if (lastIndex < text.length) {
		segments.push({
			type: "text",
			value: text.slice(lastIndex),
		});
	}

	return segments;
}

export function LinkifiedText({
	children,
	linkClassName,
	hideStandaloneUrls = false,
	compactInlineLinks = false,
	...textProps
}: LinkifiedTextProps) {
	const processedText = useMemo(
		() =>
			hideStandaloneUrls ? stripStandaloneLinkLines(children) : children,
		[children, hideStandaloneUrls],
	);

	const segments = useMemo(
		() => parseSegments(processedText),
		[processedText],
	);

	if (!processedText) {
		return null;
	}

	const resolvedLinkClass =
		linkClassName ??
		(compactInlineLinks
			? "font-bold text-foreground underline"
			: "text-accent underline");

	return (
		<Text {...textProps}>
			{segments.map((segment, index) => {
				if (segment.type === "link" && segment.href) {
					const href = segment.href;
					const label = compactInlineLinks
						? formatCompactInlineLink(href)
						: segment.value;
					return (
						<Text
							key={`${index}-${href}`}
							accessibilityRole="link"
							onPress={(e) => {
								e.stopPropagation();
								void WebBrowser.openBrowserAsync(href).catch(
									() => {
										void Linking.openURL(href).catch(
											() => {},
										);
									},
								);
							}}
							className={resolvedLinkClass}>
							{label}
						</Text>
					);
				}

				return (
					<React.Fragment key={index}>{segment.value}</React.Fragment>
				);
			})}
		</Text>
	);
}
