import type { GuildId } from "@/features/guilds/types";

import type { Post } from "../types";

export function isPostRestricted(
	post: Pick<Post, "visibility" | "guild" | "author_id">,
	userId?: string,
	userGuild?: string | null,
	isAdmin?: boolean,
): boolean {
	if (isAdmin) return false;

	const isAuthor = Boolean(userId && post.author_id === userId);
	if (isAuthor) return false;

	if (post.visibility === "house") {
		const normPostGuild = (post.guild || "")
			.replace("-", "_")
			.toLowerCase();
		const normUserGuild = (userGuild || "").replace("-", "_").toLowerCase();
		return (
			!normUserGuild ||
			(Boolean(normPostGuild) && normPostGuild !== normUserGuild)
		);
	}

	return false;
}

export function filterPostsForUser(
	posts: Post[],
	userGuild?: string | null,
	userId?: string,
	isAdmin?: boolean,
): Post[] {
	return posts.filter(
		(p) => !isPostRestricted(p, userId, userGuild, isAdmin),
	);
}

export function canManagePost(
	post: Pick<Post, "author_id">,
	userId?: string,
	userRole?: string | null,
): boolean {
	if (userRole === "admin") return true;
	return Boolean(userId && post.author_id === userId);
}

export function isPostEdited(
	post: Pick<Post, "is_edited" | "created_at" | "updated_at">,
): boolean {
	return Boolean(post.is_edited);
}

export function resolvePostGuild(
	existingGuild?: GuildId | null,
	authorGuild?: GuildId | null,
	editorGuild?: GuildId | null,
	isEditingOtherUser?: boolean,
): GuildId | null {
	if (existingGuild) return existingGuild;
	if (authorGuild) return authorGuild;
	if (isEditingOtherUser) return null;
	return editorGuild ?? null;
}

