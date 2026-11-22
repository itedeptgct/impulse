const URL_REGEX = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
const TRAILING_PUNCTUATION = /[.,!?;:'"\]]+$/;
const FULL_LINE_URL_REGEX =
	/^(?:(?:https?:\/\/|www\.)[^\s<>"']+(?:\s+(?:https?:\/\/|www\.)[^\s<>"']+)*)$/i;

export type LinkCategory =
	| "search"
	| "index"
	| "code"
	| "video"
	| "paper"
	| "docs"
	| "design"
	| "impulse"
	| "web";

export interface ExtractedLink {
	raw: string;
	href: string;
	hostname: string;
	domainTag: string;
	pathname: string;
	displayPath: string;
	searchParams: Record<string, string>;
}

export interface LinkPreviewMetadata {
	href: string;
	hostname: string;
	domainTag: string;
	category: LinkCategory;
	categoryTag: string;
	title: string;
	description: string;
	imageUrl?: string | null;
	logoUrl?: string | null;
	faviconUrl?: string | null;
	siteName?: string | null;
}

export function normalizeHref(rawUrl: string): string | null {
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

export function splitUrlTrailingPunctuation(raw: string): {
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

export function buildFaviconUrl(hostname: string): string | null {
	const normalized = hostname.trim().toLowerCase();
	if (
		!normalized ||
		normalized === "localhost" ||
		!normalized.includes(".") ||
		/^(?:\d{1,3}\.){3}\d{1,3}$/.test(normalized)
	) {
		return null;
	}
	return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(normalized)}&sz=128`;
}

function buildExtractedLink(raw: string, href: string): ExtractedLink {
	const parsed = new URL(href);
	const hostname = parsed.hostname.replace(/^www\./i, "").toLowerCase();
	const pathname = parsed.pathname === "/" ? "" : parsed.pathname;
	const searchParams: Record<string, string> = {};
	parsed.searchParams.forEach((value, key) => {
		searchParams[key] = value;
	});

	const rawDisplay = `${hostname}${pathname}${parsed.search}`.replace(
		/\/$/,
		"",
	);
	const displayPath =
		rawDisplay.length > 64 ? `${rawDisplay.slice(0, 61)}...` : rawDisplay;

	return {
		raw,
		href,
		hostname,
		domainTag: hostname.toUpperCase(),
		pathname,
		displayPath,
		searchParams,
	};
}

export function extractLinksFromText(text: string): ExtractedLink[] {
	if (!text) return [];
	const seen = new Set<string>();
	const links: ExtractedLink[] = [];

	for (const match of text.matchAll(URL_REGEX)) {
		const rawMatch = match[0];
		const { url } = splitUrlTrailingPunctuation(rawMatch);
		const href = url ? normalizeHref(url) : null;
		if (!href || seen.has(href)) continue;
		seen.add(href);
		try {
			links.push(buildExtractedLink(url, href));
		} catch {
			// Skip malformed URL
		}
	}

	return links;
}

export function stripStandaloneLinkLines(text: string): string {
	if (!text) return "";

	const lines = text.split(/\r?\n/);
	const keptLines: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed && FULL_LINE_URL_REGEX.test(trimmed)) {
			const tokens = trimmed.split(/\s+/);
			const allValidUrls = tokens.every((token) => {
				const { url } = splitUrlTrailingPunctuation(token);
				return Boolean(url && normalizeHref(url));
			});
			if (allValidUrls) {
				continue;
			}
		}
		keptLines.push(line);
	}

	return keptLines
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

export function formatCompactInlineLink(href: string): string {
	try {
		const parsed = new URL(href);
		const host = parsed.hostname.replace(/^www\./i, "");
		const path = parsed.pathname === "/" ? "" : parsed.pathname;
		const clean = `${host}${path}`.replace(/\/$/, "");
		if (clean.length <= 32) return `${clean} ↗`;
		return `${clean.slice(0, 29)}... ↗`;
	} catch {
		return href.length <= 32 ? `${href} ↗` : `${href.slice(0, 29)}... ↗`;
	}
}

function formatSlugTitle(pathname: string): string | null {
	const segments = pathname
		.split("/")
		.map((s) => s.trim())
		.filter(Boolean);
	if (segments.length === 0) return null;

	const last = decodeURIComponent(segments[segments.length - 1])
		.replace(/\.[a-z0-9]{1,5}$/i, "")
		.replace(/[-_]+/g, " ")
		.trim();

	if (!last || /^[0-9a-f]{8,}$/i.test(last)) return null;

	return last.replace(/\b\w/g, (c) => c.toUpperCase());
}

function capitalizeDomain(hostname: string): string {
	const base = hostname.split(".")[0] || hostname;
	if (!base) return hostname;
	return base.charAt(0).toUpperCase() + base.slice(1);
}

function isGoogleDomain(hostname: string): boolean {
	return /^(?:[a-z0-9-]+\.)*google\.(?:com|[a-z]{2}|com?\.[a-z]{2})$/i.test(
		hostname,
	);
}

function extractYouTubeVideoId(link: ExtractedLink): string | null {
	if (link.hostname === "youtu.be") {
		const id = link.pathname.split("/").filter(Boolean)[0];
		return id || null;
	}
	if (link.hostname === "youtube.com" || link.hostname === "m.youtube.com") {
		if (link.searchParams.v) return link.searchParams.v;
		const parts = link.pathname.split("/").filter(Boolean);
		if (
			(parts[0] === "shorts" ||
				parts[0] === "embed" ||
				parts[0] === "live") &&
			parts[1]
		) {
			return parts[1];
		}
	}
	return null;
}

export function resolveStaticLinkMetadata(
	link: ExtractedLink,
): LinkPreviewMetadata {
	const { hostname, domainTag, pathname, searchParams, href, displayPath } =
		link;
	const lowerPath = pathname.toLowerCase();
	const lowerHref = href.toLowerCase();
	const faviconUrl = buildFaviconUrl(hostname);

	if (isGoogleDomain(hostname)) {
		if (hostname.startsWith("scholar.google.")) {
			const query = searchParams.q?.trim();
			return {
				href,
				hostname,
				domainTag,
				category: "paper",
				categoryTag: "GOOGLE SCHOLAR",
				title: query ? `Scholar: ${query}` : "Google Scholar",
				description: query
					? `Academic literature search for "${query}"`
					: "Academic papers, citations, and scholarly search.",
				logoUrl: faviconUrl,
				faviconUrl,
				siteName: "Google Scholar",
			};
		}

		if (hostname.startsWith("docs.google.")) {
			return {
				href,
				hostname,
				domainTag,
				category: "docs",
				categoryTag: "GOOGLE DOCS",
				title: formatSlugTitle(pathname) || "Google Workspace Document",
				description: displayPath,
				logoUrl: faviconUrl,
				faviconUrl,
				siteName: "Google Docs",
			};
		}

		if (hostname.startsWith("drive.google.")) {
			return {
				href,
				hostname,
				domainTag,
				category: "docs",
				categoryTag: "GOOGLE DRIVE",
				title: "Shared Drive Resource",
				description: displayPath,
				logoUrl: faviconUrl,
				faviconUrl,
				siteName: "Google Drive",
			};
		}

		if (
			lowerPath.startsWith("/search") ||
			Boolean(searchParams.q?.trim())
		) {
			const query = searchParams.q?.trim();
			const googleLogo = buildFaviconUrl("google.com") || faviconUrl;
			return {
				href,
				hostname,
				domainTag: "GOOGLE.COM",
				category: "search",
				categoryTag: "GOOGLE SEARCH",
				title: query ? `${query} — Google Search` : "Google Search",
				description: query
					? `Explore Google Search results for "${query}".`
					: "Explore web results on Google Search.",
				logoUrl: googleLogo,
				faviconUrl: googleLogo,
				siteName: "Google",
			};
		}

		return {
			href,
			hostname,
			domainTag,
			category: "search",
			categoryTag: "GOOGLE",
			title: formatSlugTitle(pathname) || "Google",
			description: displayPath,
			logoUrl: faviconUrl,
			faviconUrl,
			siteName: "Google",
		};
	}

	if (
		hostname.includes("artificialanalysis") ||
		lowerHref.includes("intelligence-index") ||
		lowerPath.includes("intelligence") ||
		lowerPath.includes("leaderboard") ||
		lowerPath.includes("benchmark")
	) {
		const isArtificialAnalysis = hostname.includes("artificialanalysis");
		const slugTitle = formatSlugTitle(pathname);
		const title =
			lowerHref.includes("intelligence-index") ||
			lowerPath.includes("intelligence")
				? isArtificialAnalysis
					? "Artificial Analysis Intelligence Index"
					: slugTitle || "Intelligence Index"
				: slugTitle ||
					(isArtificialAnalysis
						? "Artificial Analysis"
						: `${capitalizeDomain(hostname)} Index`);

		return {
			href,
			hostname,
			domainTag,
			category: "index",
			categoryTag: "INTELLIGENCE INDEX",
			title,
			description:
				"AI model intelligence benchmarks, latency, pricing, and capability rankings.",
			logoUrl: faviconUrl,
			faviconUrl,
			siteName: isArtificialAnalysis ? "Artificial Analysis" : hostname,
		};
	}

	if (hostname === "github.com" || hostname === "gist.github.com") {
		const segments = pathname.split("/").filter(Boolean);
		const repoTitle =
			segments.length >= 2
				? `${segments[0]}/${segments[1]}`
				: segments[0] || "GitHub";
		const repoOgImage =
			hostname === "github.com" && segments.length === 2
				? `https://opengraph.githubassets.com/1/${segments[0]}/${segments[1]}`
				: null;
		return {
			href,
			hostname,
			domainTag,
			category: "code",
			categoryTag:
				hostname === "gist.github.com" ? "GITHUB GIST" : "GITHUB",
			title: repoTitle,
			description:
				segments.length > 2
					? displayPath
					: "Source code repository and issues on GitHub.",
			imageUrl: repoOgImage,
			logoUrl: faviconUrl,
			faviconUrl,
			siteName: "GitHub",
		};
	}

	if (
		hostname === "youtube.com" ||
		hostname === "m.youtube.com" ||
		hostname === "youtu.be"
	) {
		const videoId = extractYouTubeVideoId(link);
		const youtubeLogo = buildFaviconUrl("youtube.com") || faviconUrl;
		return {
			href,
			hostname,
			domainTag,
			category: "video",
			categoryTag: "YOUTUBE",
			title: formatSlugTitle(pathname) || "YouTube Video",
			description: displayPath,
			imageUrl: videoId
				? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
				: null,
			logoUrl: youtubeLogo,
			faviconUrl: youtubeLogo,
			siteName: "YouTube",
		};
	}

	if (
		hostname === "arxiv.org" ||
		hostname.endsWith(".ieee.org") ||
		hostname === "dl.acm.org"
	) {
		return {
			href,
			hostname,
			domainTag,
			category: "paper",
			categoryTag: "RESEARCH PAPER",
			title:
				formatSlugTitle(pathname) ||
				`${capitalizeDomain(hostname)} Paper`,
			description: displayPath,
			logoUrl: faviconUrl,
			faviconUrl,
			siteName: capitalizeDomain(hostname),
		};
	}

	if (hostname === "figma.com") {
		return {
			href,
			hostname,
			domainTag,
			category: "design",
			categoryTag: "FIGMA DESIGN",
			title: formatSlugTitle(pathname) || "Figma File",
			description: displayPath,
			logoUrl: faviconUrl,
			faviconUrl,
			siteName: "Figma",
		};
	}

	if (hostname === "impulse-app.pages.dev") {
		return {
			href,
			hostname,
			domainTag,
			category: "impulse",
			categoryTag: "IMPULSE",
			title: formatSlugTitle(pathname) || "Impulse Transmission",
			description: displayPath,
			logoUrl: faviconUrl,
			faviconUrl,
			siteName: "Impulse",
		};
	}

	if (lowerPath.endsWith(".pdf")) {
		return {
			href,
			hostname,
			domainTag,
			category: "docs",
			categoryTag: "PDF DOCUMENT",
			title: formatSlugTitle(pathname) || "PDF Document",
			description: displayPath,
			logoUrl: faviconUrl,
			faviconUrl,
			siteName: hostname,
		};
	}

	if (
		hostname.startsWith("docs.") ||
		hostname.startsWith("developer.") ||
		hostname === "reactnative.dev" ||
		hostname === "typescriptlang.org" ||
		hostname === "tailwindcss.com" ||
		hostname.endsWith("wikipedia.org") ||
		lowerPath.startsWith("/docs")
	) {
		return {
			href,
			hostname,
			domainTag,
			category: "docs",
			categoryTag: "DOCS",
			title:
				formatSlugTitle(pathname) ||
				`${capitalizeDomain(hostname)} Docs`,
			description: displayPath,
			logoUrl: faviconUrl,
			faviconUrl,
			siteName: capitalizeDomain(hostname),
		};
	}

	return {
		href,
		hostname,
		domainTag,
		category: "web",
		categoryTag: "WEB LINK",
		title: formatSlugTitle(pathname) || capitalizeDomain(hostname),
		description: displayPath,
		logoUrl: faviconUrl,
		faviconUrl,
		siteName: hostname,
	};
}

function decodeHtmlEntities(input: string): string {
	return input
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;/gi, '"')
		.replace(/&#39;|&apos;|&#x27;/gi, "'")
		.replace(/&nbsp;/gi, " ")
		.replace(/&#(\d+);/g, (_match, dec: string) => {
			const code = Number.parseInt(dec, 10);
			return Number.isFinite(code) ? String.fromCodePoint(code) : "";
		})
		.replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => {
			const code = Number.parseInt(hex, 16);
			return Number.isFinite(code) ? String.fromCodePoint(code) : "";
		})
		.replace(/\s+/g, " ")
		.trim();
}

function extractMetaTag(html: string, keys: string[]): string | null {
	for (const key of keys) {
		const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const patterns = [
			new RegExp(
				`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
				"i",
			),
			new RegExp(
				`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`,
				"i",
			),
		];
		for (const regex of patterns) {
			const match = html.match(regex);
			if (match?.[1]) {
				const decoded = decodeHtmlEntities(match[1]);
				if (decoded) return decoded;
			}
		}
	}
	return null;
}

function extractHtmlTitle(html: string): string | null {
	const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
	if (!match?.[1]) return null;
	const decoded = decodeHtmlEntities(match[1]);
	return decoded || null;
}

function isBlockedChallengeTitle(title: string): boolean {
	const lower = title.toLowerCase();
	return (
		lower.includes("just a moment") ||
		lower.includes("attention required") ||
		lower.includes("access denied") ||
		lower === "403 forbidden" ||
		lower === "404 not found" ||
		lower === "robot or human?"
	);
}

function resolveHttpUrl(
	rawUrl: string | null | undefined,
	baseHref: string,
): string | null {
	if (!rawUrl) return null;
	try {
		const resolved = new URL(rawUrl, baseHref);
		if (resolved.protocol === "http:" || resolved.protocol === "https:") {
			return resolved.toString();
		}
		return null;
	} catch {
		return null;
	}
}

function isRasterLogoUrl(url: string): boolean {
	try {
		const pathname = new URL(url).pathname.toLowerCase();
		if (pathname.endsWith(".svg") || pathname.endsWith(".ico")) {
			return false;
		}
		return true;
	} catch {
		return false;
	}
}

function extractBestIconUrl(html: string, baseHref: string): string | null {
	const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];
	let bestUrl: string | null = null;
	let bestScore = -1;

	for (const tag of linkTags) {
		const relMatch = tag.match(/rel=["']([^"']+)["']/i);
		const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
		if (!relMatch?.[1] || !hrefMatch?.[1]) continue;

		const rel = relMatch[1].toLowerCase();
		if (!rel.includes("icon") || rel.includes("mask-icon")) continue;

		const resolved = resolveHttpUrl(
			decodeHtmlEntities(hrefMatch[1]),
			baseHref,
		);
		if (!resolved || !isRasterLogoUrl(resolved)) continue;

		const sizesMatch = tag.match(/sizes=["'](\d+)x(\d+)["']/i);
		const sizePx = sizesMatch ? Number.parseInt(sizesMatch[1], 10) : 0;

		if (sizePx > 0 && sizePx < 48) continue;

		let score = 0;
		if (rel.includes("apple-touch-icon")) score += 100;
		else if (rel.includes("fluid-icon")) score += 80;
		else score += 40;

		if (sizePx >= 120) score += 40;
		else if (sizePx >= 64) score += 20;

		if (resolved.toLowerCase().includes(".png")) score += 10;

		if (score > bestScore) {
			bestScore = score;
			bestUrl = resolved;
		}
	}

	return bestUrl;
}

interface PartialRemoteMetadata {
	title?: string | null;
	description?: string | null;
	imageUrl?: string | null;
	logoUrl?: string | null;
	siteName?: string | null;
}

async function withTimeout<T>(
	fn: (signal: AbortSignal) => Promise<T>,
	timeoutMs = 4500,
): Promise<T | null> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fn(controller.signal);
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}

function mergeMetadata(
	fallback: LinkPreviewMetadata,
	remote: PartialRemoteMetadata | null,
): LinkPreviewMetadata {
	if (!remote) return fallback;

	const rawTitle = remote.title?.trim();
	const usableTitle =
		rawTitle && !isBlockedChallengeTitle(rawTitle) ? rawTitle : null;

	const isGenericGoogleTitle =
		fallback.category === "search" &&
		Boolean(fallback.title.includes("— Google Search")) &&
		Boolean(usableTitle && /^(google|google search)$/i.test(usableTitle));

	const finalTitle = isGenericGoogleTitle
		? fallback.title
		: usableTitle || fallback.title;

	const finalDescription = remote.description?.trim() || fallback.description;

	const usableLogo =
		remote.logoUrl &&
		isRasterLogoUrl(remote.logoUrl) &&
		!remote.logoUrl.toLowerCase().includes("banner")
			? remote.logoUrl
			: fallback.logoUrl;

	const candidateImage =
		remote.imageUrl && remote.imageUrl !== usableLogo
			? remote.imageUrl
			: (fallback.imageUrl ?? null);

	const isIntelligenceIndex =
		finalTitle.toLowerCase().includes("intelligence index") ||
		fallback.category === "index";

	return {
		...fallback,
		category: isIntelligenceIndex ? "index" : fallback.category,
		categoryTag: isIntelligenceIndex
			? "INTELLIGENCE INDEX"
			: fallback.categoryTag,
		title: finalTitle,
		description: finalDescription,
		imageUrl: candidateImage,
		logoUrl: usableLogo ?? fallback.faviconUrl ?? null,
		siteName: remote.siteName?.trim() || fallback.siteName,
	};
}

async function fetchFromSpecialPublicApi(
	link: ExtractedLink,
): Promise<PartialRemoteMetadata | null> {
	const videoId = extractYouTubeVideoId(link);
	if (videoId) {
		return withTimeout(async (signal) => {
			const res = await fetch(
				`https://www.youtube.com/oembed?url=${encodeURIComponent(link.href)}&format=json`,
				{ signal },
			);
			if (!res.ok) return null;
			const data = (await res.json()) as {
				title?: string;
				author_name?: string;
				thumbnail_url?: string;
			};
			if (!data.title) return null;
			return {
				title: data.title,
				description: data.author_name
					? `YouTube · ${data.author_name}`
					: "YouTube Video",
				imageUrl:
					data.thumbnail_url ||
					`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
				siteName: "YouTube",
			};
		}, 3000);
	}

	if (link.hostname === "github.com") {
		const segments = link.pathname.split("/").filter(Boolean);
		if (segments.length === 2) {
			return withTimeout(async (signal) => {
				const res = await fetch(
					`https://api.github.com/repos/${encodeURIComponent(segments[0])}/${encodeURIComponent(segments[1])}`,
					{
						headers: { Accept: "application/vnd.github+json" },
						signal,
					},
				);
				if (!res.ok) return null;
				const data = (await res.json()) as {
					full_name?: string;
					description?: string | null;
					stargazers_count?: number;
					language?: string | null;
				};
				if (!data.full_name) return null;

				const statsParts: string[] = [];
				if (typeof data.stargazers_count === "number") {
					statsParts.push(
						`★ ${data.stargazers_count.toLocaleString()}`,
					);
				}
				if (data.language) statsParts.push(data.language);
				const descParts = [
					data.description,
					statsParts.length > 0 ? statsParts.join(" · ") : null,
				].filter(Boolean);

				return {
					title: data.full_name,
					description:
						descParts.join(" — ") ||
						"Source code repository on GitHub.",
					imageUrl: `https://opengraph.githubassets.com/1/${segments[0]}/${segments[1]}`,
					siteName: "GitHub",
				};
			}, 3000);
		}
	}

	return null;
}

