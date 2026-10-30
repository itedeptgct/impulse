export const RICKROLL_MOBILE_APP_URL =
	"https://www.youtube.com/watch?v=dQw4w9WgXcQ";

/**
 * Checks whether the requested route is exempt from the web under-construction screen.
 * Admin moderation desk routes and auth flows remain accessible on web.
 */
export function isExemptWebRoute(
	segments: readonly string[] = [],
	pathname: string = "",
): boolean {
	// Only inspect root route segment to prevent nested param/segment false positives
	const rootSegment = segments[0];
	if (rootSegment === "(admin)" || rootSegment === "admin") {
		return true;
	}
	if (rootSegment === "(auth)" || rootSegment === "auth") {
		return true;
	}

	// Strictly enforce path segment boundaries to prevent false positives (e.g. /admissions, /authors)
	const isAdminPath =
		pathname === "/admin" ||
		pathname.startsWith("/admin/") ||
		pathname === "/(admin)" ||
		pathname.startsWith("/(admin)/");

	if (isAdminPath) {
		return true;
	}

	const isAuthPath =
		pathname === "/auth" ||
		pathname.startsWith("/auth/") ||
		pathname === "/(auth)" ||
		pathname.startsWith("/(auth)/");

	if (isAuthPath) {
		return true;
	}

	return false;
}
