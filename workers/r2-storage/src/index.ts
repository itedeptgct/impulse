import { type Env, isUserAdmin, verifySupabaseUser } from "./auth";
import { signPath, verifySignedPath } from "./signing";

export type { Env };

export interface WorkerDeps {
	fetchImpl?: typeof fetch;
}

const ALLOWED_MIME_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
	"application/pdf",
]);

const MAX_SIGNED_URL_TTL_SECONDS = 3600;
const DEFAULT_SIGNED_URL_TTL_SECONDS = 300;

const CORS_HEADERS: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "Authorization, Content-Type",
	"Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			...CORS_HEADERS,
		},
	});
}

function validateAndDecodeKey(rawKey: string): string | null {
	let decoded: string;
	try {
		decoded = decodeURIComponent(rawKey);
	} catch {
		return null;
	}

	if (
		decoded.length === 0 ||
		decoded.startsWith("/") ||
		decoded.includes("..") ||
		decoded.includes("\\") ||
		decoded.includes("\0")
	) {
		return null;
	}

	return decoded;
}

function resolveBucket(
	bucketName: string,
	env: Env,
): { bucket: R2Bucket; publicBaseUrl?: string } | null {
	switch (bucketName) {
		case "avatars":
			return {
				bucket: env.AVATARS_BUCKET,
				publicBaseUrl: env.R2_AVATARS_URL,
			};
		case "post-media":
			return {
				bucket: env.POST_MEDIA_BUCKET,
				publicBaseUrl: env.R2_POST_MEDIA_URL,
			};
		case "id-documents":
			return { bucket: env.ID_DOCUMENTS_BUCKET };
		default:
			return null;
	}
}

async function deletePrefixFromBucket(
	bucket: R2Bucket,
	prefix: string,
): Promise<number> {
	let deletedCount = 0;
	let cursor: string | undefined;

	do {
		const listed = await bucket.list({ prefix, cursor });
		const keys = listed.objects.map((obj) => obj.key);
		if (keys.length > 0) {
			await bucket.delete(keys);
			deletedCount += keys.length;
		}
		cursor = listed.truncated ? listed.cursor : undefined;
	} while (cursor !== undefined);

	return deletedCount;
}

