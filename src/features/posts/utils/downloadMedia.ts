import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

function getFilename(url: string, fallback = "impulse-asset.jpg"): string {
	try {
		const parsed = new URL(url);
		const pathname = parsed.pathname;
		const name = pathname.substring(pathname.lastIndexOf("/") + 1);
		if (name && name.includes(".")) {
			return name;
		}
	} catch {
		const parts = url.split("?")[0].split("/");
		const lastPart = parts[parts.length - 1];
		if (lastPart && lastPart.includes(".")) {
			return lastPart;
		}
	}
	return fallback;
}

export interface DownloadResult {
	success: boolean;
	error?: string;
}

export async function downloadMedia(
	url: string,
	customFilename?: string,
): Promise<DownloadResult> {
	if (!url) {
		return { success: false, error: "Invalid media URL" };
	}

	const filename = customFilename || getFilename(url);

	try {
		if (Platform.OS === "web") {
			try {
				const response = await fetch(url);
				if (!response.ok) {
					throw new Error(`HTTP error ${response.status}`);
				}
				const blob = await response.blob();
				const blobUrl = window.URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.href = blobUrl;
				link.download = filename;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				window.URL.revokeObjectURL(blobUrl);
				return { success: true };
			} catch {
				if (typeof window !== "undefined") {
					const link = document.createElement("a");
					link.href = url;
					link.target = "_blank";
					link.download = filename;
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
					return { success: true };
				}
				return {
					success: false,
					error: "Failed to download asset on web",
				};
			}
		}

		// Native (iOS / Android)
		const baseDir =
			FileSystem.cacheDirectory || FileSystem.documentDirectory;
		if (!baseDir) {
			return { success: false, error: "Storage directory unavailable" };
		}

		const localUri = `${baseDir}${Date.now()}_${filename}`;
		const downloadResult = await FileSystem.downloadAsync(url, localUri);

		if (downloadResult.status !== 200 && downloadResult.status !== 0) {
			return {
				success: false,
				error: `Download failed with status ${downloadResult.status}`,
			};
		}

		const canShare = await Sharing.isAvailableAsync();
		if (canShare) {
			await Sharing.shareAsync(downloadResult.uri, {
				dialogTitle: "Save or share media",
				mimeType: filename.endsWith(".png")
					? "image/png"
					: filename.endsWith(".webp")
						? "image/webp"
						: "image/jpeg",
			});
		}

		try {
			await Haptics.notificationAsync(
				Haptics.NotificationFeedbackType.Success,
			);
		} catch {}

		return { success: true };
	} catch (err: any) {
		return {
			success: false,
			error: err?.message || "Failed to download media",
		};
	}
}
