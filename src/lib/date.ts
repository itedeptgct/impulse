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
