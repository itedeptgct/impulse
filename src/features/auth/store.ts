import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

import type { GuildId } from "@/features/guilds/types";

import { fetchUserProfile, fetchUserVerification } from "./api";
import type { IdVerification, Profile } from "./types";

interface AuthState {
	session: Session | null;
	user: User | null;
	profile: Profile | null;
	verification: IdVerification | null;
	isLoading: boolean;
	loadedUserId: string | null;
	isSyncing: boolean;
	syncError: string | null;
	setSession: (session: Session | null) => void;
	setProfile: (profile: Profile | null) => void;
	setVerification: (verification: IdVerification | null) => void;
	setGuild: (guild: GuildId) => void;
	clearSession: () => void;
	syncUserData: (
		userId: string,
		force?: boolean,
	) => Promise<{
		profile: Profile | null;
		verification: IdVerification | null;
	}>;
	refreshUserData: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
	session: null,
	user: null,
	profile: null,
	verification: null,
	isLoading: true,
	loadedUserId: null,
	isSyncing: false,
	syncError: null,
	setSession: (session) => {
		const nextUserId = session?.user?.id ?? null;
		set((state) => {
			if (state.user?.id !== nextUserId) {
				return {
					session,
					user: session?.user ?? null,
					profile: null,
					verification: null,
					loadedUserId: null,
					isSyncing: false,
					syncError: null,
					isLoading: false,
				};
			}
			return {
				session,
				user: session?.user ?? null,
				isLoading: false,
			};
		});
	},
	setProfile: (profile) =>
		set((state) => ({
			profile: profile
				? {
						...profile,
						guild: profile.guild || state.profile?.guild || null,
					}
				: null,
		})),
	setVerification: (verification) => set({ verification }),
	setGuild: (guild) =>
		set((state) => ({
			profile: state.profile ? { ...state.profile, guild } : null,
		})),
	clearSession: () =>
		set({
			session: null,
			user: null,
			profile: null,
			verification: null,
			loadedUserId: null,
			isSyncing: false,
			syncError: null,
			isLoading: false,
		}),
	syncUserData: async (userId: string, force = false) => {
		const state = get();
		if (!force && state.loadedUserId === userId && state.profile) {
			return {
				profile: state.profile,
				verification: state.verification,
			};
		}
		if (state.isSyncing && state.loadedUserId === userId && !force) {
			return {
				profile: state.profile,
				verification: state.verification,
			};
		}

		set({ isSyncing: true, syncError: null });
		try {
			const [profile, verification] = await Promise.all([
				fetchUserProfile(userId),
				fetchUserVerification(userId),
			]);
			const currentUser = get().user;
			if (currentUser?.id === userId) {
				set((prev) => ({
					profile: profile
						? {
								...profile,
								guild:
									profile.guild ||
									prev.profile?.guild ||
									null,
							}
						: null,
					verification: verification ?? null,
					loadedUserId: userId,
					isSyncing: false,
					syncError: null,
				}));
			}
			return { profile, verification };
		} catch (err: any) {
			set({
				isSyncing: false,
				syncError: err?.message || "Failed to sync user data",
			});
			return {
				profile: get().profile,
				verification: get().verification,
			};
		}
	},
	refreshUserData: async () => {
		const currentUserId = get().user?.id;
		if (!currentUserId) return;
		await get().syncUserData(currentUserId, true);
	},
}));
