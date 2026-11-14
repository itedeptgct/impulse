/**
 * Determines whether a target user should appear online to the viewer
 */
export function isUserOnline(
	targetUserId: string | undefined | null,
	onlineUserIds: Set<string>,
	viewerShowActiveStatus = true,
	targetShowActiveStatus = true,
): boolean {
	if (!targetUserId) return false;
	if (!viewerShowActiveStatus || !targetShowActiveStatus) return false;
	return onlineUserIds.has(targetUserId);
}

/**
 * Formats a `last_seen_at` ISO timestamp into a concise relative status string.
 * Returns null if reciprocal privacy hides active status or timestamp is invalid.
 */
export function formatLastSeen(
	lastSeenAt: string | null | undefined,
	viewerShowActiveStatus = true,
	targetShowActiveStatus = true,
	now: Date = new Date(),
): string | null {
	if (!viewerShowActiveStatus || !targetShowActiveStatus || !lastSeenAt) {
		return null;
	}

	const seenDate = new Date(lastSeenAt);
	const diffMs = now.getTime() - seenDate.getTime();
	if (!Number.isFinite(diffMs) || diffMs < 0) {
		return "Active just now";
	}

	const diffMinutes = Math.floor(diffMs / 60_000);
	if (diffMinutes < 1) {
		return "Active just now";
	}
	if (diffMinutes < 60) {
		return `Active ${diffMinutes}m ago`;
	}

	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) {
		return `Active ${diffHours}h ago`;
	}

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays <= 7) {
		return `Active ${diffDays}d ago`;
	}

	return null;
}
