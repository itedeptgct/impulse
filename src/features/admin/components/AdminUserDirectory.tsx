import type { UserRole } from "@auth/types";
import { Image as ExpoImage } from "expo-image";
import {
	AlertTriangle,
	Award,
	CheckCircle2,
	Clock,
	GraduationCap,
	RefreshCw,
	Search,
	Shield,
	ShieldCheck,
	User,
	XCircle,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import {
	MobileAlertSheet,
	NeoBadge,
	NeoButton,
	NeoCard,
	NeoInput,
} from "@/components/ui";

import { useAdminUsers, useUpdateUserRole } from "../hooks/useAdmin";
import type { AdminUserItem } from "../types";

const ROLE_TABS = [
	{ key: "all", label: "All Roles" },
	{ key: "admin", label: "Admins" },
	{ key: "mod", label: "Mods" },
	{ key: "house_mod", label: "House Mods" },
	{ key: "user", label: "Users" },
] as const;

const ROLE_OPTIONS: { role: UserRole; label: string; desc: string }[] = [
	{
		role: "user",
		label: "User",
		desc: "Standard student access",
	},
	{
		role: "house_mod",
		label: "House Mod",
		desc: "Moderate own house & post house dispatches",
	},
	{
		role: "mod",
		label: "Mod",
		desc: "Campus-wide moderation & global dispatches",
	},
	{
		role: "admin",
		label: "Admin",
		desc: "Full administrator privileges & verification desk",
	},
];

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
	const [roleError, setRoleError] = useState<string | null>(null);

	const handleOpenRoleDialog = (u: AdminUserItem) => {
		setSelectedUser(u);
		setNewRole(u.role);
		setRoleError(null);
		setIsConfirmOpen(true);
	};

	const isHouseModWithoutGuild =
		newRole === "house_mod" && !selectedUser?.guild;

	const handleConfirmRoleChange = async () => {
		if (!selectedUser) return;

		if (newRole === "house_mod" && !selectedUser.guild) {
			setRoleError(
				"User must be aligned with a House before being assigned as House Mod.",
			);
			return;
		}

		if (newRole === selectedUser.role) {
			setIsConfirmOpen(false);
			setSelectedUser(null);
			return;
		}

		try {
			await updateRoleMutation.mutateAsync({
				userId: selectedUser.id,
				role: newRole,
			});
			setIsConfirmOpen(false);
			setSelectedUser(null);
		} catch (err: any) {
			setRoleError(
				err?.message || "Failed to update user role. Please try again.",
			);
		}
	};

	const renderRoleBadge = (role: UserRole) => {
		switch (role) {
			case "admin":
				return (
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
				);
			case "mod":
				return (
					<NeoBadge
						variant="primary"
						size="sm"
						className="border-2 border-border bg-[#8b5cf6]"
						startContent={
							<Shield
								size={10}
								color="#ffffff"
								strokeWidth={2.5}
							/>
						}>
						MOD
					</NeoBadge>
				);
			case "house_mod":
				return (
					<NeoBadge
						variant="default"
						size="sm"
						className="border-2 border-border bg-amber-400"
						startContent={
							<Award
								size={10}
								color="#000000"
								strokeWidth={2.5}
							/>
						}>
						HOUSE MOD
					</NeoBadge>
				);
			case "user":
			default:
				return (
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
						USER
					</NeoBadge>
				);
		}
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
					{ROLE_TABS.map((tab) => {
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
											{renderRoleBadge(u.role)}
										</View>
										<Text className="mt-0.5 font-mono text-xs text-muted-foreground">
											{u.email}
											{u.guild
												? ` • House: ${u.guild.toUpperCase()}`
												: ""}
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

									{u.username === "hausmaster" ? (
										<Text className="font-mono text-xs text-muted-foreground">
											Default Admin
										</Text>
									) : (
										<NeoButton
											size="sm"
											variant="outline"
											disabled={verifStatus === "pending"}
											onPress={() =>
												handleOpenRoleDialog(u)
											}>
											Change Role
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
				onOpenChange={(open) => {
					setIsConfirmOpen(open);
					if (!open) {
						setSelectedUser(null);
						setRoleError(null);
					}
				}}
				title="Change User Role"
				type="info"
				description={`Select access level for @${selectedUser?.username || "user"}.`}
				actions={[
					{
						label: updateRoleMutation.isPending
							? "Updating..."
							: "Save Role Change",
						onPress: handleConfirmRoleChange,
						variant: isHouseModWithoutGuild ? "outline" : "primary",
						loading: updateRoleMutation.isPending,
					},
					{
						label: "Cancel",
						onPress: () => {
							setIsConfirmOpen(false);
							setSelectedUser(null);
							setRoleError(null);
						},
						variant: "outline",
					},
				]}>
				<View className="gap-2">
					{ROLE_OPTIONS.map((opt) => {
						const isSelected = newRole === opt.role;
						return (
							<Pressable
								key={opt.role}
								accessibilityRole="button"
								accessibilityLabel={`Select role ${opt.label}`}
								onPress={() => {
									setNewRole(opt.role);
									if (
										opt.role === "house_mod" &&
										!selectedUser?.guild
									) {
										setRoleError(
											"User must be aligned with a House before being assigned as House Mod.",
										);
									} else {
										setRoleError(null);
									}
								}}
								className={`flex-row items-center justify-between border-2 p-3 ${
									isSelected
										? "border-primary bg-primary/10 shadow-neo-xs"
										: "border-border bg-card"
								}`}>
								<View className="flex-1 pr-2">
									<Text className="font-bold text-sm text-foreground">
										{opt.label}
									</Text>
									<Text className="font-mono text-2xs text-muted-foreground">
										{opt.desc}
									</Text>
								</View>
								{isSelected && (
									<CheckCircle2
										size={16}
										color="#000000"
										strokeWidth={2.5}
									/>
								)}
							</Pressable>
						);
					})}

					{(isHouseModWithoutGuild || roleError) && (
						<View className="mt-1 flex-row items-center gap-2 border-2 border-destructive bg-destructive/10 p-2.5">
							<AlertTriangle
								size={16}
								color="#ff2a00"
								strokeWidth={2.5}
							/>
							<Text className="flex-1 font-mono text-xs text-destructive">
								{roleError ||
									"User must be aligned with a House before being assigned as House Mod."}
							</Text>
						</View>
					)}
				</View>
			</MobileAlertSheet>
		</View>
	);
}