export function normalizePostTags(tags: unknown): string[] {
	if (!tags) return [];

	let rawList: unknown[] = [];

	if (Array.isArray(tags)) {
		rawList = tags;
	} else if (typeof tags === "string") {
		const trimmed = tags.trim();
		if (
			!trimmed ||
			trimmed === "{}" ||
			trimmed === "[]" ||
			trimmed === '""' ||
			trimmed === "''"
		) {
			return [];
		}
		// JSON array string: '["tech", "react"]'
		if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
			try {
				const parsed = JSON.parse(trimmed);
				if (Array.isArray(parsed)) {
					rawList = parsed;
				}
			} catch {}
		}
		// Postgres array literal: '{"tech","react"}' or '{tech,react}'
		if (
			rawList.length === 0 &&
			trimmed.startsWith("{") &&
			trimmed.endsWith("}")
		) {
			const inner = trimmed.slice(1, -1).trim();
			if (!inner) return [];
			rawList = inner.split(",").map((t) => t.trim());
		}
		// Fallback for comma-separated string: 'tech, react'
		if (rawList.length === 0) {
			rawList = trimmed.split(",").map((t) => t.trim());
		}
	} else if (typeof tags === "object") {
		rawList = Object.values(tags as Record<string, unknown>);
	}

	const seen = new Set<string>();
	const result: string[] = [];

	for (const item of rawList) {
		if (typeof item !== "string" && typeof item !== "number") continue;
		let s = String(item).trim();
		// Strip wrapping quotes (single, double, or escaped quotes from postgres/json)
		s = s.replace(/^["'\\]+|["'\\]+$/g, "").trim();
		// Strip wrapping braces or brackets if any leaked through
		s = s.replace(/^[{[]+|[}\]]+$/g, "").trim();
		// Strip leading hash symbols
		s = s.replace(/^#+/, "").trim();
		if (!s) continue;

		const tag = `#${s.toUpperCase()}`;
		if (!seen.has(tag)) {
			seen.add(tag);
			result.push(tag);
		}
	}

	return result;
}

const ALLOWED_MEDIA_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const ALLOWED_MEDIA_MIME_TYPES = new Set([
	"image/png",
	"image/jpg",
	"image/jpeg",
	"image/webp",
	"image/gif",
]);

export function isAllowedPostMediaAsset(asset: {
	uri?: string | null;
	fileName?: string | null;
	mimeType?: string | null;
}): boolean {
	const fileName = (asset.fileName || "").trim();
	const nameExt = fileName.includes(".")
		? fileName.split(".").pop()?.toLowerCase() || null
		: null;

	const rawUri = (asset.uri || "").trim();
	const cleanUri = rawUri.split("?")[0].split("#")[0];
	const lastSegment = cleanUri.split("/").pop() || "";
	const isOpaqueUri =
		cleanUri.startsWith("data:") ||
		cleanUri.startsWith("blob:") ||
		cleanUri.startsWith("content:") ||
		cleanUri.startsWith("ph:");
	const uriExt =
		!isOpaqueUri && lastSegment.includes(".")
			? lastSegment.split(".").pop()?.toLowerCase() || null
			: null;

	const dataMime = rawUri.startsWith("data:")
		? rawUri.match(/^data:([^;,]+)/)?.[1]?.toLowerCase() || null
		: null;
	const mime =
		(asset.mimeType || dataMime || "").trim().toLowerCase() || null;

	if (nameExt && !ALLOWED_MEDIA_EXTENSIONS.has(nameExt)) {
		return false;
	}
	if (!nameExt && uriExt && !ALLOWED_MEDIA_EXTENSIONS.has(uriExt)) {
		return false;
	}
	if (mime && !ALLOWED_MEDIA_MIME_TYPES.has(mime)) {
		return false;
	}

	return Boolean(
		(nameExt && ALLOWED_MEDIA_EXTENSIONS.has(nameExt)) ||
		(uriExt && ALLOWED_MEDIA_EXTENSIONS.has(uriExt)) ||
		(mime && ALLOWED_MEDIA_MIME_TYPES.has(mime)),
	);
}

export function normalizePostMedia(
	post?:
		| {
				image_url?: string | null;
				image_urls?: string[] | null;
		  }
		| string
		| null,
): string[] {
	if (!post) return [];
	if (typeof post === "string") {
		const raw = post.trim();
		if (!raw) return [];
		if (raw.startsWith("[")) {
			try {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) {
					return parsed.map((u) => String(u).trim()).filter(Boolean);
				}
			} catch {}
		}
		return [raw];
	}
	if (Array.isArray(post.image_urls) && post.image_urls.length > 0) {
		return post.image_urls.map((u) => String(u).trim()).filter(Boolean);
	}
	if (typeof post.image_url === "string" && post.image_url.trim()) {
		const raw = post.image_url.trim();
		if (raw.startsWith("[")) {
			try {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) {
					return parsed.map((u) => String(u).trim()).filter(Boolean);
				}
			} catch {}
		}
		return [raw];
	}
	return [];
}

export function serializePostMediaUrl(
	urls?: string[] | null,
	fallbackSingleUrl?: string | null,
): string | null {
	const cleaned = (urls || []).map((u) => String(u).trim()).filter(Boolean);
	if (cleaned.length === 0) {
		return fallbackSingleUrl?.trim() || null;
	}
	if (cleaned.length === 1) {
		return cleaned[0];
	}
	return JSON.stringify(cleaned);
}

export function isRemoteMediaUrl(uri: string): boolean {
	return /^https?:\/\//i.test((uri || "").trim());
}

export function resolveMediaUploaderId(
	authUserId?: string | null,
	postAuthorId?: string | null,
): string {
	const authClean = (authUserId || "").trim();
	if (authClean) return authClean;
	const authorClean = (postAuthorId || "").trim();
	if (authorClean) return authorClean;
	return "anonymous";
}

export function computeNextVoteFromRemote(
	remoteVote: number | null | undefined,
	targetVote: 1 | -1,
): { currentVote: 1 | -1 | 0; newVote: 1 | -1 | 0 } {
	const currentVote: 1 | -1 | 0 =
		remoteVote === 1 || remoteVote === -1 ? remoteVote : 0;
	const newVote: 1 | -1 | 0 = currentVote === targetVote ? 0 : targetVote;
	return { currentVote, newVote };
}
