import { supabase } from "@lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { IdVerification, Profile } from "./types";

export async function signIn(email: string, password: string) {
	const { data, error } = await supabase.auth.signInWithPassword({
		email: email,
		password: password,
	});
	if (error) throw error;
	return data;
}

export async function signUp(
	username: string,
	email: string,
	password: string,
	displayName?: string,
) {
	const normalizedUsername = username.toLowerCase().trim();
	const trimmedDisplayName = (displayName || username).trim();

	const { data, error } = await supabase.auth.signUp({
		email: email,
		password: password,
		options: {
			data: {
				username: normalizedUsername,
				display_name: trimmedDisplayName,
			},
		},
	});

	if (error) throw error;
	return data;
}

export async function signOut() {
	const { error } = await supabase.auth.signOut();
	if (error) throw error;
}

export async function resetPasswordForEmail(email: string) {
	let redirectTo = "auth/callback";
	try {
		const Linking = require("expo-linking");
		redirectTo = Linking.createURL("auth/callback");
	} catch {
		// Fallback
	}
	const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
		redirectTo,
	});
	if (error) throw error;
	return data;
}

export async function handleAuthCallbackUrl(url: string) {
	let parsed: any;
	try {
		const Linking = require("expo-linking");
		parsed = Linking.parse(url);
	} catch {
		parsed = { queryParams: {} };
	}

	// check for error parameters
	const errorDescription =
		(parsed.queryParams?.error_description as string) ||
		(parsed.queryParams?.error as string);
	if (errorDescription) {
		throw new Error(errorDescription);
	}

	// PKCE flow code exchange
	const code = parsed.queryParams?.code as string | undefined;
	if (code) {
		const { data, error } =
			await supabase.auth.exchangeCodeForSession(code);
		if (error) throw error;
		return data;
	}

	// implicit flow in query params
	const accessToken = parsed.queryParams?.access_token as string | undefined;
	const refreshToken = parsed.queryParams?.refresh_token as
		| string
		| undefined;
	if (accessToken && refreshToken) {
		const { data, error } = await supabase.auth.setSession({
			access_token: accessToken,
			refresh_token: refreshToken,
		});
		if (error) throw error;
		return data;
	}

	// implicit flow in URL hash fragments (#access_token=...&refresh_token=...)
	if (url.includes("#")) {
		const hashFragment = url.split("#")[1];
		if (hashFragment) {
			const hashParams = new URLSearchParams(hashFragment);
			const hashAccessToken = hashParams.get("access_token");
			const hashRefreshToken = hashParams.get("refresh_token");
			const hashError =
				hashParams.get("error_description") || hashParams.get("error");
			if (hashError) throw new Error(hashError);
			if (hashAccessToken && hashRefreshToken) {
				const { data, error } = await supabase.auth.setSession({
					access_token: hashAccessToken,
					refresh_token: hashRefreshToken,
				});
				if (error) throw error;
				return data;
			}
		}
	}

	// fallback to reading current session
	const { data: sessionData, error: sessionError } =
		await supabase.auth.getSession();
	if (sessionError) throw sessionError;
	return sessionData;
}

export async function signInWithGoogle(): Promise<{ session?: any } | null> {
	throw new Error("Google sign-in is currently disabled.");
}

export async function uploadIdDocument(
	userId: string,
	uri: string,
	originalName?: string | null,
) {
	const extension = originalName?.split(".").pop() || "jpg";
	const filePath = `${userId}/${Date.now()}.${extension}`;

	const response = await fetch(uri);
	const blob = await response.blob();

	const { data, error } = await supabase.storage
		.from("id-documents")
		.upload(filePath, blob, {
			contentType: blob.type || "image/jpeg",
			upsert: true,
		});

	if (error) throw error;
	return data.path;
}

export async function uploadAvatar(
	userId: string,
	uri: string,
	originalName?: string | null,
): Promise<string> {
	const extension = originalName?.split(".").pop() || "jpg";
	const filePath = `${userId}/${Date.now()}.${extension}`;

	const response = await fetch(uri);
	const blob = await response.blob();

	const { data, error } = await supabase.storage
		.from("avatars")
		.upload(filePath, blob, {
			contentType: blob.type || "image/jpeg",
			upsert: true,
		});

	if (error) throw error;

	const { data: publicData } = supabase.storage
		.from("avatars")
		.getPublicUrl(data.path);

	return publicData.publicUrl;
}

export async function createIdVerification(
	userId: string,
	documentUrl: string,
) {
	const { data, error } = await supabase
		.from("id_verifications")
		.insert({
			user_id: userId,
			document_url: documentUrl,
			status: "pending",
		})
		.select()
		.single();

	if (error) throw error;
	return data as IdVerification;
}

