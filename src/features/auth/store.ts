import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

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
	setProfile: (profile) => set({ profile }),
	setVerification: (verification) => set({ verification }),
	clearSession: () =>
		set({
			session: null,
			user: null,
			profile: null,
			verification: null,
			isLoading: false,
		}),
}));
