try {
	if (
		typeof globalThis.URL !== "function" ||
		!globalThis.URL.prototype?.toJSON
	) {
		require("react-native-url-polyfill/auto");
	}
} catch {}
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

import { getSupabaseConfigStatus } from "./supabase-config";

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const rawKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const configStatus = getSupabaseConfigStatus(rawUrl, rawKey);

export const isSupabaseConfigured = configStatus.isConfigured;
export const supabaseConfigError = configStatus.errorMessage;

const resolvedUrl =
	isSupabaseConfigured && rawUrl?.trim()
		? rawUrl.trim()
		: "https://placeholder.supabase.co";
const resolvedKey =
	isSupabaseConfigured && rawKey?.trim() ? rawKey.trim() : "placeholder-key";

export const supabase = createClient(resolvedUrl, resolvedKey, {
	auth: {
		storage: AsyncStorage,
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: false,
	},
});