export function createWorkerHandler(deps: WorkerDeps = {}) {
	const fetchImpl = deps.fetchImpl ?? fetch;

	return {
		async fetch(
			request: Request,
			env: Env,
			ctx?: ExecutionContext,
		): Promise<Response> {
			if (request.method === "OPTIONS") {
				return new Response(null, {
					status: 204,
					headers: CORS_HEADERS,
				});
			}

			const url = new URL(request.url);
			const pathname = url.pathname;

			try {
				// PUT /upload/:bucket/:key+
				if (
					request.method === "PUT" &&
					pathname.startsWith("/upload/")
				) {
					const authHeader = request.headers.get("Authorization");
					const user = await verifySupabaseUser(
						authHeader,
						env,
						fetchImpl,
					);
					if (!user) {
						return jsonResponse({ error: "Unauthorized" }, 401);
					}

					const rest = pathname.slice("/upload/".length);
					const slashIdx = rest.indexOf("/");
					if (slashIdx <= 0) {
						return jsonResponse(
							{ error: "Invalid upload path" },
							400,
						);
					}

					const bucketName = rest.slice(0, slashIdx);
					const rawKey = rest.slice(slashIdx + 1);
					const bucketConfig = resolveBucket(bucketName, env);
					if (!bucketConfig) {
						return jsonResponse({ error: "Unknown bucket" }, 400);
					}

					const key = validateAndDecodeKey(rawKey);
					if (!key) {
						return jsonResponse(
							{ error: "Invalid object key" },
							400,
						);
					}

					if (!key.startsWith(`${user.id}/`)) {
						return jsonResponse({ error: "Forbidden" }, 403);
					}

					const rawContentType =
						request.headers.get("Content-Type") ?? "";
					const mimeType =
						rawContentType.split(";")[0]?.trim().toLowerCase() ??
						"";
					if (!ALLOWED_MIME_TYPES.has(mimeType)) {
						return jsonResponse(
							{ error: "Unsupported Media Type" },
							415,
						);
					}

					const body = await request.arrayBuffer();
					await bucketConfig.bucket.put(key, body, {
						httpMetadata: { contentType: mimeType },
					});

					if (bucketConfig.publicBaseUrl) {
						const baseUrl = bucketConfig.publicBaseUrl.replace(
							/\/+$/,
							"",
						);
						return jsonResponse({
							path: key,
							publicUrl: `${baseUrl}/${key}`,
						});
					}

					return jsonResponse({ path: key });
				}

				// POST /signed-url/id-documents
				if (
					request.method === "POST" &&
					pathname === "/signed-url/id-documents"
				) {
					const authHeader = request.headers.get("Authorization");
					const user = await verifySupabaseUser(
						authHeader,
						env,
						fetchImpl,
					);
					if (!user || !authHeader) {
						return jsonResponse({ error: "Unauthorized" }, 401);
					}

					let body: { path?: unknown; expiresIn?: unknown };
					try {
						body = (await request.json()) as {
							path?: unknown;
							expiresIn?: unknown;
						};
					} catch {
						return jsonResponse(
							{ error: "Invalid JSON body" },
							400,
						);
					}

					if (!body || typeof body.path !== "string") {
						return jsonResponse({ error: "Missing path" }, 400);
					}

					const key = validateAndDecodeKey(body.path);
					if (!key) {
						return jsonResponse(
							{ error: "Invalid object key" },
							400,
						);
					}

					const isOwner = key.startsWith(`${user.id}/`);
					if (!isOwner) {
						const admin = await isUserAdmin(
							user.id,
							authHeader,
							env,
							fetchImpl,
						);
						if (!admin) {
							return jsonResponse({ error: "Forbidden" }, 403);
						}
					}

					let ttl = DEFAULT_SIGNED_URL_TTL_SECONDS;
					if (body.expiresIn !== undefined) {
						if (
							typeof body.expiresIn !== "number" ||
							!Number.isFinite(body.expiresIn) ||
							body.expiresIn <= 0
						) {
							return jsonResponse(
								{ error: "Invalid expiresIn" },
								400,
							);
						}
						ttl = Math.min(
							Math.floor(body.expiresIn),
							MAX_SIGNED_URL_TTL_SECONDS,
						);
					}

					const exp = Math.floor(Date.now() / 1000) + ttl;
					const sig = await signPath(key, exp, env.SIGNING_SECRET);
					const signedUrl = `${url.origin}/private/id-documents/${key}?exp=${exp}&sig=${sig}`;

					return jsonResponse({ signedUrl });
				}

				// GET /public/:bucket/:key+ (avatars and post-media only)
				if (
					request.method === "GET" &&
					pathname.startsWith("/public/")
				) {
					const rest = pathname.slice("/public/".length);
					const slashIdx = rest.indexOf("/");
					if (slashIdx <= 0) {
						return jsonResponse({ error: "Not Found" }, 404);
					}

					const bucketName = rest.slice(0, slashIdx);
					if (
						bucketName !== "avatars" &&
						bucketName !== "post-media"
					) {
						return jsonResponse({ error: "Not Found" }, 404);
					}

					const bucketConfig = resolveBucket(bucketName, env);
					if (!bucketConfig) {
						return jsonResponse({ error: "Not Found" }, 404);
					}

					const key = validateAndDecodeKey(rest.slice(slashIdx + 1));
					if (!key) {
						return jsonResponse(
							{ error: "Invalid object key" },
							400,
						);
					}

					const edgeCache =
						typeof caches !== "undefined"
							? (caches as unknown as { default?: Cache }).default
							: undefined;
					const cacheKey = new Request(url.toString(), {
						method: "GET",
					});

					if (edgeCache) {
						const cached = await edgeCache.match(cacheKey);
						if (cached) {
							return cached;
						}
					}

					const obj = await bucketConfig.bucket.get(key);
					if (!obj) {
						return jsonResponse({ error: "Not Found" }, 404);
					}

					const headers = new Headers(CORS_HEADERS);
					obj.writeHttpMetadata(headers);
					if (!headers.has("Content-Type")) {
						headers.set("Content-Type", "application/octet-stream");
					}
					if (obj.httpEtag) {
						headers.set("ETag", obj.httpEtag);
					}
					headers.set(
						"Cache-Control",
						"public, max-age=31536000, immutable",
					);

					const response = new Response(obj.body, {
						status: 200,
						headers,
					});

					if (edgeCache) {
						const putPromise = edgeCache.put(
							cacheKey,
							response.clone(),
						);
						if (ctx) {
							ctx.waitUntil(putPromise);
						} else {
							await putPromise;
						}
					}

					return response;
				}

				// GET /private/id-documents/:key+?exp=...&sig=...
				if (
					request.method === "GET" &&
					pathname.startsWith("/private/id-documents/")
				) {
					const rawKey = pathname.slice(
						"/private/id-documents/".length,
					);
					const key = validateAndDecodeKey(rawKey);
					if (!key) {
						return jsonResponse(
							{ error: "Invalid object key" },
							400,
						);
					}

					const expParam = url.searchParams.get("exp");
					const sig = url.searchParams.get("sig");
					if (!expParam || !sig) {
						return jsonResponse({ error: "Forbidden" }, 403);
					}

					const exp = Number(expParam);
					const valid = await verifySignedPath(
						key,
						exp,
						sig,
						env.SIGNING_SECRET,
					);
					if (!valid) {
						return jsonResponse({ error: "Forbidden" }, 403);
					}

					const obj = await env.ID_DOCUMENTS_BUCKET.get(key);
					if (!obj) {
						return jsonResponse({ error: "Not Found" }, 404);
					}

					const headers = new Headers(CORS_HEADERS);
					obj.writeHttpMetadata(headers);
					if (!headers.has("Content-Type")) {
						headers.set("Content-Type", "application/octet-stream");
					}
					headers.set("Cache-Control", "private, no-store");

					return new Response(obj.body, {
						status: 200,
						headers,
					});
				}

				// DELETE /user-objects
				if (
					request.method === "DELETE" &&
					pathname === "/user-objects"
				) {
					const authHeader = request.headers.get("Authorization");
					const user = await verifySupabaseUser(
						authHeader,
						env,
						fetchImpl,
					);
					if (!user) {
						return jsonResponse({ error: "Unauthorized" }, 401);
					}

					const prefix = `${user.id}/`;
					const counts = await Promise.all([
						deletePrefixFromBucket(env.AVATARS_BUCKET, prefix),
						deletePrefixFromBucket(env.POST_MEDIA_BUCKET, prefix),
						deletePrefixFromBucket(env.ID_DOCUMENTS_BUCKET, prefix),
					]);

					const deletedCount = counts.reduce((sum, n) => sum + n, 0);
					return jsonResponse({ deletedCount });
				}

				return jsonResponse({ error: "Not Found" }, 404);
			} catch (err) {
				console.error("Worker unhandled error:", err);
				return jsonResponse({ error: "Internal server error" }, 500);
			}
		},
	};
}

export default createWorkerHandler();
