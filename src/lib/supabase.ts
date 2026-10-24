try {
	if (
		typeof globalThis.URL !== "function" ||
		!globalThis.URL.prototype?.toJSON
	) {
		require("react-native-url-polyfill/auto");
	}
} catch {
	// Fallback for environments with native URL support
}
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabasePubKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

if (!supabaseUrl || !supabasePubKey) {
	throw new Error(
		"Missing Supabase URL or Publishable Key in environment variables.",
	);
}

export const supabase = createClient(supabaseUrl, supabasePubKey, {
	auth: {
		storage: AsyncStorage,
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: false,
	},
});
