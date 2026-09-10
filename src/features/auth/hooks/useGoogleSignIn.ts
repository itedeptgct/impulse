import { useAuthStore } from "@auth/store";
import { useMutation } from "@tanstack/react-query";

import { signInWithGoogle } from "../api";

export function useGoogleSignIn() {
	const setSession = useAuthStore((state) => state.setSession);

	return useMutation({
		mutationFn: async () => {
			const data = await signInWithGoogle();
			if (data?.session) {
				setSession(data.session);
			}
			return data;
		},
	});
}
