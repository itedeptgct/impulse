export interface ActiveMention {
	query: string;
	startIndex: number;
	endIndex: number;
}

const ACTIVE_MENTION_REGEX = /(?:^|[\s(])@([a-zA-Z0-9_]{0,24})$/;

export function extractActiveMention(
	text: string,
	cursorIndex?: number,
): ActiveMention | null {
	if (!text) return null;
	const endIndex =
		typeof cursorIndex === "number" &&
		cursorIndex >= 0 &&
		cursorIndex <= text.length
			? cursorIndex
			: text.length;
	const beforeCursor = text.slice(0, endIndex);
	const match = ACTIVE_MENTION_REGEX.exec(beforeCursor);
	if (!match) return null;
	const query = match[1] ?? "";
	const atIndex = beforeCursor.length - query.length - 1;
	if (atIndex < 0 || beforeCursor[atIndex] !== "@") return null;
	return { query, startIndex: atIndex, endIndex };
}

export function insertMention(
	text: string,
	username: string,
	cursorIndex?: number,
): string {
	const active = extractActiveMention(text, cursorIndex);
	const clean = username.trim().replace(/^@+/, "");
	if (!active || !clean) return text;
	const before = text.slice(0, active.startIndex);
	const after = text.slice(active.endIndex);
	const needsSpace = after.length === 0 || !/^\s/.test(after);
	return `${before}@${clean}${needsSpace ? " " : ""}${after}`;
}
