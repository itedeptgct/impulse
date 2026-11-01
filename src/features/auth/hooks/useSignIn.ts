import { useMutation } from "@tanstack/react-query";

import { signIn } from "../api";

export function useSignIn() {
	return useMutation({
		mutationFn: ({
			email,
			password,
		}: {
			email: string;
			password: string;
		}) => signIn(email, password),
	});
}
