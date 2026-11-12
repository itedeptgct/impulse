import { useMutation } from "@tanstack/react-query";

import { signUp } from "../api";

export function useSignUp() {
	return useMutation({
		mutationFn: ({
			username,
			displayName,
			email,
			password,
		}: {
			username: string;
			displayName?: string;
			email: string;
			password: string;
		}) => signUp(username, email, password, displayName),
	});
}
