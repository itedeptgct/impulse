/**
 * Binary storage upload utilities.
 * Converts local URIs into standard ArrayBuffers via expo-blob / fetch
 * to ensure reliable binary uploads across native mobile and web.
 */

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

export async function readUriAsBinary(
	uri: string,
	mimeTypeFallback = "image/jpeg",
): Promise<{ data: ArrayBuffer; contentType: string }> {
	const response = await fetch(uri);
	const blob = await response.blob();
	const arrayBuffer = await blob.arrayBuffer();
	const contentType = blob.type || mimeTypeFallback;

	return {
		data: arrayBuffer,
		contentType,
	};
}
