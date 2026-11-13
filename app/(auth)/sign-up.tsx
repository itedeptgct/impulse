import { createIdVerification, signOut, uploadIdDocument } from "@auth/api";
import { useSignUp } from "@auth/hooks/useSignUp";
import { idDocumentSchema, signUpCredentialsSchema } from "@auth/schemas";
import { useAuthStore } from "@auth/store";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
	AlertCircle,
	ArrowLeft,
	AtSign,
	Camera,
	CheckCircle2,
	ChevronRight,
	Clock,
	Eye,
	EyeOff,
	FileText,
	ImageIcon,
	Lock,
	Mail,
	RotateCcw,
	UploadCloud,
	User,
} from "lucide-react-native";
import { useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import Animated, {
	FadeIn,
	FadeInDown,
	useReducedMotion,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	MobileAlertSheet,
	NeoBadge,
	NeoButton,
	NeoCard,
	NeoInput,
} from "@/components/ui";
import { PasswordRequirementsList } from "@/features/auth/components/PasswordRequirementsList";

type SignUpStep = "credentials" | "id_upload" | "pending_approval";

export default function SignUpScreen() {
	const insets = useSafeAreaInsets();
	const reduceMotion = useReducedMotion();
	const [step, setStep] = useState<SignUpStep>("credentials");

	const [displayName, setDisplayName] = useState("");
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [registeredUserId, setRegisteredUserId] = useState<string | null>(
		null,
	);
	const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<{
		displayName?: string;
		username?: string;
		email?: string;
		password?: string;
		confirmPassword?: string;
	}>({});

	const [idAsset, setIdAsset] = useState<ImagePicker.ImagePickerAsset | null>(
		null,
	);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [dialogState, setDialogState] = useState<{
		open: boolean;
		title: string;
		description: string;
	}>({ open: false, title: "", description: "" });

	const showDialog = (title: string, description: string) => {
		setDialogState({ open: true, title, description });
	};

	const signUpMutation = useSignUp();

	const handleContinueToId = () => {
		setErrorMessage(null);
		setFieldErrors({});

		const trimmedDisplayName = displayName.trim();
		const trimmedUsername = username.trim().toLowerCase().replace(/^@/, "");
		const trimmedEmail = email.trim();
		const trimmedPassword = password.trim();
		const trimmedConfirmPassword = confirmPassword.trim();

		const validation = signUpCredentialsSchema.safeParse({
			displayName: trimmedDisplayName,
			username: trimmedUsername,
			email: trimmedEmail,
			password: trimmedPassword,
			confirmPassword: trimmedConfirmPassword,
		});

		if (!validation.success) {
			const formatted = validation.error.flatten().fieldErrors;
			setFieldErrors({
				displayName: formatted.displayName?.[0],
				username: formatted.username?.[0],
				email: formatted.email?.[0],
				password: formatted.password?.[0],
				confirmPassword: formatted.confirmPassword?.[0],
			});
			setErrorMessage(
				validation.error.issues[0]?.message ||
					"Please check your inputs.",
			);
			return;
		}

		setStep("id_upload");
	};

	const handleTakePhoto = async () => {
		try {
			const permission =
				await ImagePicker.requestCameraPermissionsAsync();
			if (!permission.granted) {
				showDialog(
					"Camera Permission Needed",
					"Camera access is required to capture your identity document.",
				);
				return;
			}

			const result = await ImagePicker.launchCameraAsync({
				allowsEditing: true,
				quality: 0.85,
			});

			if (!result.canceled && result.assets && result.assets[0]) {
				setIdAsset(result.assets[0]);
			}
		} catch {
			showDialog(
				"Camera Error",
				"Unable to access camera. You can select an image from your library instead.",
			);
		}
	};

	const handlePickImage = async () => {
		try {
			const permission =
				await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (!permission.granted) {
				showDialog(
					"Media Library Permission Needed",
					"Photo library access is required to select your identity document.",
				);
				return;
			}

			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ["images"],
				allowsEditing: true,
				quality: 0.85,
			});

			if (!result.canceled && result.assets && result.assets[0]) {
				setIdAsset(result.assets[0]);
			}
		} catch {
			showDialog(
				"Library Error",
				"Unable to open photo library. Please try again.",
			);
		}
	};

	const handleSubmitVerification = async () => {
		if (!idAsset) {
			showDialog(
				"Document Required",
				"Please upload or capture your photo ID before submitting.",
			);
			return;
		}

		const idValidation = idDocumentSchema.safeParse({
			uri: idAsset.uri,
			width: idAsset.width,
			height: idAsset.height,
			fileName: idAsset.fileName,
			fileSize: idAsset.fileSize,
		});

		if (!idValidation.success) {
			showDialog(
				"Invalid Document",
				idValidation.error.issues[0]?.message ||
					"Invalid document asset.",
			);
			return;
		}

		const trimmedDisplayName = displayName.trim();
		const trimmedUsername = username.trim().toLowerCase().replace(/^@/, "");
		const trimmedEmail = email.trim();
		const trimmedPassword = password.trim();
		const trimmedConfirmPassword = confirmPassword.trim();

		const credValidation = signUpCredentialsSchema.safeParse({
			displayName: trimmedDisplayName,
			username: trimmedUsername,
			email: trimmedEmail,
			password: trimmedPassword,
			confirmPassword: trimmedConfirmPassword,
		});

		if (!credValidation.success) {
			setStep("credentials");
			const formatted = credValidation.error.flatten().fieldErrors;
			setFieldErrors({
				displayName: formatted.displayName?.[0],
				username: formatted.username?.[0],
				email: formatted.email?.[0],
				password: formatted.password?.[0],
				confirmPassword: formatted.confirmPassword?.[0],
			});
			setErrorMessage(
				credValidation.error.issues[0]?.message ||
					"Please check your inputs.",
			);
			return;
		}

		setIsSubmitting(true);
		setErrorMessage(null);

		try {
			let currentUserId = registeredUserId;

			if (!currentUserId || registeredEmail !== trimmedEmail) {
				const signUpData = await signUpMutation.mutateAsync({
					displayName: trimmedDisplayName,
					username: trimmedUsername,
					email: trimmedEmail,
					password: trimmedPassword,
				});

				if (
					signUpData?.user &&
					signUpData.user.identities &&
					signUpData.user.identities.length === 0
				) {
					setStep("credentials");
					setFieldErrors({
						email: "An account with this email already exists.",
					});
					setErrorMessage(
						"An account with this email already exists. Please log in or use another email.",
					);
					showDialog(
						"Account Exists",
						"An account with this email already exists. Please log in or use another email.",
					);
					return;
				}

				currentUserId = signUpData?.user?.id ?? null;
				if (!currentUserId) {
					throw new Error(
						"Unable to create account. Please try again.",
					);
				}

				setRegisteredUserId(currentUserId);
				setRegisteredEmail(trimmedEmail);
			}

			if (currentUserId && idAsset) {
				const documentPath = await uploadIdDocument(
					currentUserId,
					idAsset.uri,
					idAsset.fileName,
				);
				await createIdVerification(currentUserId, documentPath);
			}

			try {
				await signOut();
				useAuthStore.getState().clearSession();
			} catch {}

			setStep("pending_approval");
		} catch (err: unknown) {
			const error = err as Error & { code?: string; status?: number };
			const msg = error?.message || "";
			const isDuplicate =
				error?.code === "user_already_exists" ||
				error?.status === 422 ||
				msg.toLowerCase().includes("already registered") ||
				msg.toLowerCase().includes("already exists");

			if (isDuplicate) {
				setStep("credentials");
				setFieldErrors({
					email: "An account with this email already exists.",
				});
				setErrorMessage(
					"An account with this email already exists. Please log in or use another email.",
				);
				showDialog(
					"Account Exists",
					"An account with this email already exists. Please log in or use another email.",
				);
			} else {
				setErrorMessage(
					msg || "Failed to create account. Please try again.",
				);
				showDialog(
					"Registration Error",
					msg || "Failed to create account. Please try again.",
				);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<View className="flex-1 bg-background">
			<StatusBar style="dark" />
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				className="flex-1">
				<ScrollView
					contentContainerStyle={{
						flexGrow: 1,
						paddingTop: insets.top + 16,
						paddingBottom: Math.max(insets.bottom, 16) + 24,
						paddingHorizontal: 24,
					}}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}>
					<View className="flex-row items-center justify-between pb-6">
						{step !== "pending_approval" ? (
							<Pressable
								onPress={() => {
									if (step === "id_upload") {
										setStep("credentials");
									} else {
										router.back();
									}
								}}
								hitSlop={8}
								className="size-10 items-center justify-center rounded-none border-2 border-border bg-card shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
								<ArrowLeft
									size={18}
									color="#000000"
									strokeWidth={2.5}
									className="-translate-x-0.5"
								/>
							</Pressable>
						) : (
							<View className="size-10" />
						)}
						<NeoBadge variant="primary" size="sm">
							{step === "credentials"
								? "STEP 1/2: CREDENTIALS"
								: "STEP 2/2: ID VERIFICATION"}
						</NeoBadge>
						<View className="w-10" />
					</View>

					{step === "credentials" && (
						<Animated.View
							key="credentials"
							entering={
								reduceMotion
									? FadeIn.duration(180)
									: FadeInDown.duration(240)
							}
							className="flex-1">
							<View className="pb-6">
								<Text className="font-display text-3xl tracking-tight text-foreground uppercase">
									CREATE ACCOUNT
								</Text>
								<Text className="mt-1.5 font-mono text-xs text-muted-foreground uppercase">
									ENTER ACADEMIC CREDENTIALS TO BEGIN
									VERIFICATION
								</Text>
							</View>

							{errorMessage && (
								<View className="mb-6 flex-row items-center gap-3 rounded-none border-2 border-destructive bg-destructive/10 p-4 shadow-neo-sm">
									<AlertCircle
										size={18}
										color="#ff2a00"
										className="shrink-0"
									/>
									<Text className="flex-1 font-mono text-xs text-destructive">
										{errorMessage}
									</Text>
								</View>
							)}

							<View className="gap-4">
								<NeoInput
									label="DISPLAY NAME"
									placeholder="Jane Doe"
									value={displayName}
									onChangeText={(text) => {
										setDisplayName(text);
										if (fieldErrors.displayName) {
											setFieldErrors((prev) => ({
												...prev,
												displayName: undefined,
											}));
										}
									}}
									autoCapitalize="words"
									autoCorrect={false}
									returnKeyType="next"
									error={fieldErrors.displayName}
									startContent={
										<User
											size={16}
											color="#000000"
											strokeWidth={2.2}
										/>
									}
								/>

								<NeoInput
									label="USERNAME (HANDLE)"
									placeholder="janedoe"
									value={username}
									onChangeText={(text) => {
										const clean = text
											.toLowerCase()
											.replace(/[^a-z0-9_]/g, "");
										setUsername(clean);
										if (fieldErrors.username) {
											setFieldErrors((prev) => ({
												...prev,
												username: undefined,
											}));
										}
									}}
									autoCapitalize="none"
									autoCorrect={false}
									returnKeyType="next"
									error={fieldErrors.username}
									startContent={
										<AtSign
											size={16}
											color="#000000"
											strokeWidth={2.2}
										/>
									}
								/>

								<NeoInput
									label="EMAIL ADDRESS"
									placeholder="student@example.com"
									value={email}
									onChangeText={(text) => {
										setEmail(text);
										if (registeredUserId) {
											setRegisteredUserId(null);
											setRegisteredEmail(null);
										}
										if (fieldErrors.email) {
											setFieldErrors((prev) => ({
												...prev,
												email: undefined,
											}));
										}
									}}
									autoCapitalize="none"
									autoCorrect={false}
									keyboardType="email-address"
									returnKeyType="next"
									error={fieldErrors.email}
									startContent={
										<Mail
											size={16}
											color="#000000"
											strokeWidth={2.2}
										/>
									}
								/>

								<NeoInput
									label="PASSWORD"
									placeholder="At least 8 characters"
									value={password}
									onChangeText={(text) => {
										setPassword(text);
										if (
											fieldErrors.password ||
											fieldErrors.confirmPassword ===
												"Passwords do not match."
										) {
											setFieldErrors((prev) => ({
												...prev,
												password: undefined,
												...(prev.confirmPassword ===
												"Passwords do not match."
													? {
															confirmPassword:
																undefined,
														}
													: {}),
											}));
										}
										if (
											errorMessage ===
											"Passwords do not match."
										) {
											setErrorMessage(null);
										}
									}}
									secureTextEntry={!showPassword}
									autoCapitalize="none"
									autoCorrect={false}
									returnKeyType="next"
									error={fieldErrors.password}
									startContent={
										<Lock
											size={16}
											color="#000000"
											strokeWidth={2.2}
										/>
									}
									endContent={
										<Pressable
											onPress={() =>
												setShowPassword(!showPassword)
											}
											hitSlop={12}
											accessibilityRole="button"
											accessibilityLabel={
												showPassword
													? "Hide password"
													: "Show password"
											}
											className="active:opacity-70">
											{showPassword ? (
												<EyeOff
													size={16}
													color="#000000"
													strokeWidth={2.2}
												/>
											) : (
												<Eye
													size={16}
													color="#000000"
													strokeWidth={2.2}
												/>
											)}
										</Pressable>
									}
								/>

								{password.length > 0 && (
									<Animated.View
										entering={
											reduceMotion
												? FadeIn.duration(180)
												: FadeInDown.duration(240)
										}>
										<PasswordRequirementsList
											password={password}
										/>
									</Animated.View>
								)}

								<NeoInput
									label="CONFIRM PASSWORD"
									placeholder="Re-enter password"
									value={confirmPassword}
									onChangeText={(text) => {
										setConfirmPassword(text);
										if (fieldErrors.confirmPassword) {
											setFieldErrors((prev) => ({
												...prev,
												confirmPassword: undefined,
											}));
										}
										if (
											errorMessage ===
											"Passwords do not match."
										) {
											setErrorMessage(null);
										}
									}}
									secureTextEntry={!showConfirmPassword}
									autoCapitalize="none"
									autoCorrect={false}
									returnKeyType="done"
									onSubmitEditing={handleContinueToId}
									error={fieldErrors.confirmPassword}
									startContent={
										<Lock
											size={16}
											color="#000000"
											strokeWidth={2.2}
										/>
									}
									endContent={
										<Pressable
											onPress={() =>
												setShowConfirmPassword(
													!showConfirmPassword,
												)
											}
											hitSlop={12}
											accessibilityRole="button"
											accessibilityLabel={
												showConfirmPassword
													? "Hide confirm password"
													: "Show confirm password"
											}
											className="active:opacity-70">
											{showConfirmPassword ? (
												<EyeOff
													size={16}
													color="#000000"
													strokeWidth={2.2}
												/>
											) : (
												<Eye
													size={16}
													color="#000000"
													strokeWidth={2.2}
												/>
											)}
										</Pressable>
									}
								/>

								<View className="pt-2">
									<NeoButton
										size="lg"
										variant="primary"
										className="w-full"
										endContent={
											<ChevronRight
												size={18}
												color="#faf9f5"
												strokeWidth={2.5}
											/>
										}
										onPress={handleContinueToId}>
										CONTINUE TO VERIFICATION
									</NeoButton>
								</View>

								<View className="px-2 pt-3">
									<Text className="text-center font-mono text-[11px] leading-relaxed text-muted-foreground uppercase">
										By creating an account, you agree to our{" "}
										<Text
											onPress={() =>
												router.push("/legal/terms")
											}
											className="font-bold text-foreground underline">
											Terms of Service
										</Text>{" "}
										and{" "}
										<Text
											onPress={() =>
												router.push("/legal/privacy")
											}
											className="font-bold text-foreground underline">
											Privacy Policy
										</Text>
										.
									</Text>
								</View>
							</View>

							<View className="mt-auto flex-row items-center justify-center pt-8">
								<Text className="font-mono text-xs text-muted-foreground uppercase">
									ALREADY HAVE AN ACCOUNT?{" "}
								</Text>
								<Pressable
									onPress={() =>
										router.push("/(auth)/sign-in")
									}
									hitSlop={8}
									className="min-h-11 justify-center active:opacity-70">
									<Text className="font-mono text-xs text-primary">
										SIGN IN →
									</Text>
								</Pressable>
							</View>
						</Animated.View>
					)}

					{step === "id_upload" && (
						<Animated.View
							key="id_upload"
							entering={
								reduceMotion
									? FadeIn.duration(180)
									: FadeInDown.duration(240)
							}
							className="flex-1">
							<View className="pb-5">
								<Text className="font-display text-3xl tracking-tight text-foreground uppercase">
									VERIFY IDENTITY
								</Text>
								<Text className="mt-1.5 font-mono text-xs text-muted-foreground uppercase">
									UPLOAD YOUR OFFICIAL GCT STUDENT ID CARD
								</Text>
							</View>

							{!idAsset ? (
								<View className="mb-5 items-center justify-center rounded-none border-2 border-solid border-border bg-card px-6 py-8 shadow-neo-sm">
									<View className="mb-3.5 size-16 items-center justify-center rounded-none border-2 border-border bg-muted">
										<UploadCloud
											size={30}
											color="#000000"
											strokeWidth={2}
										/>
									</View>
									<Text className="font-bold text-base text-foreground uppercase">
										STUDENT ID DOCUMENT
									</Text>
									<Text className="mt-1 text-center font-mono text-xs text-muted-foreground uppercase">
										SUPPORTED: JPG, PNG · CLEAR, UNCROPPED,
										READABLE
									</Text>

									<View className="mt-6 w-full flex-row gap-3">
										<NeoButton
											variant="outline"
											size="md"
											className="flex-1"
											startContent={
												<Camera
													size={16}
													color="#000000"
													strokeWidth={2.2}
												/>
											}
											onPress={handleTakePhoto}>
											TAKE PHOTO
										</NeoButton>
										<NeoButton
											variant="outline"
											size="md"
											className="flex-1"
											startContent={
												<ImageIcon
													size={16}
													color="#000000"
													strokeWidth={2.2}
												/>
											}
											onPress={handlePickImage}>
											BROWSE
										</NeoButton>
									</View>
								</View>
							) : (
								<NeoCard
									variant="raised"
									className="mb-5 p-3.5 shadow-neo">
									<View className="overflow-hidden rounded-none border-2 border-border bg-background">
										<Image
											source={{ uri: idAsset.uri }}
											style={{
												width: "100%",
												height: 210,
											}}
											contentFit="cover"
											transition={200}
										/>
									</View>
									<View className="mt-3 px-1">
										<View className="flex-row items-center gap-2">
											<FileText
												size={16}
												color="#9aa1b2"
												strokeWidth={2}
											/>
											<Text
												className="flex-1 font-mono text-xs text-foreground"
												numberOfLines={1}
												ellipsizeMode="middle">
												{idAsset.fileName ||
													"ID_DOCUMENT.JPG"}
											</Text>
										</View>
										<NeoBadge
											variant="primary"
											size="sm"
											className="mt-2 self-start">
											ATTACHED
										</NeoBadge>
									</View>
									<View className="mt-3.5 flex-row gap-2.5 border-t-2 border-border pt-3">
										<NeoButton
											variant="outline"
											size="sm"
											className="flex-1"
											startContent={
												<RotateCcw
													size={14}
													color="#000000"
													strokeWidth={2}
												/>
											}
											onPress={handleTakePhoto}>
											RETAKE
										</NeoButton>
										<NeoButton
											variant="outline"
											size="sm"
											className="flex-1"
											startContent={
												<ImageIcon
													size={14}
													color="#000000"
													strokeWidth={2}
												/>
											}
											onPress={handlePickImage}>
											CHOOSE OTHER
										</NeoButton>
									</View>
								</NeoCard>
							)}

							<NeoCard
								variant="default"
								className="mb-6 p-4 shadow-neo-sm">
								<Text className="mb-3 font-mono text-xs tracking-wider text-muted-foreground uppercase">
									GUIDELINES FOR FAST APPROVAL
								</Text>
								<View className="gap-2.5">
									<View className="flex-row items-center gap-2.5">
										<CheckCircle2
											size={15}
											color="#000000"
											strokeWidth={2.2}
										/>
										<Text className="font-mono text-xs text-muted-foreground">
											Ensure the front of your ID is
											visible
										</Text>
									</View>
									<View className="flex-row items-center gap-2.5">
										<CheckCircle2
											size={15}
											color="#000000"
											strokeWidth={2.2}
										/>
										<Text className="font-mono text-xs text-muted-foreground">
											Avoid harsh lighting, glare, or
											blurred captures
										</Text>
									</View>
									<View className="flex-row items-center gap-2.5">
										<CheckCircle2
											size={15}
											color="#000000"
											strokeWidth={2.2}
										/>
										<Text className="font-mono text-xs text-muted-foreground">
											Chat Jan Leigh Muñoz on Facebook to
											confirm your student ID if you need
											it fast
										</Text>
									</View>
								</View>
							</NeoCard>

							<View className="mt-auto pt-2">
								<NeoButton
									size="lg"
									variant="primary"
									className="w-full"
									disabled={!idAsset || isSubmitting}
									loading={isSubmitting}
									onPress={handleSubmitVerification}>
									REGISTER ACCOUNT
								</NeoButton>
								<View className="px-2 pt-3">
									<Text className="text-center font-mono text-[11px] leading-relaxed text-muted-foreground uppercase">
										By creating an account, you agree to our{" "}
										<Text
											onPress={() =>
												router.push("/legal/terms")
											}
											className="font-bold text-foreground underline">
											Terms of Service
										</Text>{" "}
										and{" "}
										<Text
											onPress={() =>
												router.push("/legal/privacy")
											}
											className="font-bold text-foreground underline">
											Privacy Policy
										</Text>
										.
									</Text>
								</View>
							</View>
						</Animated.View>
					)}

					{step === "pending_approval" && (
						<Animated.View
							key="pending_approval"
							entering={
								reduceMotion
									? FadeIn.duration(180)
									: FadeInDown.duration(240)
							}
							className="flex-1 items-center justify-center py-6">
							<View className="mb-6 size-20 items-center justify-center rounded-none border-2 border-border bg-muted shadow-neo">
								<Clock
									size={38}
									color="#000000"
									strokeWidth={2}
								/>
							</View>
							<Text className="text-center font-display text-3xl tracking-tight text-foreground uppercase">
								VERIFICATION PENDING
							</Text>
							<View className="mt-2">
								<NeoBadge variant="primary" size="sm">
									APPLICATION UNDER REVIEW
								</NeoBadge>
							</View>
							<Text className="mt-3 px-2 text-center font-mono text-xs leading-relaxed text-muted-foreground">
								Thank you for submitting your ID. Student
								accounts are manually verified by administrators
								to ensure platform safety.
							</Text>

							<NeoCard
								variant="raised"
								className="my-6 w-full gap-3 p-4 shadow-neo">
								<View className="flex-row items-center justify-between border-b-2 border-border pb-3">
									<Text className="font-mono text-xs text-muted-foreground uppercase">
										ACCOUNT
									</Text>
									<Text className="font-mono text-xs text-foreground">
										{email || "Registered account"}
									</Text>
								</View>
								<View className="flex-row items-center justify-between border-b-2 border-border pb-3">
									<Text className="font-mono text-xs text-muted-foreground uppercase">
										TYPICAL TURNAROUND
									</Text>
									<Text className="font-mono text-xs text-foreground">
										Within 24 hours
									</Text>
								</View>
								<View className="flex-row items-center justify-between pt-0.5">
									<Text className="font-mono text-xs text-muted-foreground uppercase">
										STATUS
									</Text>
									<View className="flex-row items-center gap-1.5 rounded-none border-2 border-border bg-muted px-2.5 py-0.5">
										<View className="size-1.5 rounded-none bg-primary" />
										<Text className="font-bold text-xs text-foreground uppercase">
											Pending Admin Approval
										</Text>
									</View>
								</View>
							</NeoCard>

							<Text className="mb-6 text-center font-mono text-xs text-muted-foreground">
								You'll receive an email notification as soon as
								an administrator activates your account.
							</Text>

							<View className="w-full gap-3">
								<NeoButton
									size="lg"
									variant="primary"
									className="w-full"
									onPress={() =>
										router.replace(
											"/(onboarding)/onboarding",
										)
									}>
									BACK TO HOME
								</NeoButton>
								<NeoButton
									size="lg"
									variant="outline"
									className="w-full"
									onPress={() =>
										router.replace("/(auth)/sign-in")
									}>
									LOG IN TO EXISTING ACCOUNT
								</NeoButton>
							</View>
						</Animated.View>
					)}
				</ScrollView>
			</KeyboardAvoidingView>

			<MobileAlertSheet
				open={dialogState.open}
				onOpenChange={(open) =>
					setDialogState((prev) => ({ ...prev, open }))
				}
				title={dialogState.title}
				description={dialogState.description}
				actions={[
					{
						label: "Okay",
						onPress: () =>
							setDialogState((prev) => ({
								...prev,
								open: false,
							})),
						variant: "primary",
					},
				]}
			/>
		</View>
	);
}
