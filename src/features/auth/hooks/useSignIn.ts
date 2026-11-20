import { useMutation } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { signInWithGitHub, signIn } from "../api";

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

export function useGitHubAuth() {
	return useMutation({
		mutationFn: async () => {
			const { url } = await signInWithGitHub();
			if (!url) throw new Error("Could not get GitHub sign-in URL.");
			const redirectUrl = Linking.createURL("auth/callback");
			const result = await WebBrowser.openAuthSessionAsync(
				url,
				redirectUrl,
			);
			return result;
		},
	});
}
