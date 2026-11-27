import type { Post, PostVisibility } from "../types";

export const POST_COMPOSER_DRAFT_KEY = "impulse_post_composer_draft_v1";

export interface PostComposerDraft {
	title: string;
	content: string;
	visibility: PostVisibility;
	codeSnippet: string;
	codeLanguage: string;
	selectedTags: string[];
	mediaUrls: string[];
	activeTray: "code" | "media" | null;
	updatedAt: number;
}

export type PostDraftFields = Pick<
	PostComposerDraft,
	"title" | "content" | "codeSnippet" | "selectedTags" | "mediaUrls"
>;

export type PostEditComparable = Pick<
	PostComposerDraft,
	| "title"
	| "content"
	| "visibility"
	| "codeSnippet"
	| "codeLanguage"
	| "selectedTags"
	| "mediaUrls"
>;

export function hasPostDraftContent(draft: PostDraftFields): boolean {
	return Boolean(
		draft.title.trim() ||
		draft.content.trim() ||
		draft.codeSnippet.trim() ||
		draft.selectedTags.length > 0 ||
		draft.mediaUrls.length > 0,
	);
}

export function parsePostDraft(raw: string | null): PostComposerDraft | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as Partial<PostComposerDraft> | null;
		if (!parsed || typeof parsed !== "object") return null;

		const draft: PostComposerDraft = {
			title: typeof parsed.title === "string" ? parsed.title : "",
			content: typeof parsed.content === "string" ? parsed.content : "",
			visibility: parsed.visibility === "house" ? "house" : "public",
			codeSnippet:
				typeof parsed.codeSnippet === "string"
					? parsed.codeSnippet
					: "",
			codeLanguage:
				typeof parsed.codeLanguage === "string" &&
				parsed.codeLanguage.trim()
					? parsed.codeLanguage
					: "TS",
			selectedTags: Array.isArray(parsed.selectedTags)
				? parsed.selectedTags.filter(
						(t): t is string => typeof t === "string",
					)
				: [],
			mediaUrls: Array.isArray(parsed.mediaUrls)
				? parsed.mediaUrls.filter(
						(u): u is string => typeof u === "string",
					)
				: [],
			activeTray:
				parsed.activeTray === "code" || parsed.activeTray === "media"
					? parsed.activeTray
					: null,
			updatedAt:
				typeof parsed.updatedAt === "number"
					? parsed.updatedAt
					: Date.now(),
		};

		return hasPostDraftContent(draft) ? draft : null;
	} catch {
		return null;
	}
}

function normalizeTagList(tags?: string[] | null): string[] {
	if (!Array.isArray(tags)) return [];
	return tags
		.map((t) => {
			const clean = t.trim().replace(/^#+/, "").toUpperCase();
			return clean ? `#${clean}` : "";
		})
		.filter(Boolean);
}

function normalizeOriginalMedia(post: Post): string[] {
	if (Array.isArray(post.image_urls) && post.image_urls.length > 0) {
		return post.image_urls.filter(Boolean);
	}
	if (!post.image_url) return [];
	const trimmed = post.image_url.trim();
	if (trimmed.startsWith("[")) {
		try {
			const parsed = JSON.parse(trimmed);
			if (Array.isArray(parsed)) {
				return parsed.filter((u): u is string => typeof u === "string");
			}
		} catch {
			return [trimmed];
		}
	}
	return trimmed ? [trimmed] : [];
}

function arraysEqual(a: string[], b: string[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

export function isPostEditDirty(
	current: PostEditComparable,
	original: Post,
): boolean {
	if (current.title !== (original.title || "")) return true;
	if (current.content !== (original.content || "")) return true;
	if (current.visibility !== (original.visibility || "public")) return true;

	const origCode = original.code_snippet || "";
	if (current.codeSnippet !== origCode) return true;
	if (
		origCode.trim() &&
		current.codeLanguage.toUpperCase() !==
			(original.code_language || "RUST").toUpperCase()
	) {
		return true;
	}

	const origTags = normalizeTagList(original.tags);
	const currTags = normalizeTagList(current.selectedTags);
	if (!arraysEqual(currTags, origTags)) return true;

	const origMedia = normalizeOriginalMedia(original);
	if (!arraysEqual(current.mediaUrls, origMedia)) return true;

	return false;
}

export async function loadPostDraft(): Promise<PostComposerDraft | null> {
	try {
		const { default: AsyncStorage } =
			await import("@react-native-async-storage/async-storage");
		const raw = await AsyncStorage.getItem(POST_COMPOSER_DRAFT_KEY);
		return parsePostDraft(raw);
	} catch {
		return null;
	}
}

export async function savePostDraft(
	draft: Omit<PostComposerDraft, "updatedAt">,
): Promise<void> {
	try {
		const { default: AsyncStorage } =
			await import("@react-native-async-storage/async-storage");
		if (!hasPostDraftContent(draft)) {
			await AsyncStorage.removeItem(POST_COMPOSER_DRAFT_KEY);
			return;
		}
		const payload: PostComposerDraft = {
			...draft,
			updatedAt: Date.now(),
		};
		await AsyncStorage.setItem(
			POST_COMPOSER_DRAFT_KEY,
			JSON.stringify(payload),
		);
	} catch {
		// Ignore storage write errors
	}
}

export async function clearPostDraft(): Promise<void> {
	try {
		const { default: AsyncStorage } =
			await import("@react-native-async-storage/async-storage");
		await AsyncStorage.removeItem(POST_COMPOSER_DRAFT_KEY);
	} catch {
		// Ignore storage clear errors
	}
}
