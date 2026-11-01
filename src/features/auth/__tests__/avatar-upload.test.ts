import {
	blobToArrayBuffer,
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

	// 3. Test React Native Blob behavior where blob.arrayBuffer is undefined
	const simulatedRnBlob: any = new Blob(["hello-world"], {
		type: "text/plain",
	});
	// Delete or set arrayBuffer to undefined to mirror React Native Hermes
	simulatedRnBlob.arrayBuffer = undefined;

	// Mock React Native FileReader
	const originalFileReader = (globalThis as any).FileReader;
	class MockRnFileReader {
		result: ArrayBuffer | null = null;
		onload: (() => void) | null = null;
		onerror: ((e: any) => void) | null = null;

		readAsArrayBuffer(_blob: any) {
			const text = "hello-world";
			const buf = new ArrayBuffer(text.length);
			const view = new Uint8Array(buf);
			for (let i = 0; i < text.length; i++) {
				view[i] = text.charCodeAt(i);
			}
			this.result = buf;
			setTimeout(() => {
				this.onload?.();
			}, 0);
		}
	}
	(globalThis as any).FileReader = MockRnFileReader;

	try {
		const convertedBuffer = await blobToArrayBuffer(simulatedRnBlob);
		if (!(convertedBuffer instanceof ArrayBuffer)) {
			throw new Error(
				"blobToArrayBuffer failed on simulated RN Blob with FileReader",
			);
		}
		if (convertedBuffer.byteLength !== 11) {
			throw new Error(
				`Expected 11 bytes, got ${convertedBuffer.byteLength} bytes`,
			);
		}
	} finally {
		if (originalFileReader) {
			(globalThis as any).FileReader = originalFileReader;
		} else {
			delete (globalThis as any).FileReader;
		}
	}

	console.log("Upload utils and binary reading tests passed successfully!");
}

await testUploadUtils();
