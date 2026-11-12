/**
 * Syntax Highlighter with Design Token Inverted Palette
 *
 * Implements tokenization and syntax highlighting for Radical Monospace Brutalism.
 * Uses tokens from DESIGN.md:
 * - signal-magenta (#FF007A): keywords
 * - signal-green (#00FF66): strings & template literals
 * - signal-cyan (#00E5FF): numbers, booleans, functions
 * - signal-vermilion (#FF2A00): types & definitions
 * - on-primary-container (#848484): comments, line numbers, punctuation
 * - inverse-primary (#C6C6C6): operators
 * - inverse-on-surface (#F1F1ED) / paper-canvas (#FAF9F5): plain text & identifiers
 */

export type TokenType =
	| "keyword"
	| "string"
	| "number"
	| "boolean"
	| "comment"
	| "type"
	| "function"
	| "operator"
	| "punctuation"
	| "plain";

export interface CodeToken {
	type: TokenType;
	content: string;
	color: string;
	bold?: boolean;
}

export interface HighlightedLine {
	lineNumber: number;
	tokens: CodeToken[];
}

export const INVERTED_PALETTE_COLORS: Record<TokenType, string> = {
	keyword: "#ff007a", // signal-magenta
	string: "#00ff66", // signal-green
	number: "#00e5ff", // signal-cyan
	boolean: "#00e5ff", // signal-cyan
	comment: "#848484", // on-primary-container
	type: "#ff2a00", // signal-vermilion
	function: "#faf9f5", // bold paper-canvas
	operator: "#c6c6c6", // inverse-primary
	punctuation: "#848484", // on-primary-container
	plain: "#f1f1ed", // inverse-on-surface
};

export function normalizeLanguage(lang?: string | null): string {
	if (!lang) return "plaintext";
	const lower = lang.trim().toLowerCase();
	switch (lower) {
		case "ts":
		case "typescript":
		case "tsx":
			return "typescript";
		case "js":
		case "javascript":
		case "jsx":
			return "javascript";
		case "py":
		case "python":
			return "python";
		case "rs":
		case "rust":
			return "rust";
		case "c":
			return "c";
		case "cpp":
		case "c++":
			return "cpp";
		case "java":
			return "java";
		case "sql":
			return "sql";
		case "sh":
		case "bash":
		case "shell":
		case "zsh":
			return "bash";
		case "json":
			return "json";
		default:
			return lower;
	}
}

export function getFileExtension(lang?: string | null): string {
	const normalized = normalizeLanguage(lang);
	switch (normalized) {
		case "rust":
			return "rs";
		case "typescript":
			return "ts";
		case "javascript":
			return "js";
		case "python":
			return "py";
		case "c":
			return "c";
		case "cpp":
			return "cpp";
		case "java":
			return "java";
		case "sql":
			return "sql";
		case "bash":
			return "sh";
		case "json":
			return "json";
		default:
			return "sh";
	}
}

interface LanguageRules {
	keywords: Set<string>;
	types: Set<string>;
	booleans: Set<string>;
	lineComment: string[];
}

const COMMON_KEYWORDS = new Set([
	"as",
	"async",
	"await",
	"break",
	"case",
	"catch",
	"class",
	"const",
	"continue",
	"debugger",
	"default",
	"delete",
	"do",
	"else",
	"export",
	"extends",
	"finally",
	"for",
	"from",
	"function",
	"if",
	"import",
	"in",
	"instanceof",
	"let",
	"new",
	"of",
	"return",
	"super",
	"switch",
	"this",
	"throw",
	"try",
	"typeof",
	"var",
	"void",
	"while",
	"with",
	"yield",
]);

const TS_TYPES = new Set([
	"any",
	"boolean",
	"never",
	"number",
	"object",
	"string",
	"symbol",
	"unknown",
	"void",
	"Promise",
	"Record",
	"Array",
]);

const RUST_KEYWORDS = new Set([
	"as",
	"async",
	"await",
	"break",
	"const",
	"continue",
	"crate",
	"dyn",
	"else",
	"enum",
	"extern",
	"fn",
	"for",
	"if",
	"impl",
	"in",
	"let",
	"loop",
	"match",
	"mod",
	"move",
	"mut",
	"pub",
	"ref",
	"return",
	"self",
	"Self",
	"static",
	"struct",
	"super",
	"trait",
	"type",
	"unsafe",
	"use",
	"where",
	"while",
]);

