import type { UserRole } from "@auth/types";
import { Image as ExpoImage } from "expo-image";
import {
	CheckCircle2,
	Clock,
	GraduationCap,
	RefreshCw,
	Search,
	ShieldCheck,
	User,
	XCircle,
} from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import {
	MobileAlertSheet,
	NeoBadge,
	NeoButton,
	NeoCard,
	NeoInput,
} from "@/components/ui";

import { useAdminUsers, useUpdateUserRole } from "../hooks/useAdmin";
import type { AdminUserItem } from "../types";

export function AdminUserDirectory() {
	const [search, setSearch] = useState("");
	const [roleFilter, setRoleFilter] = useState("all");

	const {
		data: users,
		isLoading,
		refetch,
		isFetching,
	} = useAdminUsers(search, roleFilter);
	const updateRoleMutation = useUpdateUserRole();

	const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(
		null,
	);
	const [newRole, setNewRole] = useState<UserRole>("user");
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);

	const handleOpenRoleDialog = (u: AdminUserItem, targetRole: UserRole) => {
		setSelectedUser(u);
		setNewRole(targetRole);
		setIsConfirmOpen(true);
	};

	const handleConfirmRoleChange = async () => {
		if (!selectedUser) return;
		await updateRoleMutation.mutateAsync({
			userId: selectedUser.id,
			role: newRole,
		});
		setIsConfirmOpen(false);
		setSelectedUser(null);
	};

	return (
		<View className="gap-4">
			<NeoInput
				value={search}
				onChangeText={setSearch}
				placeholder="Search students by username or email..."
				startContent={
					<Search size={15} color="#000000" strokeWidth={2.5} />
				}
			/>

			<View className="flex-row items-center justify-between gap-2">
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ gap: 6 }}
					className="flex-1">
					{(
						[
							{ key: "all", label: "All Roles" },
							{ key: "admin", label: "Admins" },
							{ key: "user", label: "Students" },
						] as const
					).map((tab) => {
						const isActive = roleFilter === tab.key;
						return (
							<NeoButton
								key={tab.key}
								size="sm"
								variant={isActive ? "primary" : "outline"}
								onPress={() => setRoleFilter(tab.key)}>
								{tab.label}
							</NeoButton>
						);
					})}
				</ScrollView>

				<NeoButton
					size="sm"
					variant="outline"
					className="size-9 px-0"
					accessibilityLabel="Refresh students list"
					onPress={() => void refetch()}>
					<RefreshCw
						size={14}
						color={isFetching ? "#ff2a00" : "#000000"}
						className={isFetching ? "animate-spin" : ""}
					/>
				</NeoButton>
			</View>

			{isLoading ? (
				<View className="gap-3">
					{[1, 2, 3].map((i) => (
						<View
							key={i}
							className="h-28 animate-pulse rounded-none border-2 border-border bg-card p-4 shadow-neo-sm"
						/>
					))}
				</View>
			) : !users || users.length === 0 ? (
				<NeoCard className="items-center justify-center border-dashed border-border bg-card py-12 text-center">
					<User size={32} color="#000000" strokeWidth={2.5} />
					<Text className="mt-3 font-display text-base tracking-tight text-foreground uppercase">
						No Students Found
					</Text>
					<Text className="mt-1 text-center font-mono text-xs text-muted-foreground">
						Try adjusting your search criteria or role filters.
					</Text>
				</NeoCard>
			) : (
				<View className="gap-3">
					{users.map((u) => {
						const isUserAdmin = u.role === "admin";
						const verifStatus = u.verification?.status || "none";

						return (
							<NeoCard
								key={u.id}
								className="gap-3 border-border bg-card p-4">
								<View className="flex-row items-center gap-3">
									<View className="size-11 items-center justify-center overflow-hidden rounded-none border-2 border-border bg-muted">
										{u.avatar_url &&
										u.avatar_url.startsWith("http") ? (
											<ExpoImage
												source={{ uri: u.avatar_url }}
												style={{
													width: "100%",
													height: "100%",
												}}
												contentFit="cover"
											/>
										) : (
											<Text className="font-bold text-sm text-foreground">
												{u.username
													?.slice(0, 2)
													.toUpperCase() || "ST"}
											</Text>
										)}
									</View>

									<View className="flex-1">
										<View className="flex-row items-center justify-between">
											<Text className="font-bold text-sm text-foreground">
												{u.username ||
													"Anonymous Student"}
											</Text>
											{isUserAdmin ? (
												<NeoBadge
													variant="primary"
													size="sm"
													startContent={
														<ShieldCheck
															size={10}
															color="#ffffff"
															strokeWidth={2.5}
														/>
													}>
													ADMIN
												</NeoBadge>
											) : (
												<NeoBadge
													variant="default"
													size="sm"
													startContent={
														<GraduationCap
															size={10}
															color="#000000"
															strokeWidth={2.5}
														/>
													}>
													STUDENT
												</NeoBadge>
											)}
										</View>
										<Text className="mt-0.5 font-mono text-xs text-muted-foreground">
											{u.email}
										</Text>
									</View>
								</View>

								<View className="flex-row items-center justify-between border-t border-border/40 pt-2.5">
									<View className="flex-row items-center gap-1.5">
										{verifStatus === "approved" ? (
											<NeoBadge
												variant="primary"
												size="sm"
												startContent={
													<CheckCircle2
														size={10}
														color="#ffffff"
														strokeWidth={2.5}
													/>
												}>
												VERIFIED
											</NeoBadge>
										) : verifStatus === "rejected" ? (
											<NeoBadge
												variant="outline"
												size="sm"
												textClassName="text-destructive"
												startContent={
													<XCircle
														size={10}
														color="#ff2a00"
														strokeWidth={2.5}
													/>
												}>
												REJECTED
											</NeoBadge>
										) : verifStatus === "pending" ? (
											<NeoBadge
												variant="default"
												size="sm"
												className="border-2 border-border bg-muted"
												textClassName="text-foreground"
												startContent={
													<Clock
														size={10}
														color="#000000"
														strokeWidth={2.5}
													/>
												}>
												PENDING
											</NeoBadge>
										) : (
											<Text className="font-mono text-xs text-muted-foreground">
												{u.username === "hausmaster"
													? "Default Admin"
													: ""}
											</Text>
										)}
									</View>

									{isUserAdmin &&
									u.username !== "hausmaster" ? (
										<NeoButton
											size="sm"
											variant="outline"
											disabled={
												verifStatus === "pending" ||
												u.username === "hausmaster"
											}
											onPress={() =>
												handleOpenRoleDialog(u, "user")
											}>
											Demote to Student
										</NeoButton>
									) : (
										<NeoButton
											size="sm"
											variant="outline"
											disabled={
												verifStatus === "pending" ||
												u.username === "hausmaster"
											}
											onPress={() =>
												handleOpenRoleDialog(u, "admin")
											}>
											Promote to Admin
										</NeoButton>
									)}
								</View>
							</NeoCard>
						);
					})}
				</View>
			)}

			<MobileAlertSheet
				open={isConfirmOpen}
				onOpenChange={setIsConfirmOpen}
				title="Change User Role"
				type={newRole === "admin" ? "info" : "warning"}
				description={`Are you sure you want to change ${selectedUser?.username || "this user"}'s role to ${newRole.toUpperCase()}?`}
				actions={[
					{
						label: `Confirm ${newRole === "admin" ? "Promotion" : "Demotion"}`,
						onPress: handleConfirmRoleChange,
						variant:
							newRole === "admin" ? "primary" : "destructive",
						loading: updateRoleMutation.isPending,
					},
					{
						label: "Cancel",
						onPress: () => setIsConfirmOpen(false),
						variant: "outline",
					},
				]}
			/>
		</View>
	);
}
