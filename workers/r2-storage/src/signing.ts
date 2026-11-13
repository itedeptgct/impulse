const encoder = new TextEncoder();

async function importHmacKey(secret: string): Promise<CryptoKey> {
	if (!secret || secret.trim().length === 0) {
		throw new Error("Missing SIGNING_SECRET in environment");
	}
	return crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
}

function toHex(bytes: Uint8Array): string {
	let hex = "";
	for (let i = 0; i < bytes.length; i++) {
		hex += bytes[i]!.toString(16).padStart(2, "0");
	}
	return hex;
}

function fromHex(hex: string): Uint8Array | null {
	if (
		hex.length === 0 ||
		hex.length % 2 !== 0 ||
		!/^[0-9a-fA-F]+$/.test(hex)
	) {
		return null;
	}
	const out = new Uint8Array(hex.length / 2);
	for (let i = 0; i < out.length; i++) {
		out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) {
		return false;
	}
	let diff = 0;
	for (let i = 0; i < a.length; i++) {
		diff |= a[i]! ^ b[i]!;
	}
	return diff === 0;
}

export async function signPath(
	path: string,
	exp: number,
	secret: string,
): Promise<string> {
	const key = await importHmacKey(secret);
	const payload = encoder.encode(`${path}:${exp}`);
	const signature = await crypto.subtle.sign("HMAC", key, payload);
	return toHex(new Uint8Array(signature));
}

export async function verifySignedPath(
	path: string,
	exp: number,
	sig: string,
	secret: string,
): Promise<boolean> {
	if (!Number.isFinite(exp) || exp <= Math.floor(Date.now() / 1000)) {
		return false;
	}

	const providedBytes = fromHex(sig);
	if (!providedBytes) {
		return false;
	}

	const expectedHex = await signPath(path, exp, secret);
	const expectedBytes = fromHex(expectedHex);
	if (!expectedBytes) {
		return false;
	}

	return timingSafeEqual(providedBytes, expectedBytes);
}
