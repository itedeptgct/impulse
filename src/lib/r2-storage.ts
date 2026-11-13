import { supabase } from "./supabase";

export type R2BucketName = "avatars" | "post-media" | "id-documents";

export interface R2StorageOptions {
	workerUrl?: string;
	getAccessToken?: () => Promise<string | null | undefined>;
	fetchImpl?: typeof fetch;
}

function resolveWorkerUrl(options?: R2StorageOptions): string {
	const rawUrl = options?.workerUrl ?? process.env.EXPO_PUBLIC_R2_WORKER_URL;
	const trimmed = rawUrl?.trim();
	if (!trimmed) {
		throw new Error(
			"EXPO_PUBLIC_R2_WORKER_URL is not configured. Please set EXPO_PUBLIC_R2_WORKER_URL in your environment.",
		);
	}
	return trimmed.replace(/\/+$/, "");
}

async function resolveAccessToken(options?: R2StorageOptions): Promise<string> {
	if (options?.getAccessToken) {
		const token = await options.getAccessToken();
		if (!token) {
			throw new Error("Not authenticated");
		}
		return token;
	}

	const { data, error } = await supabase.auth.getSession();
	const token = data?.session?.access_token;
	if (error || !token) {
		throw new Error("Not authenticated");
	}
	return token;
}

function cleanFilePath(filePath: string): string {
	const cleaned = filePath.replace(/^\/+/, "");
	if (!cleaned) {
		throw new Error("File path cannot be empty");
	}
	return cleaned;
}

async function handleResponseError(response: Response): Promise<never> {
	let message: string | undefined;
	try {
		const json = (await response.json()) as { error?: string };
		message = json?.error;
	} catch {
		// Non-JSON or unparseable response
	}
	throw new Error(
		message || `R2 storage request failed with status ${response.status}`,
	);
}

export async function uploadToR2(
	bucket: R2BucketName,
	filePath: string,
	binaryData: ArrayBuffer | Uint8Array,
	contentType: string,
	options?: R2StorageOptions,
): Promise<{ path: string; publicUrl?: string }> {
	const workerUrl = resolveWorkerUrl(options);
	const token = await resolveAccessToken(options);
	const cleanKey = cleanFilePath(filePath);
	const fetchFn = options?.fetchImpl ?? fetch;

	const response = await fetchFn(
		`${workerUrl}/upload/${bucket}/${cleanKey}`,
		{
			method: "PUT",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": contentType,
			},
			body: binaryData as unknown as BodyInit,
		},
	);

	if (!response.ok) {
		await handleResponseError(response);
	}

	return (await response.json()) as { path: string; publicUrl?: string };
}

export async function getR2SignedDocumentUrl(
	filePath: string,
	expiresInOrOptions?: number | R2StorageOptions,
	options?: R2StorageOptions,
): Promise<string> {
	let expiresIn: number | undefined;
	let resolvedOptions = options;

	if (typeof expiresInOrOptions === "number") {
		expiresIn = expiresInOrOptions;
	} else if (expiresInOrOptions && typeof expiresInOrOptions === "object") {
		resolvedOptions = expiresInOrOptions;
	}

	const workerUrl = resolveWorkerUrl(resolvedOptions);
	const token = await resolveAccessToken(resolvedOptions);
	const cleanKey = cleanFilePath(filePath);
	const fetchFn = resolvedOptions?.fetchImpl ?? fetch;

	const payload: { path: string; expiresIn?: number } = { path: cleanKey };
	if (typeof expiresIn === "number") {
		payload.expiresIn = expiresIn;
	}

	const response = await fetchFn(`${workerUrl}/signed-url/id-documents`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		await handleResponseError(response);
	}

	const data = (await response.json()) as { signedUrl: string };
	return data.signedUrl;
}

export async function deleteOwnR2Objects(
	options?: R2StorageOptions,
): Promise<number> {
	const workerUrl = resolveWorkerUrl(options);
	const token = await resolveAccessToken(options);
	const fetchFn = options?.fetchImpl ?? fetch;

	const response = await fetchFn(`${workerUrl}/user-objects`, {
		method: "DELETE",
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	if (!response.ok) {
		await handleResponseError(response);
	}

	const data = (await response.json()) as { deletedCount: number };
	return data.deletedCount;
}