const RUST_TYPES = new Set([
	"bool",
	"char",
	"i8",
	"i16",
	"i32",
	"i64",
	"i128",
	"isize",
	"u8",
	"u16",
	"u32",
	"u64",
	"u128",
	"usize",
	"f32",
	"f64",
	"str",
	"String",
	"Option",
	"Result",
	"Some",
	"None",
	"Ok",
	"Err",
	"Vec",
	"Box",
	"Rc",
	"Arc",
]);

const PYTHON_KEYWORDS = new Set([
	"and",
	"as",
	"assert",
	"async",
	"await",
	"break",
	"class",
	"continue",
	"def",
	"del",
	"elif",
	"else",
	"except",
	"finally",
	"for",
	"from",
	"global",
	"if",
	"import",
	"in",
	"is",
	"lambda",
	"nonlocal",
	"not",
	"or",
	"pass",
	"raise",
	"return",
	"try",
	"while",
	"with",
	"yield",
]);

const PYTHON_TYPES = new Set([
	"int",
	"float",
	"str",
	"bool",
	"list",
	"dict",
	"set",
	"tuple",
	"bytes",
	"Any",
	"Optional",
	"List",
	"Dict",
	"Set",
	"Tuple",
]);

const C_KEYWORDS = new Set([
	"auto",
	"break",
	"case",
	"const",
	"continue",
	"default",
	"do",
	"else",
	"enum",
	"extern",
	"for",
	"goto",
	"if",
	"register",
	"return",
	"sizeof",
	"static",
	"struct",
	"switch",
	"typedef",
	"union",
	"volatile",
	"while",
]);

const C_TYPES = new Set([
	"char",
	"double",
	"float",
	"int",
	"long",
	"short",
	"signed",
	"unsigned",
	"void",
	"size_t",
	"uint8_t",
	"uint16_t",
	"uint32_t",
	"uint64_t",
	"int8_t",
	"int16_t",
	"int32_t",
	"int64_t",
]);

const JAVA_KEYWORDS = new Set([
	"abstract",
	"assert",
	"boolean",
	"break",
	"byte",
	"case",
	"catch",
	"char",
	"class",
	"const",
	"continue",
	"default",
	"do",
	"double",
	"else",
	"enum",
	"extends",
	"final",
	"finally",
	"float",
	"for",
	"goto",
	"if",
	"implements",
	"import",
	"instanceof",
	"int",
	"interface",
	"long",
	"native",
	"new",
	"package",
	"private",
	"protected",
	"public",
	"return",
	"short",
	"static",
	"strictfp",
	"super",
	"switch",
	"synchronized",
	"this",
	"throw",
	"throws",
	"transient",
	"try",
	"void",
	"volatile",
	"while",
]);

const SQL_KEYWORDS = new Set([
	"SELECT",
	"FROM",
	"WHERE",
	"INSERT",
	"UPDATE",
	"DELETE",
	"CREATE",
	"DROP",
	"ALTER",
	"TABLE",
	"INTO",
	"VALUES",
	"JOIN",
	"LEFT",
	"RIGHT",
	"INNER",
	"OUTER",
	"ON",
	"GROUP",
	"BY",
	"ORDER",
	"HAVING",
	"LIMIT",
	"OFFSET",
	"AS",
	"AND",
	"OR",
	"NOT",
	"IN",
	"IS",
	"NULL",
	"LIKE",
	"DISTINCT",
	"COUNT",
	"SUM",
	"AVG",
	"MIN",
	"MAX",
	"CASE",
	"WHEN",
	"THEN",
	"ELSE",
	"END",
	"PRIMARY",
	"KEY",
	"FOREIGN",
	"REFERENCES",
]);

const BASH_KEYWORDS = new Set([
	"if",
	"then",
	"else",
	"elif",
	"fi",
	"case",
	"esac",
	"for",
	"while",
	"until",
	"do",
	"done",
	"in",
	"function",
	"select",
	"time",
	"return",
	"exit",
	"echo",
	"export",
	"set",
	"unset",
	"sudo",
]);

