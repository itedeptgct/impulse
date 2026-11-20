import AsyncStorage from "@react-native-async-storage/async-storage";

const GITHUB_PROMPT_DISMISSED_KEY = "impulse_github_prompt_dismissed";

/**
 * Checks whether the user has already dismissed the GitHub connect prompt.
 */
export async function hasGitHubPromptBeenDismissed(
	userId: string,
): Promise<boolean> {
	try {
		const val = await AsyncStorage.getItem(
			`${GITHUB_PROMPT_DISMISSED_KEY}_${userId}`,
		);
		return val === "true";
	} catch {
		return false;
	}
}

/**
 * Marks the GitHub connect prompt as dismissed for this user.
 */
export async function dismissGitHubPrompt(userId: string): Promise<void> {
	try {
		await AsyncStorage.setItem(
			`${GITHUB_PROMPT_DISMISSED_KEY}_${userId}`,
			"true",
		);
	} catch {}
}

/**
 * Checks if the user already has a GitHub identity linked.
 */
export function hasGitHubLinked(
	user: {
		app_metadata?: Record<string, unknown>;
		identities?: Array<{ provider: string }>;
	} | null,
): boolean {
	if (!user) return false;
	const identities = user.identities;
	if (Array.isArray(identities)) {
		return identities.some((i) => i.provider === "github");
	}
	return false;
}
