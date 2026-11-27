import {
	formatCompactInlineLink,
	normalizeHref,
	splitUrlTrailingPunctuation,
	stripStandaloneLinkLines,
} from "@/lib/link-preview";

export const FEED_POST_MAX_LINES = 5;
const DEFAULT_CHARS_PER_LINE = 36;
const DEFAULT_MAX_CHARS = FEED_POST_MAX_LINES * DEFAULT_CHARS_PER_LINE;
const INLINE_URL_REGEX = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;

function compactUrlsForLengthCheck(text: string): string {
	return text.replace(INLINE_URL_REGEX, (rawMatch) => {
		const { url, trailing } = splitUrlTrailingPunctuation(rawMatch);
		const href = url ? normalizeHref(url) : null;
		if (!href) return rawMatch;
		return `${formatCompactInlineLink(href)}${trailing}`;
	});
}

export function isLongPostContent(
	content: string,
	options?: {
		maxLines?: number;
		maxChars?: number;
		charsPerLine?: number;
		hideStandaloneUrls?: boolean;
		compactInlineLinks?: boolean;
	},
): boolean {
	if (!content) return false;
	let processed = options?.hideStandaloneUrls
		? stripStandaloneLinkLines(content)
		: content;
	if (options?.compactInlineLinks) {
		processed = compactUrlsForLengthCheck(processed);
	}
	const trimmed = processed.trim();
	if (!trimmed) return false;

	const maxLines = options?.maxLines ?? FEED_POST_MAX_LINES;
	const charsPerLine = options?.charsPerLine ?? DEFAULT_CHARS_PER_LINE;
	const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS;

	if (trimmed.length > maxChars) return true;

	const lines = trimmed.split(/\r?\n/);
	if (lines.length > maxLines) return true;

	let estimatedVisualLines = 0;
	for (const line of lines) {
		estimatedVisualLines += Math.max(
			1,
			Math.ceil(line.length / charsPerLine),
		);
		if (estimatedVisualLines > maxLines) {
			return true;
		}
	}

	return false;
}