function getLanguageRules(normalizedLang: string): LanguageRules {
	switch (normalizedLang) {
		case "typescript":
		case "javascript":
			return {
				keywords: COMMON_KEYWORDS,
				types: TS_TYPES,
				booleans: new Set([
					"true",
					"false",
					"null",
					"undefined",
					"NaN",
				]),
				lineComment: ["//"],
			};
		case "rust":
			return {
				keywords: RUST_KEYWORDS,
				types: RUST_TYPES,
				booleans: new Set(["true", "false"]),
				lineComment: ["//"],
			};
		case "python":
			return {
				keywords: PYTHON_KEYWORDS,
				types: PYTHON_TYPES,
				booleans: new Set(["True", "False", "None"]),
				lineComment: ["#"],
			};
		case "c":
		case "cpp":
			return {
				keywords: C_KEYWORDS,
				types: C_TYPES,
				booleans: new Set(["true", "false", "NULL"]),
				lineComment: ["//"],
			};
		case "java":
			return {
				keywords: JAVA_KEYWORDS,
				types: new Set([
					"String",
					"Integer",
					"Boolean",
					"Object",
					"List",
					"Map",
				]),
				booleans: new Set(["true", "false", "null"]),
				lineComment: ["//"],
			};
		case "sql":
			return {
				keywords: SQL_KEYWORDS,
				types: new Set([
					"INTEGER",
					"TEXT",
					"VARCHAR",
					"BOOLEAN",
					"TIMESTAMP",
					"UUID",
					"SERIAL",
				]),
				booleans: new Set([
					"true",
					"false",
					"null",
					"TRUE",
					"FALSE",
					"NULL",
				]),
				lineComment: ["--"],
			};
		case "bash":
			return {
				keywords: BASH_KEYWORDS,
				types: new Set([]),
				booleans: new Set(["true", "false"]),
				lineComment: ["#"],
			};
		default:
			return {
				keywords: COMMON_KEYWORDS,
				types: TS_TYPES,
				booleans: new Set(["true", "false", "null"]),
				lineComment: ["//", "#"],
			};
	}
}

