import { changePassword, changeUsername, requestEmailChange } from "@auth/api";
import { useAuthStore } from "@auth/store";
import type { Profile } from "@auth/types";
import {
	AlertCircle,
	AtSign,
	CheckCircle2,
	Lock,
	Mail,
	ShieldCheck,
	X,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NeoButton, NeoInput } from "@/components/ui";

import { PasswordRequirementsList } from "./PasswordRequirementsList";

export interface AccountSettingsModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onProfileUpdated?: (updatedProfile: Profile) => void;
}

type SettingsTab = "username" | "email" | "password";

export function AccountSettingsModal({
	open,
	onOpenChange,
	onProfileUpdated,
}: AccountSettingsModalProps) {
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);
	const setProfile = useAuthStore((state) => state.setProfile);

	const [activeTab, setActiveTab] = useState<SettingsTab>("username");

	// Username form state
	const [newUsername, setNewUsername] = useState(profile?.username || "");
	const [isSubmittingUsername, setIsSubmittingUsername] = useState(false);
	const [usernameSuccess, setUsernameSuccess] = useState<string | null>(null);
	const [usernameError, setUsernameError] = useState<string | null>(null);

	// Email form state
	const [newEmail, setNewEmail] = useState("");
	const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
	const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
	const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
	const [emailError, setEmailError] = useState<string | null>(null);

	// Password form state
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
	const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
	const [passwordError, setPasswordError] = useState<string | null>(null);

	const currentEmail = profile?.email || user?.email || "";
	const prevOpenRef = useRef(open);

	useEffect(() => {
		if (open && !prevOpenRef.current) {
			setNewUsername(profile?.username || "");
			setUsernameSuccess(null);
			setUsernameError(null);

			setNewEmail("");
			setEmailCurrentPassword("");
			setEmailSuccess(null);
			setEmailError(null);

			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
			setPasswordSuccess(null);
			setPasswordError(null);
		}
		prevOpenRef.current = open;
	}, [open, profile?.username]);

	const handleUpdateUsername = async () => {
		if (!user?.id) return;
		const trimmed = newUsername.trim().toLowerCase();

		if (!trimmed) {
			setUsernameError("Username is required.");
			return;
		}
		if (trimmed.length > 20) {
			setUsernameError("Username must be 20 characters or less.");
			return;
		}
		if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
			setUsernameError(
				"Username can only contain letters, numbers, and underscores.",
			);
			return;
		}
		if (trimmed === (profile?.username || "").toLowerCase()) {
			setUsernameError("This is already your current username.");
			return;
		}

		setIsSubmittingUsername(true);
		setUsernameError(null);
		setUsernameSuccess(null);

		try {
			const updated = await changeUsername(user.id, trimmed);
			setProfile(updated);
			onProfileUpdated?.(updated);
			setUsernameSuccess(
				`Username successfully updated to @${updated.username}`,
			);
		} catch (err: unknown) {
			const e = err as Error;
			setUsernameError(e.message || "Failed to update username.");
		} finally {
			setIsSubmittingUsername(false);
		}
	};

	const handleRequestEmailChange = async () => {
		if (!currentEmail) {
			setEmailError("No current email address found on your account.");
			return;
		}
		const trimmedEmail = newEmail.trim().toLowerCase();
		if (!trimmedEmail) {
			setEmailError("Please enter a new email address.");
			return;
		}
		if (!trimmedEmail.includes("@")) {
			setEmailError("Please enter a valid email address.");
			return;
		}
		if (trimmedEmail === currentEmail.toLowerCase()) {
			setEmailError(
				"New email must be different from your current email.",
			);
			return;
		}
		if (!emailCurrentPassword) {
			setEmailError("Please enter your current password to confirm.");
			return;
		}

		setIsSubmittingEmail(true);
		setEmailError(null);
		setEmailSuccess(null);

		try {
			await requestEmailChange(
				currentEmail,
				emailCurrentPassword,
				trimmedEmail,
			);
			setEmailSuccess(
				`Check your new email to confirm. A confirmation link has been sent to ${trimmedEmail}.`,
			);
			setNewEmail("");
			setEmailCurrentPassword("");
		} catch (err: unknown) {
			const e = err as Error;
			setEmailError(e.message || "Failed to request email change.");
		} finally {
			setIsSubmittingEmail(false);
		}
	};

	const handleUpdatePassword = async () => {
		if (!currentEmail) {
			setPasswordError("No current email address found on your account.");
			return;
		}
		if (!currentPassword) {
			setPasswordError("Please enter your current password.");
			return;
		}
		if (!newPassword) {
			setPasswordError("Please enter a new password.");
			return;
		}
		if (newPassword.length < 8) {
			setPasswordError(
				"New password must be at least 8 characters long.",
			);
			return;
		}
		if (!/[a-zA-Z]/.test(newPassword)) {
			setPasswordError("New password must contain at least one letter.");
			return;
		}
		if (!/[0-9]/.test(newPassword)) {
			setPasswordError("New password must contain at least one number.");
			return;
		}
		if (!/[^a-zA-Z0-9]/.test(newPassword)) {
			setPasswordError(
				"New password must contain at least one special character.",
			);
			return;
		}
		if (newPassword !== confirmPassword) {
			setPasswordError("Passwords do not match.");
			return;
		}

		setIsSubmittingPassword(true);
		setPasswordError(null);
		setPasswordSuccess(null);

		try {
			await changePassword(currentEmail, currentPassword, newPassword);
			setPasswordSuccess("Password updated successfully.");
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
		} catch (err: unknown) {
			const e = err as Error;
			setPasswordError(e.message || "Failed to update password.");
		} finally {
			setIsSubmittingPassword(false);
		}
	};

	return (
		<Modal
			visible={open}
			animationType="slide"
			presentationStyle="fullScreen"
			statusBarTranslucent={true}
			onRequestClose={() => onOpenChange(false)}>
			<View
				style={{ backgroundColor: "#faf9f5", flex: 1 }}
				className="flex-1 bg-background">
				<SafeAreaView
					style={{ backgroundColor: "#faf9f5", flex: 1 }}
					className="flex-1 bg-background"
					edges={["top", "bottom"]}>
					{/* Modal Header */}
					<View className="relative flex-row items-center justify-between border-b-2 border-border bg-card px-4 py-3 shadow-neo-sm">
						<NeoButton
							variant="secondary"
							size="sm"
							onPress={() => onOpenChange(false)}>
							CLOSE
						</NeoButton>

						<Text className="absolute inset-x-0 text-center font-display text-base tracking-tight text-foreground uppercase">
							ACCOUNT SETTINGS
						</Text>
					</View>

					{/* Tab Navigation */}
					<View className="flex-row border-b-2 border-border bg-card px-4 py-2.5 shadow-neo-xs">
						{(
							[
								{ id: "username", label: "USERNAME" },
								{ id: "email", label: "EMAIL" },
								{ id: "password", label: "PASSWORD" },
							] as const
						).map((tab) => {
							const isSelected = activeTab === tab.id;
							return (
								<Pressable
									key={tab.id}
									onPress={() => setActiveTab(tab.id)}
									className={`flex-1 items-center justify-center rounded-none border-2 py-2 shadow-neo-xs active:translate-x-px active:translate-y-px ${
										isSelected
											? "border-border bg-primary"
											: "border-border bg-card"
									}`}>
									<Text
										className={`font-bold text-xs uppercase ${
											isSelected
												? "text-primary-foreground"
												: "text-foreground"
										}`}>
										{tab.label}
									</Text>
								</Pressable>
							);
						})}
					</View>

					<KeyboardAvoidingView
						behavior={Platform.OS === "ios" ? "padding" : undefined}
						className="flex-1">
						<ScrollView
							contentContainerStyle={{
								flexGrow: 1,
								paddingBottom: 32,
							}}
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled"
							className="flex-1 px-4 pt-4">
							{/* USERNAME TAB */}
							{activeTab === "username" && (
								<View className="gap-4">
									<View className="rounded-none border-2 border-border bg-card p-4 shadow-neo-sm">
										<View className="mb-2 flex-row items-center gap-2">
											<AtSign
												size={16}
												color="#000000"
												strokeWidth={2.2}
											/>
											<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
												CURRENT USERNAME
											</Text>
										</View>
										<Text className="font-bold text-base text-foreground">
											@{profile?.username || "student"}
										</Text>
									</View>

									{usernameError && (
										<View className="flex-row items-center gap-2 rounded-none border-2 border-destructive bg-destructive/10 p-3">
											<AlertCircle
												size={16}
												color="#ff2a00"
											/>
											<Text className="flex-1 font-mono text-xs text-destructive">
												{usernameError}
											</Text>
											<Pressable
												onPress={() =>
													setUsernameError(null)
												}
												hitSlop={8}>
												<X size={14} color="#ff2a00" />
											</Pressable>
										</View>
									)}

									{usernameSuccess && (
										<View className="flex-row items-center gap-2 rounded-none border-2 border-border bg-[#00ff66]/20 p-3 shadow-neo-sm">
											<CheckCircle2
												size={16}
												color="#000000"
												strokeWidth={2.5}
											/>
											<Text className="flex-1 font-bold text-xs text-foreground">
												{usernameSuccess}
											</Text>
											<Pressable
												onPress={() =>
													setUsernameSuccess(null)
												}
												hitSlop={8}>
												<X size={14} color="#000000" />
											</Pressable>
										</View>
									)}

									<View className="rounded-none border-2 border-border bg-card p-4 shadow-neo-sm">
										<Text className="mb-1 font-bold text-xs text-foreground uppercase">
											CHANGE USERNAME
										</Text>
										<Text className="mb-4 font-mono text-xs text-muted-foreground">
											Usernames must be 1 to 20 characters
											and contain only letters, numbers,
											and underscores.
										</Text>

										<NeoInput
											label="NEW USERNAME"
											value={newUsername}
											onChangeText={(text) => {
												const clean = text
													.toLowerCase()
													.replace(/[^a-z0-9_]/g, "");
												setNewUsername(clean);
												setUsernameError(null);
												setUsernameSuccess(null);
											}}
											placeholder="new_username"
											maxLength={20}
											autoCapitalize="none"
											autoCorrect={false}
											startContent={
												<AtSign
													size={15}
													color="#000000"
													strokeWidth={2.2}
												/>
											}
											helperText={`${newUsername.length}/20 characters`}
										/>

										<View className="mt-4">
											<NeoButton
												variant="primary"
												size="md"
												loading={isSubmittingUsername}
												disabled={
													isSubmittingUsername ||
													!newUsername.trim() ||
													newUsername
														.trim()
														.toLowerCase() ===
														(
															profile?.username ||
															""
														).toLowerCase()
												}
												onPress={handleUpdateUsername}
												className="w-full">
												UPDATE USERNAME
											</NeoButton>
										</View>
									</View>
								</View>
							)}

							{/* EMAIL TAB */}
							{activeTab === "email" && (
								<View className="gap-4">
									<View className="rounded-none border-2 border-border bg-card p-4 shadow-neo-sm">
										<View className="mb-2 flex-row items-center gap-2">
											<Mail
												size={16}
												color="#000000"
												strokeWidth={2.2}
											/>
											<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
												CURRENT EMAIL
											</Text>
										</View>
										<Text className="font-bold text-sm text-foreground">
											{currentEmail ||
												"No email available"}
										</Text>
									</View>

									{emailError && (
										<View className="flex-row items-center gap-2 rounded-none border-2 border-destructive bg-destructive/10 p-3">
											<AlertCircle
												size={16}
												color="#ff2a00"
											/>
											<Text className="flex-1 font-mono text-xs text-destructive">
												{emailError}
											</Text>
											<Pressable
												onPress={() =>
													setEmailError(null)
												}
												hitSlop={8}>
												<X size={14} color="#ff2a00" />
											</Pressable>
										</View>
									)}

									{emailSuccess && (
										<View className="flex-row items-start gap-2 rounded-none border-2 border-border bg-[#00ff66]/20 p-3.5 shadow-neo-sm">
											<CheckCircle2
												size={18}
												color="#000000"
												strokeWidth={2.5}
												className="mt-0.5"
											/>
											<View className="flex-1">
												<Text className="font-bold text-xs text-foreground uppercase">
													CONFIRMATION EMAIL SENT
												</Text>
												<Text className="mt-1 font-mono text-xs text-foreground">
													{emailSuccess}
												</Text>
											</View>
											<Pressable
												onPress={() =>
													setEmailSuccess(null)
												}
												hitSlop={8}>
												<X size={14} color="#000000" />
											</Pressable>
										</View>
									)}

									<View className="rounded-none border-2 border-border bg-card p-4 shadow-neo-sm">
										<Text className="mb-1 font-bold text-xs text-foreground uppercase">
											REQUEST EMAIL CHANGE
										</Text>
										<Text className="mb-4 font-mono text-xs text-muted-foreground">
											For security, re-authenticate with
											your current password. A
											verification email will be sent to
											your new email address to finalize
											the update.
										</Text>

										<View className="gap-3.5">
											<NeoInput
												label="NEW EMAIL ADDRESS"
												value={newEmail}
												onChangeText={(text) => {
													setNewEmail(text);
													setEmailError(null);
													setEmailSuccess(null);
												}}
												placeholder="new.email@example.com"
												autoCapitalize="none"
												autoCorrect={false}
												keyboardType="email-address"
												startContent={
													<Mail
														size={15}
														color="#000000"
														strokeWidth={2.2}
													/>
												}
											/>

											<NeoInput
												label="CURRENT PASSWORD"
												value={emailCurrentPassword}
												onChangeText={(text) => {
													setEmailCurrentPassword(
														text,
													);
													setEmailError(null);
												}}
												placeholder="Enter current password"
												secureTextEntry
												startContent={
													<Lock
														size={15}
														color="#000000"
														strokeWidth={2.2}
													/>
												}
											/>

											<View className="mt-2">
												<NeoButton
													variant="primary"
													size="md"
													loading={isSubmittingEmail}
													disabled={
														isSubmittingEmail ||
														!newEmail.trim() ||
														!emailCurrentPassword
													}
													onPress={
														handleRequestEmailChange
													}
													className="w-full">
													REQUEST EMAIL CHANGE
												</NeoButton>
											</View>
										</View>
									</View>
								</View>
							)}

							{/* PASSWORD TAB */}
							{activeTab === "password" && (
								<View className="gap-4">
									{passwordError && (
										<View className="flex-row items-center gap-2 rounded-none border-2 border-destructive bg-destructive/10 p-3">
											<AlertCircle
												size={16}
												color="#ff2a00"
											/>
											<Text className="flex-1 font-mono text-xs text-destructive">
												{passwordError}
											</Text>
											<Pressable
												onPress={() =>
													setPasswordError(null)
												}
												hitSlop={8}>
												<X size={14} color="#ff2a00" />
											</Pressable>
										</View>
									)}

									{passwordSuccess && (
										<View className="flex-row items-center gap-2 rounded-none border-2 border-border bg-[#00ff66]/20 p-3 shadow-neo-sm">
											<CheckCircle2
												size={16}
												color="#000000"
												strokeWidth={2.5}
											/>
											<Text className="flex-1 font-bold text-xs text-foreground">
												{passwordSuccess}
											</Text>
											<Pressable
												onPress={() =>
													setPasswordSuccess(null)
												}
												hitSlop={8}>
												<X size={14} color="#000000" />
											</Pressable>
										</View>
									)}

									<View className="rounded-none border-2 border-border bg-card p-4 shadow-neo-sm">
										<View className="mb-1 flex-row items-center gap-2">
											<ShieldCheck
												size={16}
												color="#000000"
												strokeWidth={2.2}
											/>
											<Text className="font-bold text-xs text-foreground uppercase">
												UPDATE PASSWORD
											</Text>
										</View>
										<Text className="mb-4 font-mono text-xs text-muted-foreground">
											Enter your current password and
											choose a strong new password.
										</Text>

										<View className="gap-3.5">
											<NeoInput
												label="CURRENT PASSWORD"
												value={currentPassword}
												onChangeText={(text) => {
													setCurrentPassword(text);
													setPasswordError(null);
												}}
												placeholder="Enter current password"
												secureTextEntry
												startContent={
													<Lock
														size={15}
														color="#000000"
														strokeWidth={2.2}
													/>
												}
											/>

											<NeoInput
												label="NEW PASSWORD"
												value={newPassword}
												onChangeText={(text) => {
													setNewPassword(text);
													setPasswordError(null);
												}}
												placeholder="Enter new password"
												secureTextEntry
												startContent={
													<Lock
														size={15}
														color="#000000"
														strokeWidth={2.2}
													/>
												}
											/>

											{newPassword.length > 0 && (
												<PasswordRequirementsList
													password={newPassword}
												/>
											)}

											<NeoInput
												label="CONFIRM NEW PASSWORD"
												value={confirmPassword}
												onChangeText={(text) => {
													setConfirmPassword(text);
													setPasswordError(null);
												}}
												placeholder="Confirm new password"
												secureTextEntry
												startContent={
													<Lock
														size={15}
														color="#000000"
														strokeWidth={2.2}
													/>
												}
											/>

											<View className="mt-2">
												<NeoButton
													variant="primary"
													size="md"
													loading={
														isSubmittingPassword
													}
													disabled={
														isSubmittingPassword ||
														!currentPassword ||
														!newPassword ||
														!confirmPassword
													}
													onPress={
														handleUpdatePassword
													}
													className="w-full">
													UPDATE PASSWORD
												</NeoButton>
											</View>
										</View>
									</View>
								</View>
							)}
						</ScrollView>
					</KeyboardAvoidingView>
				</SafeAreaView>
			</View>
		</Modal>
	);
}
