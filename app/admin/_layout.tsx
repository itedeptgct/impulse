import { useAuthStore } from "@auth/store";
import { Redirect, Slot } from "expo-router";

import { AdminSkeleton } from "@/features/admin/components/AdminSkeleton";

export default function AdminLayout() {
	const session = useAuthStore((state) => state.session);
	const profile = useAuthStore((state) => state.profile);
	const isLoading = useAuthStore((state) => state.isLoading);

	if (isLoading) {
		return <AdminSkeleton />;
	}

	if (!session) {
		return <Redirect href="/(auth)/sign-in" />;
	}

	const role = profile?.role;
	const isStaff = role === "admin" || role === "mod" || role === "house_mod";

	if (!isStaff) {
		return <Redirect href="/(tabs)" />;
	}

	return <Slot />;
}
