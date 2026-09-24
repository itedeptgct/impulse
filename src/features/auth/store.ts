import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

import type { GuildId } from "@/features/guilds/types";

import type { IdVerification, Profile } from "./types";

interface AuthState {
	session: Session | null;
	user: User | null;
	profile: Profile | null;
	verification: IdVerification | null;
	isLoading: boolean;
	setSession: (session: Session | null) => void;
	setProfile: (profile: Profile | null) => void;
	setVerification: (verification: IdVerification | null) => void;
	setGuild: (guild: GuildId) => void;
	clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
	session: null,
	user: null,
	profile: null,
	verification: null,
	isLoading: true,
	setSession: (session) =>
		set({
			session,
			user: session?.user ?? null,
			isLoading: false,
		}),
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
			isLoading: false,
		}),
}));
