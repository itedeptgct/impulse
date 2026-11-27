import { changePassword, changeUsername, requestEmailChange } from "@auth/api";
import { useAuthStore } from "@auth/store";
import type { Profile } from "@auth/types";
import * as Haptics from "expo-haptics";
import {
	AlertCircle,
	ArrowLeft,
	AtSign,
	CheckCircle2,
	Lock,
	Mail,
	ShieldAlert,
	ShieldCheck,
	Trash2,
	X,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NeoInput } from "@/components/ui";

import { PasswordRequirementsList } from "./PasswordRequirementsList";

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

export interface AccountSettingsModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onProfileUpdated?: (updatedProfile: Profile) => void;
	onDeleteAccountPress?: () => void;
}

type SettingsTab = "username" | "email" | "password";

export function AccountSettingsModal({
	open,
	onOpenChange,
	onProfileUpdated,
	onDeleteAccountPress,
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

	const isUsernameDisabled =
		isSubmittingUsername ||
		!newUsername.trim() ||
		newUsername.trim().toLowerCase() ===
			(profile?.username || "").toLowerCase();
	const isEmailDisabled =
		isSubmittingEmail || !newEmail.trim() || !emailCurrentPassword;
	const isPasswordDisabled =
		isSubmittingPassword ||
		!currentPassword ||
		!newPassword ||
		!confirmPassword;

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
					{/* Clean Non-Overlapping Header */}
					<View className="flex-row items-center justify-between border-b-2 border-border bg-background px-4 py-3">
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Close account settings"
							hitSlop={8}
							onPress={() => {
								triggerHaptic();
								onOpenChange(false);
							}}
							className="size-9 items-center justify-center border-2 border-border bg-surface shadow-neo-xs active:translate-x-px active:translate-y-px">
							<ArrowLeft
								size={16}
								color="#000000"
								strokeWidth={2.5}
							/>
						</Pressable>

						<Text className="font-ndot-caps text-base tracking-wider text-foreground uppercase">
							ACCOUNT SETTINGS
						</Text>

						<View className="size-9" />
					</View>

					<KeyboardAvoidingView
						behavior={Platform.OS === "ios" ? "padding" : undefined}
						className="flex-1">
						<ScrollView
							contentContainerStyle={{
								flexGrow: 1,
								paddingBottom: 36,
							}}
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled"
							className="flex-1 px-4 pt-4">
							<View className="mx-auto w-full max-w-xl gap-5">
								{/* Unified Segmented Tab Bar */}
								<View className="bg-surface shadow-neo-sm">
									<View className="flex-row items-stretch overflow-hidden border-2 border-border bg-surface">
										{(
											[
												{
													id: "username",
													label: "HANDLE",
													icon: AtSign,
												},
												{
													id: "email",
													label: "EMAIL",
													icon: Mail,
												},
												{
													id: "password",
													label: "PASSWORD",
													icon: Lock,
												},
											] as const
										).map((tab, idx) => {
											const isSelected =
												activeTab === tab.id;
											const Icon = tab.icon;
											return (
												<Pressable
													key={tab.id}
													accessibilityRole="tab"
													accessibilityState={{
														selected: isSelected,
													}}
													onPress={() => {
														triggerHaptic();
														setActiveTab(tab.id);
													}}
													className={`h-11 flex-1 flex-row items-center justify-center gap-1.5 ${
														idx < 2
															? "border-r-2 border-border"
															: ""
													} ${
														isSelected
															? "bg-primary"
															: "bg-surface active:bg-secondary"
													}`}>
													<Icon
														size={13}
														color={
															isSelected
																? "#faf9f5"
																: "#000000"
														}
														strokeWidth={2.4}
													/>
													<Text
														className={`font-bold text-2xs tracking-widest uppercase ${
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
								</View>

								{/* USERNAME TAB */}
								{activeTab === "username" && (
									<View className="gap-4">
										{usernameError && (
											<View className="flex-row items-center gap-2.5 border-2 border-destructive bg-destructive/10 p-3">
												<AlertCircle
													size={16}
													color="#ff2a00"
													strokeWidth={2.4}
												/>
												<Text className="flex-1 font-mono text-xs text-destructive">
													{usernameError}
												</Text>
												<Pressable
													accessibilityRole="button"
													accessibilityLabel="Dismiss error"
													onPress={() =>
														setUsernameError(null)
													}
													hitSlop={8}>
													<X
														size={14}
														color="#ff2a00"
													/>
												</Pressable>
											</View>
										)}

										{usernameSuccess && (
											<View className="bg-surface shadow-neo-xs">
												<View className="flex-row items-center gap-2.5 border-2 border-border bg-neo-green/25 p-3">
													<CheckCircle2
														size={16}
														color="#000000"
														strokeWidth={2.5}
													/>
													<Text className="flex-1 font-bold text-xs text-foreground">
														{usernameSuccess}
													</Text>
													<Pressable
														accessibilityRole="button"
														accessibilityLabel="Dismiss success message"
														onPress={() =>
															setUsernameSuccess(
																null,
															)
														}
														hitSlop={8}>
														<X
															size={14}
															color="#000000"
														/>
													</Pressable>
												</View>
											</View>
										)}

										<View className="bg-card shadow-neo">
											<View className="overflow-hidden border-2 border-border bg-card">
												{/* Current Handle Header Strip */}
												<View className="flex-row items-center justify-between border-b-2 border-border bg-surface px-4 py-3">
													<View className="flex-row items-center gap-2">
														<AtSign
															size={15}
															color="#000000"
															strokeWidth={2.4}
														/>
														<Text className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
															CURRENT HANDLE
														</Text>
													</View>
													<Text className="font-bold text-xs text-foreground">
														@
														{profile?.username ||
															"student"}
													</Text>
												</View>

												{/* Form Body */}
												<View className="bg-card p-4">
													<Text className="font-ndot-caps text-base tracking-wide text-foreground uppercase">
														CHANGE USERNAME
													</Text>
													<Text className="mt-1 mb-4 font-mono text-xs leading-relaxed text-muted-foreground">
														1–20 characters.
														Letters, numbers, and
														underscores only.
													</Text>

													<NeoInput
														label="NEW USERNAME"
														value={newUsername}
														onChangeText={(
															text,
														) => {
															const clean = text
																.toLowerCase()
																.replace(
																	/[^a-z0-9_]/g,
																	"",
																);
															setNewUsername(
																clean,
															);
															setUsernameError(
																null,
															);
															setUsernameSuccess(
																null,
															);
														}}
														placeholder="new_username"
														maxLength={20}
														autoCapitalize="none"
														autoCorrect={false}
														startContent={
															<AtSign
																size={15}
																color="#000000"
																strokeWidth={
																	2.2
																}
															/>
														}
														helperText={`${newUsername.length}/20 characters`}
													/>
												</View>

												{/* Docked Action Footer */}
												<Pressable
													accessibilityRole="button"
													accessibilityLabel="Update username"
													disabled={
														isUsernameDisabled
													}
													onPress={() => {
														triggerHaptic();
														void handleUpdateUsername();
													}}
													className={`h-12 flex-row items-center justify-center border-t-2 border-border px-4 active:opacity-85 ${
														isUsernameDisabled
															? "bg-secondary"
															: "bg-primary"
													}`}>
													{isSubmittingUsername ? (
														<ActivityIndicator
															size="small"
															color="#faf9f5"
														/>
													) : (
														<Text
															className={`font-bold text-xs tracking-widest uppercase ${
																isUsernameDisabled
																	? "text-muted-foreground"
																	: "text-primary-foreground"
															}`}>
															UPDATE USERNAME
														</Text>
													)}
												</Pressable>
											</View>
										</View>
									</View>
								)}

								{/* EMAIL TAB */}
								{activeTab === "email" && (
									<View className="gap-4">
										{emailError && (
											<View className="flex-row items-center gap-2.5 border-2 border-destructive bg-destructive/10 p-3">
												<AlertCircle
													size={16}
													color="#ff2a00"
													strokeWidth={2.4}
												/>
												<Text className="flex-1 font-mono text-xs text-destructive">
													{emailError}
												</Text>
												<Pressable
													accessibilityRole="button"
													accessibilityLabel="Dismiss error"
													onPress={() =>
														setEmailError(null)
													}
													hitSlop={8}>
													<X
														size={14}
														color="#ff2a00"
													/>
												</Pressable>
											</View>
										)}

										{emailSuccess && (
											<View className="bg-surface shadow-neo-xs">
												<View className="flex-row items-start gap-2.5 border-2 border-border bg-neo-green/25 p-3.5">
													<CheckCircle2
														size={17}
														color="#000000"
														strokeWidth={2.5}
													/>
													<View className="flex-1">
														<Text className="font-bold text-xs text-foreground uppercase">
															CONFIRMATION EMAIL
															SENT
														</Text>
														<Text className="mt-1 font-mono text-xs leading-relaxed text-foreground">
															{emailSuccess}
														</Text>
													</View>
													<Pressable
														accessibilityRole="button"
														accessibilityLabel="Dismiss success message"
														onPress={() =>
															setEmailSuccess(
																null,
															)
														}
														hitSlop={8}>
														<X
															size={14}
															color="#000000"
														/>
													</Pressable>
												</View>
											</View>
										)}

										<View className="bg-card shadow-neo">
											<View className="overflow-hidden border-2 border-border bg-card">
												{/* Current Email Strip */}
												<View className="border-b-2 border-border bg-surface px-4 py-3">
													<View className="flex-row items-center gap-2">
														<Mail
															size={14}
															color="#000000"
															strokeWidth={2.4}
														/>
														<Text className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
															CURRENT EMAIL
														</Text>
													</View>
													<Text
														numberOfLines={1}
														className="mt-1 font-bold text-xs text-foreground">
														{currentEmail ||
															"No email available"}
													</Text>
												</View>

												{/* Form Body */}
												<View className="bg-card p-4">
													<Text className="font-ndot-caps text-base tracking-wide text-foreground uppercase">
														REQUEST EMAIL CHANGE
													</Text>
													<Text className="mt-1 mb-4 font-mono text-xs leading-relaxed text-muted-foreground">
														Confirm with your
														current password. A
														verification link will
														be sent to your new
														address.
													</Text>

													<View className="gap-3.5">
														<NeoInput
															label="NEW EMAIL ADDRESS"
															value={newEmail}
															onChangeText={(
																text,
															) => {
																setNewEmail(
																	text,
																);
																setEmailError(
																	null,
																);
																setEmailSuccess(
																	null,
																);
															}}
															placeholder="new.email@example.com"
															autoCapitalize="none"
															autoCorrect={false}
															keyboardType="email-address"
															startContent={
																<Mail
																	size={15}
																	color="#000000"
																	strokeWidth={
																		2.2
																	}
																/>
															}
														/>

														<NeoInput
															label="CURRENT PASSWORD"
															value={
																emailCurrentPassword
															}
															onChangeText={(
																text,
															) => {
																setEmailCurrentPassword(
																	text,
																);
																setEmailError(
																	null,
																);
															}}
															placeholder="Enter current password"
															secureTextEntry
															startContent={
																<Lock
																	size={15}
																	color="#000000"
																	strokeWidth={
																		2.2
																	}
																/>
															}
														/>
													</View>
												</View>

												{/* Docked Action Footer */}
												<Pressable
													accessibilityRole="button"
													accessibilityLabel="Request email change"
													disabled={isEmailDisabled}
													onPress={() => {
														triggerHaptic();
														void handleRequestEmailChange();
													}}
													className={`h-12 flex-row items-center justify-center border-t-2 border-border px-4 active:opacity-85 ${
														isEmailDisabled
															? "bg-secondary"
															: "bg-primary"
													}`}>
													{isSubmittingEmail ? (
														<ActivityIndicator
															size="small"
															color="#faf9f5"
														/>
													) : (
														<Text
															className={`font-bold text-xs tracking-widest uppercase ${
																isEmailDisabled
																	? "text-muted-foreground"
																	: "text-primary-foreground"
															}`}>
															REQUEST EMAIL CHANGE
														</Text>
													)}
												</Pressable>
											</View>
										</View>
									</View>
								)}

								{/* PASSWORD TAB */}
								{activeTab === "password" && (
									<View className="gap-4">
										{passwordError && (
											<View className="flex-row items-center gap-2.5 border-2 border-destructive bg-destructive/10 p-3">
												<AlertCircle
													size={16}
													color="#ff2a00"
													strokeWidth={2.4}
												/>
												<Text className="flex-1 font-mono text-xs text-destructive">
													{passwordError}
												</Text>
												<Pressable
													accessibilityRole="button"
													accessibilityLabel="Dismiss error"
													onPress={() =>
														setPasswordError(null)
													}
													hitSlop={8}>
													<X
														size={14}
														color="#ff2a00"
													/>
												</Pressable>
											</View>
										)}

										{passwordSuccess && (
											<View className="bg-surface shadow-neo-xs">
												<View className="flex-row items-center gap-2.5 border-2 border-border bg-neo-green/25 p-3">
													<CheckCircle2
														size={16}
														color="#000000"
														strokeWidth={2.5}
													/>
													<Text className="flex-1 font-bold text-xs text-foreground">
														{passwordSuccess}
													</Text>
													<Pressable
														accessibilityRole="button"
														accessibilityLabel="Dismiss success message"
														onPress={() =>
															setPasswordSuccess(
																null,
															)
														}
														hitSlop={8}>
														<X
															size={14}
															color="#000000"
														/>
													</Pressable>
												</View>
											</View>
										)}

										<View className="bg-card shadow-neo">
											<View className="overflow-hidden border-2 border-border bg-card">
												{/* Security Strip */}
												<View className="flex-row items-center gap-2 border-b-2 border-border bg-surface px-4 py-3">
													<ShieldCheck
														size={15}
														color="#000000"
														strokeWidth={2.4}
													/>
													<Text className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
														CREDENTIALS &amp;
														SECURITY
													</Text>
												</View>

												{/* Form Body */}
												<View className="bg-card p-4">
													<Text className="font-ndot-caps text-base tracking-wide text-foreground uppercase">
														UPDATE PASSWORD
													</Text>
													<Text className="mt-1 mb-4 font-mono text-xs leading-relaxed text-muted-foreground">
														Verify your current
														password before setting
														a new one.
													</Text>

													<View className="gap-3.5">
														<NeoInput
															label="CURRENT PASSWORD"
															value={
																currentPassword
															}
															onChangeText={(
																text,
															) => {
																setCurrentPassword(
																	text,
																);
																setPasswordError(
																	null,
																);
															}}
															placeholder="Enter current password"
															secureTextEntry
															startContent={
																<Lock
																	size={15}
																	color="#000000"
																	strokeWidth={
																		2.2
																	}
																/>
															}
														/>

														<NeoInput
															label="NEW PASSWORD"
															value={newPassword}
															onChangeText={(
																text,
															) => {
																setNewPassword(
																	text,
																);
																setPasswordError(
																	null,
																);
															}}
															placeholder="Enter new password"
															secureTextEntry
															startContent={
																<Lock
																	size={15}
																	color="#000000"
																	strokeWidth={
																		2.2
																	}
																/>
															}
														/>

														{newPassword.length >
															0 && (
															<PasswordRequirementsList
																password={
																	newPassword
																}
															/>
														)}

														<NeoInput
															label="CONFIRM NEW PASSWORD"
															value={
																confirmPassword
															}
															onChangeText={(
																text,
															) => {
																setConfirmPassword(
																	text,
																);
																setPasswordError(
																	null,
																);
															}}
															placeholder="Confirm new password"
															secureTextEntry
															startContent={
																<Lock
																	size={15}
																	color="#000000"
																	strokeWidth={
																		2.2
																	}
																/>
															}
														/>
													</View>
												</View>

												{/* Docked Action Footer */}
												<Pressable
													accessibilityRole="button"
													accessibilityLabel="Update password"
													disabled={
														isPasswordDisabled
													}
													onPress={() => {
														triggerHaptic();
														void handleUpdatePassword();
													}}
													className={`h-12 flex-row items-center justify-center border-t-2 border-border px-4 active:opacity-85 ${
														isPasswordDisabled
															? "bg-secondary"
															: "bg-primary"
													}`}>
													{isSubmittingPassword ? (
														<ActivityIndicator
															size="small"
															color="#faf9f5"
														/>
													) : (
														<Text
															className={`font-bold text-xs tracking-widest uppercase ${
																isPasswordDisabled
																	? "text-muted-foreground"
																	: "text-primary-foreground"
															}`}>
															UPDATE PASSWORD
														</Text>
													)}
												</Pressable>
											</View>
										</View>
									</View>
								)}

								{/* Danger Zone */}
								{onDeleteAccountPress && (
									<View className="mt-2 bg-card shadow-neo-sm">
										<View className="overflow-hidden border-2 border-destructive bg-card">
											<View className="flex-row items-center gap-2 border-b-2 border-destructive bg-destructive/10 px-4 py-2.5">
												<ShieldAlert
													size={14}
													color="#ff2a00"
													strokeWidth={2.5}
												/>
												<Text className="font-bold text-2xs tracking-widest text-destructive uppercase">
													DANGER ZONE
												</Text>
											</View>

											<View className="bg-card px-4 py-3.5">
												<Text className="font-mono text-xs leading-relaxed text-muted-foreground">
													Permanently delete your
													account and all associated
													posts, comments, and
													messages. This action cannot
													be undone.
												</Text>
											</View>

											<Pressable
												accessibilityRole="button"
												accessibilityLabel="Delete account"
												onPress={() => {
													triggerHaptic();
													onDeleteAccountPress();
												}}
												className="h-12 flex-row items-center justify-center gap-2 border-t-2 border-destructive bg-destructive px-4 active:opacity-85">
												<Trash2
													size={15}
													color="#faf9f5"
													strokeWidth={2.4}
												/>
												<Text className="font-bold text-xs tracking-widest text-primary-foreground uppercase">
													DELETE ACCOUNT
												</Text>
											</Pressable>
										</View>
									</View>
								)}
							</View>
						</ScrollView>
					</KeyboardAvoidingView>
				</SafeAreaView>
			</View>
		</Modal>
	);
}
