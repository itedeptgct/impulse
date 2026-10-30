import {
	RICKROLL_MOBILE_APP_URL,
	isExemptWebRoute,
} from "../utils/web-route-guard.ts";

function assert(condition: boolean, message: string) {
	if (!condition) {
		throw new Error(`Assertion failed: ${message}`);
	}
}

export function testWebRouteGuard() {
	assert(
		RICKROLL_MOBILE_APP_URL ===
			"https://www.youtube.com/watch?v=dQw4w9WgXcQ",
		"RICKROLL_MOBILE_APP_URL matches target Rickroll link",
	);

	// Admin routes
	assert(
		isExemptWebRoute(["(admin)"], "/(admin)") === true,
		"admin segment and path is exempt",
	);
	assert(
		isExemptWebRoute(["(admin)"], "") === true,
		"admin segment alone is exempt",
	);
	assert(
		isExemptWebRoute([], "/admin") === true,
		"admin path alone is exempt",
	);
	assert(
		isExemptWebRoute([], "/(admin)") === true,
		"(admin) path alone is exempt",
	);
	assert(
		isExemptWebRoute(["admin"], "/admin/verify") === true,
		"admin subpath is exempt",
	);

	// Auth routes for admin access
	assert(
		isExemptWebRoute(["(auth)", "sign-in"], "/(auth)/sign-in") === true,
		"(auth) sign-in is exempt",
	);
	assert(
		isExemptWebRoute(["auth", "callback"], "/auth/callback") === true,
		"auth callback is exempt",
	);
	assert(
		isExemptWebRoute([], "/auth/callback") === true,
		"auth callback path is exempt",
	);
	assert(
		isExemptWebRoute([], "/(auth)/sign-in") === true,
		"(auth) sign-in path is exempt",
	);

	// Student-facing routes
	assert(isExemptWebRoute([], "/") === false, "root path is not exempt");
	assert(
		isExemptWebRoute(["(tabs)"], "/(tabs)") === false,
		"tabs route is not exempt",
	);
	assert(
		isExemptWebRoute(["(tabs)", "guilds"], "/(tabs)/guilds") === false,
		"guilds tab is not exempt",
	);
	assert(
		isExemptWebRoute(["(tabs)", "profile"], "/(tabs)/profile") === false,
		"profile tab is not exempt",
	);
	assert(
		isExemptWebRoute(
			["(onboarding)", "onboarding"],
			"/(onboarding)/onboarding",
		) === false,
		"onboarding is not exempt",
	);
	assert(
		isExemptWebRoute(["u", "janleigh"], "/u/janleigh") === false,
		"user profile is not exempt",
	);

	// Prefix boundary protection
	assert(
		isExemptWebRoute([], "/admissions") === false,
		"/admissions must not be exempt",
	);
	assert(
		isExemptWebRoute([], "/administrators") === false,
		"/administrators must not be exempt",
	);
	assert(
		isExemptWebRoute([], "/authors") === false,
		"/authors must not be exempt",
	);
	assert(
		isExemptWebRoute([], "/authenticate") === false,
		"/authenticate must not be exempt",
	);

	// Segment depth protection (only root segment can match admin/auth)
	assert(
		isExemptWebRoute(["(tabs)", "admin"], "/(tabs)/admin") === false,
		"nested admin segment must not bypass guard",
	);
	assert(
		isExemptWebRoute(["(tabs)", "auth"], "/(tabs)/auth") === false,
		"nested auth segment must not bypass guard",
	);

	console.log("Web route guard tests passed!");
}

// Execute immediately when run
testWebRouteGuard();
