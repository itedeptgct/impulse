import { deleteOwnR2Objects, uploadToR2 } from "@lib/r2-storage";
import { supabase } from "@lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuthStore } from "./store";
import type { IdVerification, Profile } from "./types";
import {
	getContentTypeFromExtension,
	readUriAsBinary,
} from "./utils/upload-utils";

export { getContentTypeFromExtension, readUriAsBinary };

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
	useAuthStore.getState().markManualSignOut();
	const { error } = await supabase.auth.signOut();
	if (error) throw error;
}

export async function resetPasswordForEmail(email: string) {
	let redirectTo = "auth/callback";
	try {
		const Linking = require("expo-linking");
		redirectTo = Linking.createURL("auth/callback");
	} catch {}
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

	const errorDescription =
		(parsed.queryParams?.error_description as string) ||
		(parsed.queryParams?.error as string);
	if (errorDescription) {
		throw new Error(errorDescription);
	}

	const code = parsed.queryParams?.code as string | undefined;
	if (code) {
		const { data, error } =
			await supabase.auth.exchangeCodeForSession(code);
		if (error) throw error;
		return data;
	}

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

	const { data: sessionData, error: sessionError } =
		await supabase.auth.getSession();
	if (sessionError) throw sessionError;
	return sessionData;
}

export async function uploadIdDocument(
	userId: string,
	uri: string,
	originalName?: string | null,
): Promise<string> {
	const extFromName = originalName?.split(".").pop()?.toLowerCase();
	const extFromUri = uri.split("?")[0].split(".").pop()?.toLowerCase();
	const extension =
		(extFromName && extFromName.length <= 5 ? extFromName : null) ||
		(extFromUri && extFromUri.length <= 5 ? extFromUri : null) ||
		"jpg";
	const filePath = `${userId}/${Date.now()}.${extension}`;
	const contentType = getContentTypeFromExtension(extension);

	const { data: binaryData } = await readUriAsBinary(uri, contentType);

	const { path } = await uploadToR2(
		"id-documents",
		filePath,
		binaryData,
		contentType,
	);
	return path;
}

export async function uploadAvatar(
	userId: string,
	uri: string,
	originalName?: string | null,
): Promise<string> {
	const extFromName = originalName?.split(".").pop()?.toLowerCase();
	const extFromUri = uri.split("?")[0].split(".").pop()?.toLowerCase();
	const extension =
		(extFromName && extFromName.length <= 5 ? extFromName : null) ||
		(extFromUri && extFromUri.length <= 5 ? extFromUri : null) ||
		"jpg";
	const filePath = `${userId}/${Date.now()}.${extension}`;
	const contentType = getContentTypeFromExtension(extension);

	const { data: binaryData } = await readUriAsBinary(uri, contentType);

	const { publicUrl } = await uploadToR2(
		"avatars",
		filePath,
		binaryData,
		contentType,
	);
	if (!publicUrl) {
		throw new Error("Avatar upload did not return a public URL");
	}
	return publicUrl;
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
	} catch {}

	let privateEmail = "";
	try {
		const { data: privData } = await supabase
			.from("private_profiles")
			.select("email")
			.eq("user_id", userId)
			.maybeSingle();

		if (privData?.email) {
			privateEmail = privData.email;
		}
	} catch {}

	if (!privateEmail) {
		try {
			const { data: authData } = await supabase.auth.getUser();
			if (authData?.user?.id === userId && authData.user.email) {
				privateEmail = authData.user.email;
			}
		} catch {}
	}

	let cachedProfile: Profile | null = null;
	try {
		const rawCached = await AsyncStorage.getItem(
			`impulse_profile_${userId}`,
		);
		if (rawCached) {
			cachedProfile = JSON.parse(rawCached);
		}
	} catch {}

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
	} catch {}

	if (!localGuild) {
		try {
			const { data: sessionData } = await supabase.auth.getSession();
			localGuild =
				(sessionData?.session?.user?.user_metadata?.guild as string) ||
				null;
		} catch {}
	}

	if (profile) {
		if (privateEmail) {
			profile.email = privateEmail;
		} else if (!profile.email) {
			profile.email = "";
		}
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
			email: privateEmail || "",
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

	const { email: emailUpdate, ...profileUpdates } = updates;

	const { error: profileError } = await supabase
		.from("profiles")
		.update({
			...profileUpdates,
			updated_at: updated.updated_at,
		})
		.eq("id", userId);
	if (profileError) throw profileError;

	if (emailUpdate) {
		try {
			await supabase
				.from("private_profiles")
				.upsert({ user_id: userId, email: emailUpdate });
		} catch (err) {
			console.warn("Failed to update private profile email:", err);
		}
	}

	const { error: authError } = await supabase.auth.updateUser({
		data: {
			...profileUpdates,
		},
	});
	if (authError) throw authError;

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
	} catch {}

	try {
		const { useAuthStore } = require("./store");
		if (useAuthStore?.getState) {
			useAuthStore.getState().setProfile(updated);
		}
	} catch {}

	return updated;
}

export async function deleteOwnAccount(): Promise<void> {
	try {
		await deleteOwnR2Objects();
	} catch (e) {
		console.warn("Failed to delete R2 objects:", e);
	}

	const { error } = await supabase.rpc("delete_own_account");
	if (error) throw error;

	useAuthStore.getState().markManualSignOut();

	try {
		const allKeys = await AsyncStorage.getAllKeys();
		const impulseKeys = allKeys.filter((key) => key.startsWith("impulse_"));
		if (impulseKeys.length > 0) {
			await AsyncStorage.multiRemove(impulseKeys);
		}
	} catch (e) {
		console.warn("Failed to clear impulse_ keys from AsyncStorage:", e);
	}

	try {
		await supabase.auth.signOut({ scope: "local" });
	} catch (e) {
		console.warn("Failed to sign out locally:", e);
	}

	useAuthStore.getState().clearSession();
}

export async function fetchProfileByUsername(
	username: string,
): Promise<Profile | null> {
	const normalized = username.trim().toLowerCase();
	if (!normalized) return null;

	try {
		const { data, error } = await supabase
			.from("profiles")
			.select("*")
			.ilike("username", normalized)
			.maybeSingle();

		if (!error && data) {
			return {
				...data,
				email: (data as any).email || "",
			} as Profile;
		}
	} catch {}

	try {
		const raw = await AsyncStorage.getItem(
			`impulse_profile_by_username_${normalized}`,
		);
		if (raw) {
			return JSON.parse(raw);
		}
	} catch {}

	try {
		const { useAuthStore } = require("./store");
		const current = useAuthStore?.getState?.()?.profile;
		if (current && current.username?.toLowerCase() === normalized) {
			return current;
		}
	} catch {}

	return null;
}

export async function searchUsers(query: string): Promise<Profile[]> {
	const trimmed = query.trim().toLowerCase();
	if (!trimmed) return [];

	try {
		const { data, error } = await supabase
			.from("profiles")
			.select("*")
			.or(
				`username.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%,guild.ilike.%${trimmed}%`,
			)
			.limit(20);

		if (!error && data && data.length > 0) {
			return data.map((item: any) => ({
				...item,
				email: item.email || "",
			})) as Profile[];
		}
	} catch {}

	const results: Profile[] = [];
	try {
		const { useAuthStore } = require("./store");
		const current = useAuthStore?.getState?.()?.profile;
		if (
			current &&
			(current.username?.toLowerCase().includes(trimmed) ||
				current.display_name?.toLowerCase().includes(trimmed) ||
				current.guild?.toLowerCase().includes(trimmed))
		) {
			results.push(current);
		}
	} catch {}

	return results;
}