export function highlightCode(
	code: string,
	rawLanguage?: string | null,
): HighlightedLine[] {
	const normalizedLang = normalizeLanguage(rawLanguage);
	const rules = getLanguageRules(normalizedLang);
	const lines = code.split("\n");

	let inBlockComment = false;

	return lines.map((lineText, lineIdx) => {
		const tokens: CodeToken[] = [];
		let i = 0;
		const len = lineText.length;

		while (i < len) {
			// Check multi-line block comment continuation
			if (inBlockComment) {
				const endIdx = lineText.indexOf("*/", i);
				if (endIdx === -1) {
					tokens.push({
						type: "comment",
						content: lineText.slice(i),
						color: INVERTED_PALETTE_COLORS.comment,
					});
					i = len;
				} else {
					tokens.push({
						type: "comment",
						content: lineText.slice(i, endIdx + 2),
						color: INVERTED_PALETTE_COLORS.comment,
					});
					i = endIdx + 2;
					inBlockComment = false;
				}
				continue;
			}

			// Whitespace
			if (/\s/.test(lineText[i])) {
				let ws = "";
				while (i < len && /\s/.test(lineText[i])) {
					ws += lineText[i];
					i++;
				}
				tokens.push({
					type: "plain",
					content: ws,
					color: INVERTED_PALETTE_COLORS.plain,
				});
				continue;
			}

			// Block comment start /*
			if (
				(normalizedLang === "typescript" ||
					normalizedLang === "javascript" ||
					normalizedLang === "rust" ||
					normalizedLang === "c" ||
					normalizedLang === "cpp" ||
					normalizedLang === "java" ||
					normalizedLang === "sql") &&
				lineText.startsWith("/*", i)
			) {
				const endIdx = lineText.indexOf("*/", i + 2);
				if (endIdx === -1) {
					inBlockComment = true;
					tokens.push({
						type: "comment",
						content: lineText.slice(i),
						color: INVERTED_PALETTE_COLORS.comment,
					});
					i = len;
				} else {
					tokens.push({
						type: "comment",
						content: lineText.slice(i, endIdx + 2),
						color: INVERTED_PALETTE_COLORS.comment,
					});
					i = endIdx + 2;
				}
				continue;
			}

			// Line comments
			const matchedLineComment = rules.lineComment.find((prefix) =>
				lineText.startsWith(prefix, i),
			);
			if (matchedLineComment) {
				tokens.push({
					type: "comment",
					content: lineText.slice(i),
					color: INVERTED_PALETTE_COLORS.comment,
				});
				i = len;
				continue;
			}

			// String literals
			const char = lineText[i];
			if (char === '"' || char === "'" || char === "`") {
				const quote = char;
				let strContent = quote;
				i++;
				let escaped = false;
				while (i < len) {
					const c = lineText[i];
					strContent += c;
					if (escaped) {
						escaped = false;
					} else if (c === "\\") {
						escaped = true;
					} else if (c === quote) {
						i++;
						break;
					}
					i++;
				}
				tokens.push({
					type: "string",
					content: strContent,
					color: INVERTED_PALETTE_COLORS.string,
				});
				continue;
			}

			// Numbers: hex, binary, or decimal
			if (
				/\d/.test(char) ||
				(char === "." && i + 1 < len && /\d/.test(lineText[i + 1]))
			) {
				let numStr = "";
				// Check 0x or 0b
				if (
					char === "0" &&
					i + 1 < len &&
					(lineText[i + 1] === "x" || lineText[i + 1] === "b")
				) {
					numStr += lineText.slice(i, i + 2);
					i += 2;
					while (i < len && /[0-9a-fA-F_]/.test(lineText[i])) {
						numStr += lineText[i];
						i++;
					}
				} else {
					while (i < len && /[0-9_.]/.test(lineText[i])) {
						numStr += lineText[i];
						i++;
					}
					if (i < len && /[eE]/.test(lineText[i])) {
						numStr += lineText[i];
						i++;
						if (i < len && /[+-]/.test(lineText[i])) {
							numStr += lineText[i];
							i++;
						}
						while (i < len && /[0-9_]/.test(lineText[i])) {
							numStr += lineText[i];
							i++;
						}
					}
				}
				tokens.push({
					type: "number",
					content: numStr,
					color: INVERTED_PALETTE_COLORS.number,
				});
				continue;
			}

			// Identifiers, keywords, booleans, types
			if (/[a-zA-Z_$]/.test(char)) {
				let ident = "";
				while (i < len && /[a-zA-Z0-9_$]/.test(lineText[i])) {
					ident += lineText[i];
					i++;
				}

				// Check what this identifier is
				const isSql = normalizedLang === "sql";
				const lookupIdent = isSql ? ident.toUpperCase() : ident;

				if (
					rules.keywords.has(lookupIdent) ||
					rules.keywords.has(ident)
				) {
					tokens.push({
						type: "keyword",
						content: ident,
						color: INVERTED_PALETTE_COLORS.keyword,
						bold: true,
					});
				} else if (
					rules.booleans.has(lookupIdent) ||
					rules.booleans.has(ident)
				) {
					tokens.push({
						type: "boolean",
						content: ident,
						color: INVERTED_PALETTE_COLORS.boolean,
					});
				} else if (
					rules.types.has(ident) ||
					(normalizedLang === "rust" &&
						/^[A-Z][a-zA-Z0-9]*$/.test(ident)) ||
					(normalizedLang === "typescript" &&
						/^[A-Z][a-zA-Z0-9]*$/.test(ident))
				) {
					tokens.push({
						type: "type",
						content: ident,
						color: INVERTED_PALETTE_COLORS.type,
					});
				} else {
					// Check if function call (lookahead for '(' after optional whitespace)
					let peek = i;
					while (peek < len && /\s/.test(lineText[peek])) peek++;
					if (peek < len && lineText[peek] === "(") {
						tokens.push({
							type: "function",
							content: ident,
							color: INVERTED_PALETTE_COLORS.function,
							bold: true,
						});
					} else {
						tokens.push({
							type: "plain",
							content: ident,
							color: INVERTED_PALETTE_COLORS.plain,
						});
					}
				}
				continue;
			}

			// Multi-char operators: ==, ===, !=, !==, =>, ->, ::, <=, >=, &&, ||, ++, --, +=, -=, etc.
			const twoChar = lineText.slice(i, i + 2);
			const threeChar = lineText.slice(i, i + 3);

			if (threeChar === "===" || threeChar === "!==") {
				tokens.push({
					type: "operator",
					content: threeChar,
					color: INVERTED_PALETTE_COLORS.operator,
				});
				i += 3;
				continue;
			}

			if (
				[
					"==",
					"!=",
					"<=",
					">=",
					"=>",
					"->",
					"::",
					"&&",
					"||",
					"++",
					"--",
					"+=",
					"-=",
					"*=",
					"/=",
					"??",
				].includes(twoChar)
			) {
				tokens.push({
					type: "operator",
					content: twoChar,
					color: INVERTED_PALETTE_COLORS.operator,
				});
				i += 2;
				continue;
			}

			// Single char operators & punctuation
			if (/[=+\-*/%&|^!<>~?:]/.test(char)) {
				tokens.push({
					type: "operator",
					content: char,
					color: INVERTED_PALETTE_COLORS.operator,
				});
				i++;
				continue;
			}

			if (/[{}()[\];,.]/.test(char)) {
				tokens.push({
					type: "punctuation",
					content: char,
					color: INVERTED_PALETTE_COLORS.punctuation,
				});
				i++;
				continue;
			}

			// Fallback plain character
			tokens.push({
				type: "plain",
				content: char,
				color: INVERTED_PALETTE_COLORS.plain,
			});
			i++;
		}

		return {
			lineNumber: lineIdx + 1,
			tokens,
		};
	});
}
