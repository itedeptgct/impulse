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
import { Button, Dialog, Text } from "panelui-native";
import { useState } from "react";
import { TextInput, View } from "react-native";

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

	const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
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
		<View className="gap-6">
			{/* Search & Filter Toolbar */}
			<View className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<View className="relative flex-1 sm:max-w-md">
					<View className="pointer-events-none absolute inset-y-0 left-3 z-10 flex-row items-center">
						<Search size={15} className="text-muted-foreground" />
					</View>
					<TextInput
						value={search}
						onChangeText={setSearch}
						placeholder="Search students by username or email..."
						placeholderTextColor="#71717a"
						className="h-10 w-full rounded-xl border border-border bg-card pr-4 pl-9 text-xs text-foreground placeholder:text-muted-foreground"
					/>
				</View>
				<View className="flex-row items-center gap-2">
					<View className="flex-row items-center rounded-xl border border-border bg-card p-1">
						{(["all", "admin", "user"] as const).map((r) => (
							<Button
								key={r}
								size="sm"
								variant={roleFilter === r ? "primary" : "ghost"}
								className="rounded-lg capitalize"
								onPress={() => setRoleFilter(r)}>
								{r}
							</Button>
						))}
					</View>
					<Button
						size="sm"
						variant="outline"
						aria-label="Refresh users list"
						className="h-9 w-9 rounded-xl transition-transform active:scale-[0.96]"
						onPress={() => void refetch()}>
						<RefreshCw
							size={14}
							className={`text-muted-foreground ${isFetching ? "animate-spin" : ""}`}
						/>
					</Button>
				</View>
			</View>
			{/* Users List */}
			{isLoading ? (
				<View className="gap-3">
					{[1, 2, 3, 4].map((i) => (
						<View
							key={i}
							className="h-20 animate-pulse rounded-2xl border border-border bg-card"
						/>
					))}
				</View>
			) : !users || users.length === 0 ? (
				<View className="items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 py-16">
					<User size={32} className="text-muted-foreground/60" />
					<Text weight="medium" className="mt-3 text-sm text-foreground">
						No students found
					</Text>
					<Text className="mt-1 text-xs text-muted-foreground">
						Try adjusting your search criteria or role filters.
					</Text>
				</View>
			) : (
				<View className="gap-3">
					{users.map((u) => {
						const isUserAdmin = u.role === "admin";
						const verifStatus = u.verification?.status || "none";
						return (
							<View
								key={u.id}
								className="flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
								<View className="flex-row items-center gap-3.5">
									<View className="h-11 w-11 items-center justify-center rounded-xl border border-border bg-muted/60">
										<Text weight="bold" className="text-sm text-foreground">
											{u.username?.slice(0, 2).toUpperCase() || "ST"}
										</Text>
									</View>
									<View>
										<View className="flex-row items-center gap-2">
											<Text weight="bold" className="text-sm text-foreground">
												{u.username || "Anonymous Student"}
											</Text>
											{isUserAdmin ? (
												<View className="flex-row items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5">
													<ShieldCheck size={11} className="text-primary" />
													<Text
														weight="semibold"
														className="text-[10px] text-primary uppercase">
														Admin
													</Text>
												</View>
											) : (
												<View className="flex-row items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5">
													<GraduationCap
														size={11}
														className="text-muted-foreground"
													/>
													<Text
														weight="medium"
														className="text-[10px] text-muted-foreground">
														Student
													</Text>
												</View>
											)}
										</View>
										<Text className="mt-0.5 text-xs text-muted-foreground">
											{u.email}
										</Text>
									</View>
								</View>
								<View className="flex-row items-center gap-4">
									{/* Verification Pill */}
									<View className="flex-row items-center gap-1.5">
										{verifStatus === "approved" ? (
											<View className="flex-row items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5">
												<CheckCircle2 size={12} className="text-emerald-400" />
												<Text
													weight="medium"
													className="text-[11px] text-emerald-400">
													Verified
												</Text>
											</View>
										) : verifStatus === "rejected" ? (
											<View className="flex-row items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5">
												<XCircle size={12} className="text-destructive" />
												<Text
													weight="medium"
													className="text-[11px] text-destructive">
													Rejected
												</Text>
											</View>
										) : verifStatus === "pending" ? (
											<View className="flex-row items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5">
												<Clock size={12} className="text-amber-400" />
												<Text
													weight="medium"
													className="text-[11px] text-amber-400">
													Pending
												</Text>
											</View>
										) : (
											<Text className="text-xs text-muted-foreground">
												No ID submitted
											</Text>
										)}
									</View>
									{/* Action Button */}
									{isUserAdmin ? (
										<Button
											size="sm"
											variant="outline"
											onPress={() => handleOpenRoleDialog(u, "user")}>
											Demote to Student
										</Button>
									) : (
										<Button
											size="sm"
											variant="outline"
											onPress={() => handleOpenRoleDialog(u, "admin")}>
											Promote to Admin
										</Button>
									)}
								</View>
							</View>
						);
					})}
				</View>
			)}
			{/* Role Change Confirmation Dialog */}
			<Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
				<Dialog.Content className="mx-4 max-w-sm rounded-2xl border border-border bg-card p-6">
					<Dialog.Title weight="bold" className="text-lg text-foreground">
						Change User Role
					</Dialog.Title>
					<Dialog.Description className="mt-2 text-xs text-muted-foreground">
						Are you sure you want to change{" "}
						{selectedUser?.username || "this user"}&apos;s role to{" "}
						<Text weight="bold" className="text-foreground uppercase">
							{newRole}
						</Text>
						?
					</Dialog.Description>
					<Dialog.Footer className="mt-6 flex-row gap-2.5">
						<Button
							size="sm"
							variant="outline"
							className="flex-1"
							onPress={() => setIsConfirmOpen(false)}>
							Cancel
						</Button>
						<Button
							size="sm"
							variant={newRole === "admin" ? "primary" : "destructive"}
							className="flex-1"
							loading={updateRoleMutation.isPending}
							onPress={handleConfirmRoleChange}>
							Confirm
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>
		</View>
	);
}