export async function fetchUserProfile(
	userId: string,
): Promise<Profile | null> {
	let profile: Profile | null = null;
	try {
		const { data, error } = await supabase
			.from("profiles")
			.select("*")
			.eq("id", userId)
			.maybeSingle();

		if (error) throw error;
		profile = data as Profile | null;
	} catch {
		// Network or remote schema handled gracefully
	}

	// Retrieve cached profile from local storage if remote profile is null
	let cachedProfile: Profile | null = null;
	try {
		const rawCached = await AsyncStorage.getItem(
			`impulse_profile_${userId}`,
		);
		if (rawCached) {
			cachedProfile = JSON.parse(rawCached);
		}
	} catch {
		// ignore
	}

	if (cachedProfile && !profile) {
		profile = cachedProfile;
	} else if (profile && cachedProfile) {
		profile = {
			...cachedProfile,
			...profile,
		};
	}
	let localGuild: string | null = null;
	try {
		localGuild = await AsyncStorage.getItem(`impulse_user_guild_${userId}`);
	} catch {
		// ignore
	}

	if (!localGuild) {
		try {
			const { data: sessionData } = await supabase.auth.getSession();
			localGuild =
				(sessionData?.session?.user?.user_metadata?.guild as string) ||
				null;
		} catch {
			// ignore
		}
	}

	if (profile) {
		if (!profile.guild && localGuild) {
			profile.guild = localGuild as any;
		}
		return profile;
	}

	if (localGuild) {
		return {
			id: userId,
			username: "student",
			display_name: "Student",
			email: "",
			role: "user",
			guild: localGuild as any,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};
	}

	return null;
}

export async function fetchUserVerification(
	userId: string,
): Promise<IdVerification | null> {
	const { data, error } = await supabase
		.from("id_verifications")
		.select("*")
		.eq("user_id", userId)
		.order("created_at", { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) throw error;
	return data as IdVerification | null;
}

export async function updateUserProfile(
	userId: string,
	updates: Partial<Profile>,
): Promise<Profile> {
	const current = (await fetchUserProfile(userId)) || {
		id: userId,
		username: updates.username || "student",
		display_name: updates.display_name || "Student",
		email: updates.email || "",
		role: "user" as const,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};

	const updated: Profile = {
		...current,
		...updates,
		display_name:
			updates.display_name ||
			current.display_name ||
			current.username ||
			"Student",
		updated_at: new Date().toISOString(),
	};

	// 1. Save locally in AsyncStorage immediately
	try {
		await AsyncStorage.setItem(
			`impulse_profile_${userId}`,
			JSON.stringify(updated),
		);
		if (updated.username) {
			await AsyncStorage.setItem(
				`impulse_profile_by_username_${updated.username.toLowerCase()}`,
				JSON.stringify(updated),
			);
		}
	} catch {
		// ignored in non-storage envs
	}

	// 2. Persist to Supabase Auth metadata
	try {
		await supabase.auth.updateUser({
			data: {
				...updates,
			},
		});
	} catch {
		// Handled gracefully
	}

	// 3. Update profiles table
	try {
		await supabase
			.from("profiles")
			.update({
				...updates,
				updated_at: updated.updated_at,
			})
			.eq("id", userId);
	} catch {
		// Handled gracefully if remote schema is pending migration
	}

	// 4. Synchronize active in-memory auth store if loaded
	try {
		const { useAuthStore } = require("./store");
		if (useAuthStore?.getState) {
			useAuthStore.getState().setProfile(updated);
		}
	} catch {
		// store not yet initialized
	}

	return updated;
}

export async function fetchProfileByUsername(
	username: string,
): Promise<Profile | null> {
	const normalized = username.trim().toLowerCase();
	if (!normalized) return null;

	// 1. Try fetching from Supabase profiles table
	try {
		const { data, error } = await supabase
			.from("profiles")
			.select("*")
			.ilike("username", normalized)
			.maybeSingle();

		if (!error && data) {
			return data as Profile;
		}
	} catch {
		// Fallback gracefully
	}

	// 2. Check local AsyncStorage username cache
	try {
		const raw = await AsyncStorage.getItem(
			`impulse_profile_by_username_${normalized}`,
		);
		if (raw) {
			return JSON.parse(raw);
		}
	} catch {
		// Ignore
	}

	// 3. Check active in-memory auth store profile
	try {
		const { useAuthStore } = require("./store");
		const current = useAuthStore?.getState?.()?.profile;
		if (current && current.username?.toLowerCase() === normalized) {
			return current;
		}
	} catch {
		// Ignore
	}

	return null;
}

export async function updateUserGuild(
	userId: string,
	guild: string,
): Promise<void> {
	// 1. Save locally in AsyncStorage immediately
	try {
		await AsyncStorage.setItem(`impulse_user_guild_${userId}`, guild);
	} catch {
		// fallback
	}

	// 2. Persist to Supabase Auth metadata
	try {
		await supabase.auth.updateUser({
			data: { guild },
		});
	} catch {
		// Handled gracefully
	}

	// 3. Update profiles table
	try {
		await supabase
			.from("profiles")
			.update({
				guild,
				updated_at: new Date().toISOString(),
			})
			.eq("id", userId);
	} catch {
		// Handled gracefully if remote schema is pending migration
	}
}