async function fetchFromMicrolink(
	href: string,
): Promise<PartialRemoteMetadata | null> {
	return withTimeout(async (signal) => {
		const response = await fetch(
			`https://api.microlink.io/?url=${encodeURIComponent(href)}`,
			{ signal },
		);
		if (!response.ok) return null;

		const json = (await response.json()) as {
			status?: string;
			data?: {
				title?: string | null;
				description?: string | null;
				publisher?: string | null;
				image?: { url?: string | null } | null;
				logo?: { url?: string | null } | null;
			};
		};
		if (json.status !== "success" || !json.data) return null;

		return {
			title: json.data.title ?? null,
			description: json.data.description ?? null,
			imageUrl: resolveHttpUrl(json.data.image?.url, href),
			logoUrl: resolveHttpUrl(json.data.logo?.url, href),
			siteName: json.data.publisher ?? null,
		};
	}, 4500);
}

async function fetchDirectHtmlMetadata(
	link: ExtractedLink,
): Promise<PartialRemoteMetadata | null> {
	return withTimeout(async (signal) => {
		const response = await fetch(link.href, {
			method: "GET",
			headers: {
				Accept: "text/html,application/xhtml+xml",
				"User-Agent": "Mozilla/5.0 (compatible; ImpulseBot/1.0)",
			},
			signal,
		});

		if (!response.ok) return null;

		const contentType = response.headers.get("content-type") || "";
		if (
			!contentType.includes("text/html") &&
			!contentType.includes("application/xhtml+xml")
		) {
			return null;
		}

		const finalUrl = response.url || link.href;
		const rawHtml = await response.text();
		const headChunk = rawHtml.slice(0, 120_000);

		const title =
			extractMetaTag(headChunk, ["og:title", "twitter:title"]) ||
			extractHtmlTitle(headChunk);
		const description = extractMetaTag(headChunk, [
			"og:description",
			"twitter:description",
			"description",
		]);
		const siteName = extractMetaTag(headChunk, ["og:site_name"]);
		const imageUrl = resolveHttpUrl(
			extractMetaTag(headChunk, ["og:image", "twitter:image"]),
			finalUrl,
		);
		const logoUrl = extractBestIconUrl(headChunk, finalUrl);

		if (!title && !description && !imageUrl) {
			return null;
		}

		if (title && isBlockedChallengeTitle(title)) {
			return null;
		}

		return {
			title,
			description,
			imageUrl,
			logoUrl,
			siteName,
		};
	}, 4500);
}

export async function fetchLinkPreviewMetadata(
	link: ExtractedLink,
	options: { allowRemoteFetch?: boolean } = {},
): Promise<LinkPreviewMetadata> {
	const fallback = resolveStaticLinkMetadata(link);

	if (options.allowRemoteFetch === false) {
		return fallback;
	}

	const isGoogleSearchPage =
		isGoogleDomain(link.hostname) &&
		(link.pathname.toLowerCase().startsWith("/search") ||
			Boolean(link.searchParams.q?.trim()));

	if (isGoogleSearchPage) {
		return fallback;
	}

	const isBrowserEnv = typeof document !== "undefined";

	if (!isBrowserEnv) {
		const direct = await fetchDirectHtmlMetadata(link);
		if (direct) {
			return mergeMetadata(fallback, direct);
		}
	}

	const special = await fetchFromSpecialPublicApi(link);
	if (special?.title) {
		return mergeMetadata(fallback, special);
	}

	const microlink = await fetchFromMicrolink(link.href);
	if (microlink) {
		return mergeMetadata(fallback, microlink);
	}

	return fallback;
}
