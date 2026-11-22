import React, { useMemo } from "react";
import { Linking, Text, type TextProps } from "react-native";

export interface LinkifiedTextProps extends Omit<TextProps, "children"> {
	children: string;
	linkClassName?: string;
}

const URL_REGEX = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
const TRAILING_PUNCTUATION = /[.,!?;:'"\]]+$/;

interface TextSegment {
	type: "text" | "link";
	value: string;
	href?: string;
}

function normalizeHref(rawUrl: string): string | null {
	const candidate = /^https?:\/\//i.test(rawUrl)
		? rawUrl
		: `https://${rawUrl}`;
	try {
		const parsed = new URL(candidate);
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
			return null;
		}
		return parsed.toString();
	} catch {
		return null;
	}
}

function splitUrlTrailingPunctuation(raw: string): {
	url: string;
	trailing: string;
} {
	let url = raw;
	let trailing = "";

	while (url.length > 0) {
		const punctMatch = url.match(TRAILING_PUNCTUATION);
		if (punctMatch) {
			trailing = punctMatch[0] + trailing;
			url = url.slice(0, -punctMatch[0].length);
			continue;
		}
		if (url.endsWith(")")) {
			const openCount = (url.match(/\(/g) || []).length;
			const closeCount = (url.match(/\)/g) || []).length;
			if (closeCount > openCount) {
				trailing = ")" + trailing;
				url = url.slice(0, -1);
				continue;
			}
		}
		break;
	}

	return { url, trailing };
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
	linkClassName = "text-accent underline",
	...textProps
}: LinkifiedTextProps) {
	const segments = useMemo(() => parseSegments(children), [children]);

	return (
		<Text {...textProps}>
			{segments.map((segment, index) => {
				if (segment.type === "link" && segment.href) {
					const href = segment.href;
					return (
						<Text
							key={`${index}-${href}`}
							accessibilityRole="link"
							onPress={(e) => {
								e.stopPropagation();
								void Linking.openURL(href).catch(() => {});
							}}
							className={linkClassName}>
							{segment.value}
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
