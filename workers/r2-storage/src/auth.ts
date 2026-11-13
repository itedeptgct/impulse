export interface Env {
	AVATARS_BUCKET: R2Bucket;
	POST_MEDIA_BUCKET: R2Bucket;
	ID_DOCUMENTS_BUCKET: R2Bucket;
	SUPABASE_URL: string;
	SUPABASE_ANON_KEY: string;
	R2_AVATARS_URL: string;
	R2_POST_MEDIA_URL: string;
	SIGNING_SECRET: string;
}

export async function verifySupabaseUser(
	authHeader: string | null,
	env: Env,
	fetchImpl: typeof fetch = fetch,
): Promise<{ id: string } | null> {
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return null;
	}

	const baseUrl = env.SUPABASE_URL.replace(/\/+$/, "");
	const res = await fetchImpl(`${baseUrl}/auth/v1/user`, {
		method: "GET",
		headers: {
			Authorization: authHeader,
			apikey: env.SUPABASE_ANON_KEY,
		},
	});

	if (!res.ok) {
		return null;
	}

	const data = (await res.json()) as { id?: unknown } | null;
	if (!data || typeof data.id !== "string" || data.id.length === 0) {
		return null;
	}

	return { id: data.id };
}

export async function isUserAdmin(
	userId: string,
	authHeader: string,
	env: Env,
	fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
	const baseUrl = env.SUPABASE_URL.replace(/\/+$/, "");
	const url = `${baseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=role`;
	const res = await fetchImpl(url, {
		method: "GET",
		headers: {
			Authorization: authHeader,
			apikey: env.SUPABASE_ANON_KEY,
		},
	});

	if (!res.ok) {
		return false;
	}

	const rows = (await res.json()) as Array<{ role?: unknown }> | null;
	return Array.isArray(rows) && rows.length > 0 && rows[0]?.role === "admin";
}
