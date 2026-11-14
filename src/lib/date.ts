export function formatRelativeTime(isoString: string): string {
	const created = new Date(isoString).getTime();
	if (Number.isNaN(created)) return "now";

	const mins = Math.floor(Math.max(0, Date.now() - created) / 60_000);
	if (mins < 1) return "now";
	if (mins < 60) return `${mins}m ago`;

	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;

	return `${Math.floor(hours / 24)}d ago`;
}

export function formatEventDateTime(dateString?: string | null): string {
	if (!dateString) return "";
	const trimmed = dateString.trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
		const date = new Date(trimmed);
		if (!Number.isNaN(date.getTime())) {
			const datePart = date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			});
			const timePart = date.toLocaleTimeString("en-US", {
				hour: "numeric",
				minute: "2-digit",
			});
			return `${datePart.toUpperCase()} • ${timePart.toUpperCase()}`;
		}
	}
	return trimmed;
}
