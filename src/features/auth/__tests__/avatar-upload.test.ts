import {
	getContentTypeFromExtension,
	readUriAsBinary,
} from "../utils/upload-utils.ts";

export async function testUploadUtils() {
	// 1. Test MIME type resolution from extension
	if (getContentTypeFromExtension("png") !== "image/png") {
		throw new Error("PNG content type resolution failed");
	}
	if (getContentTypeFromExtension(".webp") !== "image/webp") {
		throw new Error("WebP content type resolution failed");
	}
	if (getContentTypeFromExtension("pdf") !== "application/pdf") {
		throw new Error("PDF content type resolution failed");
	}
	if (getContentTypeFromExtension("jpg") !== "image/jpeg") {
		throw new Error("JPG content type resolution failed");
	}
	if (getContentTypeFromExtension(null) !== "image/jpeg") {
		throw new Error("Default fallback content type failed");
	}

	// 2. Test readUriAsBinary with data URI
	const sampleDataUri =
		"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

	const result = await readUriAsBinary(sampleDataUri, "image/png");

	if (!(result.data instanceof ArrayBuffer)) {
		throw new Error("readUriAsBinary did not return an ArrayBuffer");
	}
	if (result.data.byteLength === 0) {
		throw new Error("readUriAsBinary returned an empty 0-byte buffer");
	}
	if (!result.contentType.includes("image/png")) {
		throw new Error(`Unexpected content type: ${result.contentType}`);
	}

	console.log("Upload utils and binary reading tests passed successfully!");
}

await testUploadUtils();
