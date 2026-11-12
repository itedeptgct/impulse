import { describe, expect, test } from "bun:test";

import {
	getFileExtension,
	highlightCode,
	INVERTED_PALETTE_COLORS,
} from "@/lib/syntax-highlighter";

describe("TerminalCodeViewport logic", () => {
	test("formats file extension and language tag properly", () => {
		const rawLanguages = [
			"RUST",
			"TS",
			"py",
			"SQL",
			"JAVA",
			"c",
			null,
			undefined,
		];
		const expectedExts = ["rs", "ts", "py", "sql", "java", "c", "sh", "sh"];
		const expectedTags = [
			"RUST",
			"TS",
			"PY",
			"SQL",
			"JAVA",
			"C",
			"TERMINAL",
			"TERMINAL",
		];

		rawLanguages.forEach((lang, idx) => {
			const ext = getFileExtension(lang);
			const tag = (lang || "TERMINAL").toUpperCase();
			expect(ext).toBe(expectedExts[idx]);
			expect(tag).toBe(expectedTags[idx]);
		});
	});

	test("calculates line numbers padding length dynamically", () => {
		const code10Lines = Array.from(
			{ length: 10 },
			(_, i) => `line ${i + 1}`,
		).join("\n");
		const lines10 = highlightCode(code10Lines, "plaintext");
		const padLength10 = Math.max(2, String(lines10.length).length);
		expect(padLength10).toBe(2);

		const code120Lines = Array.from(
			{ length: 120 },
			(_, i) => `line ${i + 1}`,
		).join("\n");
		const lines120 = highlightCode(code120Lines, "plaintext");
		const padLength120 = Math.max(2, String(lines120.length).length);
		expect(padLength120).toBe(3);
	});

	test("ensures all token types map to design token inverted palette colors", () => {
		const types = [
			"keyword",
			"string",
			"number",
			"boolean",
			"comment",
			"type",
			"function",
			"operator",
			"punctuation",
			"plain",
		] as const;

		for (const t of types) {
			expect(INVERTED_PALETTE_COLORS[t]).toBeDefined();
			expect(typeof INVERTED_PALETTE_COLORS[t]).toBe("string");
			expect(INVERTED_PALETTE_COLORS[t].startsWith("#")).toBe(true);
		}
	});
});
