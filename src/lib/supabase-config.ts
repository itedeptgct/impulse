export interface SupabaseConfigStatus {
	isConfigured: boolean;
	missingKeys: string[];
	errorMessage: string | null;
}

export function getSupabaseConfigStatus(
	url: string | undefined = process.env.EXPO_PUBLIC_SUPABASE_URL,
	key: string | undefined = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
): SupabaseConfigStatus {
	const missingKeys: string[] = [];

	if (!url || !url.trim()) {
		missingKeys.push("EXPO_PUBLIC_SUPABASE_URL");
	}

	if (!key || !key.trim()) {
		missingKeys.push("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
	}

	if (missingKeys.length > 0) {
		return {
			isConfigured: false,
			missingKeys,
			errorMessage: `Missing required Supabase configuration: ${missingKeys.join(", ")}. Please define them in your .env file.`,
		};
	}

	return {
		isConfigured: true,
		missingKeys: [],
		errorMessage: null,
	};
}
