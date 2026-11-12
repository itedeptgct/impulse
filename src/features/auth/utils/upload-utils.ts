export function getContentTypeFromExtension(extension?: string | null): string {
	const ext = (extension || "").toLowerCase().replace(/^\./, "");
	switch (ext) {
		case "png":
			return "image/png";
		case "webp":
			return "image/webp";
		case "gif":
			return "image/gif";
		case "pdf":
			return "application/pdf";
		case "jpg":
		case "jpeg":
		default:
			return "image/jpeg";
	}
}

function decodeBase64(base64: string): string {
	if (typeof atob === "function") {
		return atob(base64);
	}
	const globalBuffer = (globalThis as any).Buffer;
	if (globalBuffer?.from) {
		return globalBuffer.from(base64, "base64").toString("binary");
	}
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
	let output = "";
	const cleanBase64 = base64.replace(/[^A-Za-z0-9+/=]/g, "");
	for (let i = 0; i < cleanBase64.length;) {
		const enc1 = chars.indexOf(cleanBase64.charAt(i++));
		const enc2 = chars.indexOf(cleanBase64.charAt(i++));
		const enc3 = chars.indexOf(cleanBase64.charAt(i++));
		const enc4 = chars.indexOf(cleanBase64.charAt(i++));

		const chr1 = (enc1 << 2) | (enc2 >> 4);
		const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
		const chr3 = ((enc3 & 3) << 6) | enc4;

		output += String.fromCharCode(chr1);
		if (enc3 !== 64 && enc3 !== -1) {
			output += String.fromCharCode(chr2);
		}
		if (enc4 !== 64 && enc4 !== -1) {
			output += String.fromCharCode(chr3);
		}
	}
	return output;
}

export async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
	if (typeof (blob as any).arrayBuffer === "function") {
		return (blob as any).arrayBuffer();
	}

	if (typeof FileReader !== "undefined") {
		return new Promise<ArrayBuffer>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				if (reader.result instanceof ArrayBuffer) {
					resolve(reader.result);
				} else if (typeof reader.result === "string") {
					const base64 = reader.result.includes(",")
						? reader.result.split(",")[1]
						: reader.result;
					const binaryString = decodeBase64(base64);
					const len = binaryString.length;
					const bytes = new Uint8Array(len);
					for (let i = 0; i < len; i++) {
						bytes[i] = binaryString.charCodeAt(i);
					}
					resolve(bytes.buffer);
				} else {
					reject(new Error("Unable to read blob as ArrayBuffer"));
				}
			};
			reader.onerror = () => {
				reject(
					reader.error ||
						new Error("FileReader error while reading blob"),
				);
			};

			if (typeof reader.readAsArrayBuffer === "function") {
				reader.readAsArrayBuffer(blob);
			} else if (typeof reader.readAsDataURL === "function") {
				reader.readAsDataURL(blob);
			} else {
				reject(
					new Error(
						"FileReader does not support arrayBuffer or dataURL",
					),
				);
			}
		});
	}

	if (typeof Response !== "undefined") {
		try {
			const res = new Response(blob);
			if (typeof res.arrayBuffer === "function") {
				return await res.arrayBuffer();
			}
		} catch {}
	}

	if (typeof (blob as any).bytes === "function") {
		const bytes = await (blob as any).bytes();
		return bytes.buffer.slice(
			bytes.byteOffset,
			bytes.byteOffset + bytes.byteLength,
		);
	}

	throw new Error(
		"No available method to convert Blob to ArrayBuffer in this environment.",
	);
}

export async function readUriAsBinary(
	uri: string,
	mimeTypeFallback = "image/jpeg",
): Promise<{ data: ArrayBuffer; contentType: string }> {
	if (uri.startsWith("data:")) {
		const commaIndex = uri.indexOf(",");
		if (commaIndex !== -1) {
			const meta = uri.slice(0, commaIndex);
			const base64 = uri.slice(commaIndex + 1);
			const mimeMatch = meta.match(/data:([^;]+)/);
			const contentType = mimeMatch ? mimeMatch[1] : mimeTypeFallback;

			const binaryString = decodeBase64(base64);
			const len = binaryString.length;
			const bytes = new Uint8Array(len);
			for (let i = 0; i < len; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}
			return {
				data: bytes.buffer,
				contentType,
			};
		}
	}

	const response = await fetch(uri);
	const responseContentType =
		response.headers?.get?.("content-type") || mimeTypeFallback;

	if (typeof response.arrayBuffer === "function") {
		try {
			const buf = await response.arrayBuffer();
			if (buf instanceof ArrayBuffer && buf.byteLength > 0) {
				return { data: buf, contentType: responseContentType };
			}
		} catch {}
	}

	const blob = await response.blob();
	const contentType = blob.type || responseContentType;
	const data = await blobToArrayBuffer(blob);

	return {
		data,
		contentType,
	};
}
