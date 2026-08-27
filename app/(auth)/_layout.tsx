import { useAuthStore } from "@auth/store";
import { Redirect, Stack } from "expo-router";

export default function AuthLayout() {
	const session = useAuthStore((state) => state.session);

	if (session) {
		return <Redirect href="/(tabs)" />;
	}

	return <Stack screenOptions={{ headerShown: false }} />;
}
