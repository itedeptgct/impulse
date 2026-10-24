// Setup memory localStorage polyfill for test environment
if (typeof globalThis.window === "undefined") {
	const storage = new Map<string, string>();
	(globalThis as any).window = {
		localStorage: {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => storage.set(key, value),
			removeItem: (key: string) => storage.delete(key),
			clear: () => storage.clear(),
		},
	};
}

import { fetchProfileByUsername, updateUserProfile } from "../api";
import type { Profile } from "../types";

export async function testProfileCustomization() {
	const initialProfile: Profile = {
		id: "user-test-profile",
		username: "coder123",
		email: "coder@test.com",
		role: "user",
		guild: "octagram",
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};

	// Seed cache
	await updateUserProfile("user-test-profile", initialProfile);

	const updated = await updateUserProfile("user-test-profile", {
		bio: "Systems architect and open source fan.",
		major: "Computer Science",
		avatar_url: "https://example.com/avatar.png",
	});

	if (updated.bio !== "Systems architect and open source fan.") {
		throw new Error("Bio was not properly updated");
	}
	if (updated.major !== "Computer Science") {
		throw new Error("Major was not properly updated");
	}

	const fetched = await fetchProfileByUsername("CODER123");
	if (!fetched || fetched.bio !== "Systems architect and open source fan.") {
		throw new Error("Case-insensitive fetchProfileByUsername failed");
	}

	console.log("Profile customization test passed!");
}
