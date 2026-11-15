export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export interface FileSizeValidationResult {
	valid: boolean;
	error?: string;
}

/**
 * Validates that a single file's size does not exceed the 10 MB upload limit.
 */
export function validateUploadFileSize(
	fileSize?: number | null,
): FileSizeValidationResult {
	if (typeof fileSize === "number" && fileSize > MAX_UPLOAD_BYTES) {
		return {
			valid: false,
			error: "File exceeds the 10 MB size limit.",
		};
	}
	return { valid: true };
}

/**
 * Validates all selected assets against the 10 MB upload limit before any upload starts.
 */
export function validateBatchFileSizes(
	assets: Array<{ fileSize?: number | null }>,
): FileSizeValidationResult {
	for (const asset of assets) {
		const result = validateUploadFileSize(asset.fileSize);
		if (!result.valid) {
			return result;
		}
	}
	return { valid: true };
}
