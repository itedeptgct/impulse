import { Image as ExpoImage } from "expo-image";
import {
	AlertCircle,
	AtSign,
	CheckCircle2,
	Lock,
	Mail,
	User,
	X,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	ScrollView,
	Text,
	View,
	useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NeoBadge, NeoButton, NeoCard, NeoInput } from "@/components/ui";

import { useAdminUpdateUserAccount } from "../hooks/useAdmin";
import type { AdminUpdateUserPayload, AdminUserItem } from "../types";

export interface AdminEditUserModalProps {
	user: AdminUserItem | null;
	open: boolean;
	onClose: () => void;
	onUserUpdated?: () => void;
}

const USERNAME_REGEX = /^[A-Za-z0-9_]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AdminEditUserModal({
	user,
	open,
	onClose,
	onUserUpdated,
}: AdminEditUserModalProps) {
	const { width, height } = useWindowDimensions();
	const isDesktop = Platform.OS === "web" && width >= 1024;
	const updateAccountMutation = useAdminUpdateUserAccount();

	const [username, setUsername] = useState(user?.username || "");
	const [email, setEmail] = useState(user?.email || "");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const prevOpenRef = useRef(open);

	useEffect(() => {
		if (open && (!prevOpenRef.current || user?.id)) {
			setUsername(user?.username || "");
			setEmail(user?.email || "");
			setPassword("");
			setError(null);
			setSuccess(null);
		}
		prevOpenRef.current = open;
	}, [open, user?.id, user?.username, user?.email]);

	if (!user) return null;

	const trimmedUsername = username.trim();
	const trimmedEmail = email.trim();

	const hasUsernameChange =
		trimmedUsername.toLowerCase() !== (user.username || "").toLowerCase();
	const hasEmailChange =
		trimmedEmail.toLowerCase() !== (user.email || "").toLowerCase();
	const hasPasswordChange = password.length > 0;

	const hasChanges = hasUsernameChange || hasEmailChange || hasPasswordChange;

	const handleSave = async () => {
		if (!hasChanges) return;

		setError(null);
		setSuccess(null);

		if (hasUsernameChange) {
			if (!trimmedUsername) {
				setError("Username cannot be empty.");
				return;
			}
			if (trimmedUsername.length > 20) {
				setError("Username cannot exceed 20 characters.");
				return;
			}
			if (!USERNAME_REGEX.test(trimmedUsername)) {
				setError(
					"Username can only contain letters, numbers, and underscores.",
				);
				return;
			}
		}

		if (hasEmailChange) {
			if (!trimmedEmail) {
				setError("Email address cannot be empty.");
				return;
			}
			if (!EMAIL_REGEX.test(trimmedEmail)) {
				setError("Please enter a valid email address.");
				return;
			}
		}

		if (hasPasswordChange) {
			if (password.length < 6) {
				setError("New password must be at least 6 characters.");
				return;
			}
		}

		const payload: AdminUpdateUserPayload = {
			targetUserId: user.id,
		};
		if (hasUsernameChange) {
			payload.username = trimmedUsername;
		}
		if (hasEmailChange) {
			payload.email = trimmedEmail;
		}
		if (hasPasswordChange) {
			payload.password = password;
		}

		try {
			await updateAccountMutation.mutateAsync(payload);
			setSuccess("Account credentials successfully updated.");
			onUserUpdated?.();
			setTimeout(() => {
				onClose();
			}, 600);
		} catch (err: unknown) {
			const message =
				err instanceof Error
					? err.message
					: "Failed to update user account.";
			setError(message);
		}
	};

	const handleDismiss = () => {
		if (updateAccountMutation.isPending) return;
		setError(null);
		setSuccess(null);
		onClose();
	};

	return (
		<Modal
			visible={open}
			animationType={isDesktop ? "fade" : "slide"}
			transparent={isDesktop}
			presentationStyle={isDesktop ? "overFullScreen" : "fullScreen"}
			onRequestClose={handleDismiss}>
			<View
				className={
					isDesktop
						? "flex-1 items-center justify-center bg-black/45 p-6"
						: "flex-1"
				}>
				<SafeAreaView
					style={{
						backgroundColor: "#faf9f5",
						flex: isDesktop ? undefined : 1,
						...(isDesktop
							? {
									width: "100%",
									maxWidth: 720,
									height: Math.min(height * 0.9, 760),
									borderWidth: 2,
									borderColor: "#000000",
								}
							: {}),
					}}
					edges={["top", "bottom"]}>
					<View className="flex-row items-center justify-between border-b-2 border-border bg-card px-4 py-3 shadow-neo-sm">
						<View className="flex-row items-center gap-2.5">
							<View className="size-9 items-center justify-center rounded-none border-2 border-border bg-muted">
								<User
									size={18}
									color="#000000"
									strokeWidth={2.5}
								/>
							</View>
							<View>
								<Text className="font-display text-sm tracking-tight text-foreground uppercase">
									Edit Student Account
								</Text>
								<Text className="font-mono text-[10px] text-muted-foreground">
									@{user.username || "user"} •{" "}
									{user.id.slice(0, 10)}
								</Text>
							</View>
						</View>

						<NeoButton
							size="sm"
							variant="secondary"
							className="size-9 px-0"
							onPress={handleDismiss}
							accessibilityLabel="Close user edit modal">
							<X size={16} color="#000000" strokeWidth={2.5} />
						</NeoButton>
					</View>

					<KeyboardAvoidingView
						behavior={Platform.OS === "ios" ? "padding" : undefined}
						className="flex-1"
						style={{ backgroundColor: "#faf9f5" }}>
						<ScrollView
							className="flex-1 px-4 py-3"
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled">
							<NeoCard className="gap-3 border-border bg-card p-4">
								<View className="flex-row items-center gap-3">
									<View className="size-12 items-center justify-center overflow-hidden rounded-none border-2 border-border bg-muted">
										{user.avatar_url &&
										user.avatar_url.startsWith("http") ? (
											<ExpoImage
												source={{
													uri: user.avatar_url,
												}}
												style={{
													width: "100%",
													height: "100%",
												}}
												contentFit="cover"
											/>
										) : (
											<Text className="font-bold text-sm text-foreground">
												{user.username
													?.slice(0, 2)
													.toUpperCase() || "ST"}
											</Text>
										)}
									</View>

									<View className="flex-1">
										<View className="flex-row items-center justify-between">
											<Text className="font-bold text-sm text-foreground">
												{user.username || "Student"}
											</Text>
											<NeoBadge
												variant="default"
												size="sm">
												{user.role.toUpperCase()}
											</NeoBadge>
										</View>
										<Text className="mt-0.5 font-mono text-xs text-muted-foreground">
											{user.email || "No email on record"}
										</Text>
										<Text className="mt-0.5 font-mono text-[10px] text-muted-foreground/80">
											UUID: {user.id}
										</Text>
									</View>
								</View>
							</NeoCard>

							<View className="mt-4 gap-4">
								<View className="gap-1.5">
									<View className="flex-row items-center justify-between">
										<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
											Username
										</Text>
										<Text className="font-mono text-[10px] text-muted-foreground">
											{trimmedUsername.length}/20
										</Text>
									</View>
									<NeoInput
										value={username}
										onChangeText={setUsername}
										maxLength={20}
										autoCapitalize="none"
										autoCorrect={false}
										placeholder="e.g. campus_coder"
										startContent={
											<AtSign
												size={15}
												color="#000000"
												strokeWidth={2.5}
											/>
										}
									/>
									<Text className="font-mono text-[10px] text-muted-foreground">
										Max 20 chars. Letters, numbers, and
										underscores only.
									</Text>
								</View>

								<View className="gap-1.5">
									<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
										Email Address
									</Text>
									<NeoInput
										value={email}
										onChangeText={setEmail}
										keyboardType="email-address"
										autoCapitalize="none"
										autoCorrect={false}
										placeholder="e.g. student@university.edu"
										startContent={
											<Mail
												size={15}
												color="#000000"
												strokeWidth={2.5}
											/>
										}
									/>
									<Text className="font-mono text-[10px] text-muted-foreground">
										Direct authentication and notification
										email.
									</Text>
								</View>

								<View className="gap-1.5">
									<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
										New Password (Optional)
									</Text>
									<NeoInput
										value={password}
										onChangeText={setPassword}
										secureTextEntry
										autoCapitalize="none"
										autoCorrect={false}
										placeholder="Leave blank to keep unchanged"
										startContent={
											<Lock
												size={15}
												color="#000000"
												strokeWidth={2.5}
											/>
										}
									/>
									<Text className="font-mono text-[10px] text-muted-foreground">
										Must be at least 6 characters if
										updating the password.
									</Text>
								</View>
							</View>

							{error && (
								<View className="mt-4 flex-row items-center gap-2 border-2 border-destructive bg-destructive/10 p-3 shadow-neo-sm">
									<AlertCircle
										size={16}
										color="#ff2a00"
										strokeWidth={2.5}
									/>
									<Text className="flex-1 font-mono text-xs text-destructive">
										{error}
									</Text>
								</View>
							)}

							{success && (
								<View className="mt-4 flex-row items-center gap-2 border-2 border-border bg-primary/10 p-3 shadow-neo-sm">
									<CheckCircle2
										size={16}
										color="#000000"
										strokeWidth={2.5}
									/>
									<Text className="flex-1 font-mono text-xs text-foreground">
										{success}
									</Text>
								</View>
							)}
						</ScrollView>

						<View className="flex-row items-center gap-3 border-t-2 border-border bg-card px-4 py-3 shadow-neo">
							<NeoButton
								size="md"
								variant="outline"
								className="flex-1"
								onPress={handleDismiss}
								disabled={updateAccountMutation.isPending}>
								Cancel
							</NeoButton>
							<NeoButton
								size="md"
								variant="primary"
								className="flex-1"
								loading={updateAccountMutation.isPending}
								disabled={
									!hasChanges ||
									updateAccountMutation.isPending
								}
								onPress={handleSave}>
								Save Changes
							</NeoButton>
						</View>
					</KeyboardAvoidingView>
				</SafeAreaView>
			</View>
		</Modal>
	);
}
