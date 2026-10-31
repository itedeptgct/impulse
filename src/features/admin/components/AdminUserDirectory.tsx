import type { UserRole } from "@auth/types";
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
			{/* Search input */}
			<NeoInput
				value={search}
				onChangeText={setSearch}
				placeholder="Search students by username or email..."
				startContent={
					<Search size={15} color="#9aa1b2" strokeWidth={2.5} />
				}
			/>

			{/* Filter Tabs & Refresh Row */}
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
					className="h-9 w-9 px-0"
					accessibilityLabel="Refresh students list"
					onPress={() => void refetch()}>
					<RefreshCw
						size={14}
						color={isFetching ? "#91e6b1" : "#ffffff"}
						className={isFetching ? "animate-spin" : ""}
					/>
				</NeoButton>
			</View>

			{/* Users List */}
			{isLoading ? (
				<View className="gap-3">
					{[1, 2, 3].map((i) => (
						<View
							key={i}
							className="h-28 animate-pulse rounded-sm border-2 border-border bg-card p-4 shadow-neo-sm"
						/>
					))}
				</View>
			) : !users || users.length === 0 ? (
				<NeoCard className="items-center justify-center border-dashed border-border bg-card py-12 text-center">
					<User size={32} color="#9aa1b2" strokeWidth={2.5} />
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
								{/* Header row: Avatar, Info, Badges */}
								<View className="flex-row items-center gap-3">
									<View className="size-11 items-center justify-center rounded-sm border-2 border-border bg-secondary">
										<Text className="font-mono text-sm text-primary">
											{u.username
												?.slice(0, 2)
												.toUpperCase() || "ST"}
										</Text>
									</View>

									<View className="flex-1">
										<View className="flex-row items-center justify-between">
											<Text className="font-mono text-sm text-foreground">
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
															color="#91e6b1"
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
															color="#9aa1b2"
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

								{/* Status and Action row */}
								<View className="flex-row items-center justify-between border-t border-border/40 pt-2.5">
									{/* Verification Pill */}
									<View className="flex-row items-center gap-1.5">
										{verifStatus === "approved" ? (
											<NeoBadge
												variant="primary"
												size="sm"
												startContent={
													<CheckCircle2
														size={10}
														color="#91e6b1"
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
														color="#ff5c5c"
														strokeWidth={2.5}
													/>
												}>
												REJECTED
											</NeoBadge>
										) : verifStatus === "pending" ? (
											<NeoBadge
												variant="default"
												size="sm"
												className="border-amber-400/60 bg-amber-500/15"
												textClassName="text-amber-400"
												startContent={
													<Clock
														size={10}
														color="#fbbf24"
														strokeWidth={2.5}
													/>
												}>
												PENDING
											</NeoBadge>
										) : (
											<Text className="font-mono text-xs text-muted-foreground">
												No ID submitted
											</Text>
										)}
									</View>

									{/* Action Button */}
									{isUserAdmin ? (
										<NeoButton
											size="sm"
											variant="outline"
											onPress={() =>
												handleOpenRoleDialog(u, "user")
											}>
											Demote to Student
										</NeoButton>
									) : (
										<NeoButton
											size="sm"
											variant="outline"
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

			{/* Role Change Confirmation Sheet */}
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
