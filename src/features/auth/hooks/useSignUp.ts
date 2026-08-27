import { useMutation } from "@tanstack/react-query";

import { signUp } from "../api";

export function useSignUp() {
	return useMutation({
		mutationFn: ({
			username,
			email,
			password,
		}: {
			username: string;
			email: string;
			password: string;
		}) => signUp(username, email, password),
	});
}
