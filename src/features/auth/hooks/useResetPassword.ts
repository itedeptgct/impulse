import { useMutation } from "@tanstack/react-query";

import { resetPasswordForEmail } from "../api";

export function useResetPassword() {
	return useMutation({
		mutationFn: (email: string) => resetPasswordForEmail(email),
	});
}
