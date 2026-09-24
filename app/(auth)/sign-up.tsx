import { createIdVerification, signOut, uploadIdDocument } from "@auth/api";
import { useGoogleSignIn } from "@auth/hooks/useGoogleSignIn";
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
	Camera,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	FileText,
	ImageIcon,
	Lock,
	Mail,
	RotateCcw,
	UploadCloud,
	User,
} from "lucide-react-native";
import { Button, Dialog, Text } from "panelui-native";
import { GoogleIcon } from "panelui-native/icons";
import { useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// I differntiate the sign up to 3 steps
type SignUpStep = "credentials" | "id_upload" | "pending_approval";

export default function SignUpScreen() {
	const insets = useSafeAreaInsets();
	const [step, setStep] = useState<SignUpStep>("credentials");

	// credentials form state
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);
	const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<{
		username?: string;
		email?: string;
		password?: string;
		confirmPassword?: string;
	}>({});

	// id upload state
	const [idAsset, setIdAsset] = useState<ImagePicker.ImagePickerAsset | null>(
		null,
	);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// dialog state
	const [dialogState, setDialogState] = useState<{
		open: boolean;
		title: string;
		description: string;
	}>({ open: false, title: "", description: "" });

	const showDialog = (title: string, description: string) => {
		setDialogState({ open: true, title, description });
	};

	const signUpMutation = useSignUp();
	const googleSignInMutation = useGoogleSignIn();

	const handleGoogleSignIn = async () => {
		setErrorMessage(null);
		try {
			const data = await googleSignInMutation.mutateAsync();
			if (data?.session) {
				router.replace("/(tabs)");
			}
		} catch (err: unknown) {
			const error = err as Error;
			setErrorMessage(error?.message || "Failed to sign in with Google.");
		}
	};

	// validate credentials with zod
	const handleContinueToId = () => {
		setErrorMessage(null);
		setFieldErrors({});

		const trimmedEmail = email.trim();
		const trimmedUsername = username.trim();
		const trimmedPassword = password.trim();
		const trimmedConfirmPassword = confirmPassword.trim();

		const validation = signUpCredentialsSchema.safeParse({
			username: trimmedUsername,
			email: trimmedEmail,
			password: trimmedPassword,
			confirmPassword: trimmedConfirmPassword,
		});

		if (!validation.success) {
			const formatted = validation.error.flatten().fieldErrors;
			setFieldErrors({
				username: formatted.username?.[0],
				email: formatted.email?.[0],
				password: formatted.password?.[0],
				confirmPassword: formatted.confirmPassword?.[0],
			});
			setErrorMessage(
				validation.error.issues[0]?.message || "Please check your inputs.",
			);
			return;
		}

		setStep("id_upload");
	};

	// camera option
	const handleTakePhoto = async () => {
		try {
			const permission = await ImagePicker.requestCameraPermissionsAsync();
			if (!permission.granted) {
				showDialog(
					"Camera Permission Needed",
					"Camera access is required to capture your identity document.",
				);
				return;
			}

			const result = await ImagePicker.launchCameraAsync({
				allowsEditing: true,
				aspect: [4, 3],
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

	// or pick from media library
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
				aspect: [4, 3],
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

	// submit and wait for approval
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
				idValidation.error.issues[0]?.message || "Invalid document asset.",
			);
			return;
		}

		const trimmedEmail = email.trim();
		const trimmedUsername = username.trim();
		const trimmedPassword = password.trim();
		const trimmedConfirmPassword = confirmPassword.trim();

		const credValidation = signUpCredentialsSchema.safeParse({
			username: trimmedUsername,
			email: trimmedEmail,
			password: trimmedPassword,
			confirmPassword: trimmedConfirmPassword,
		});

		if (!credValidation.success) {
			setStep("credentials");
			const formatted = credValidation.error.flatten().fieldErrors;
			setFieldErrors({
				username: formatted.username?.[0],
				email: formatted.email?.[0],
				password: formatted.password?.[0],
				confirmPassword: formatted.confirmPassword?.[0],
			});
			setErrorMessage(
				credValidation.error.issues[0]?.message || "Please check your inputs.",
			);
			return;
		}

		setIsSubmitting(true);
		setErrorMessage(null);

		try {
			let currentUserId = registeredUserId;

			// if user was not yet registered in this session, perform sign up
			if (!currentUserId || registeredEmail !== trimmedEmail) {
				const signUpData = await signUpMutation.mutateAsync({
					username: trimmedUsername,
					email: trimmedEmail,
					password: trimmedPassword,
				});

				// if supabase has email confirmation enabled, existing accounts return empty identities
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
					throw new Error("Unable to create account. Please try again.");
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

			// ensure user is not auto-logged in; account awaits admin review
			try {
				await signOut();
				useAuthStore.getState().clearSession();
			} catch {
				// Continue to pending state
			}

			// advance to admin approval pending state
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
				setErrorMessage(msg || "Failed to create account. Please try again.");
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
			<StatusBar style="light" />
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
								className="h-10 w-10 items-center justify-center rounded-xl border border-border bg-card active:scale-[0.96] active:bg-popover">
								<ArrowLeft
									size={18}
									className="-translate-x-0.5 text-foreground"
								/>
							</Pressable>
						) : (
							<View className="h-10 w-10" />
						)}
						{step !== "pending_approval" ? (
							<View className="flex-row items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1">
								<View
									className={`h-1.5 w-1.5 rounded-full ${
										step === "credentials"
											? "bg-primary"
											: "bg-muted-foreground"
									}`}
								/>
								<View
									className={`h-1.5 w-1.5 rounded-full ${
										step === "id_upload" ? "bg-primary" : "bg-muted-foreground"
									}`}
								/>
								<Text
									weight="medium"
									className="ml-1 text-xs text-muted-foreground">
									{step === "credentials" ? "Step 1 of 2" : "Step 2 of 2"}
								</Text>
							</View>
						) : (
							<Text
								weight="semibold"
								className="text-sm tracking-widest text-muted-foreground uppercase">
								impulse
							</Text>
						)}
						<View className="w-10" />
					</View>
					{/* ACCOUNT CREDENTIALS STEP HERE */}
					{step === "credentials" && (
						<View className="flex-1">
							<View className="pb-6">
								<Text
									weight="bold"
									className="text-3xl tracking-tight text-foreground">
									Create account
								</Text>
								<Text className="mt-2 text-sm text-muted-foreground">
									Enter your information to begin your verification
								</Text>
							</View>
							{errorMessage && (
								<View className="mb-6 flex-row items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
									<AlertCircle
										size={18}
										className="shrink-0 text-destructive"
									/>
									<Text className="flex-1 text-sm text-destructive">
										{errorMessage}
									</Text>
								</View>
							)}
							{/* Google SSO Button */}
							<Button
								size="lg"
								fullWidth
								variant="social"
								loading={googleSignInMutation.isPending}
								startContent={<GoogleIcon size={20} />}
								onPress={handleGoogleSignIn}>
								Sign up with Google
							</Button>
							<View className="my-6 flex-row items-center gap-3">
								<View className="h-px flex-1 bg-border" />
								<Text
									weight="medium"
									className="text-xs text-muted-foreground uppercase">
									or register with email
								</Text>
								<View className="h-px flex-1 bg-border" />
							</View>
							<View className="gap-4">
								{/* Name Field */}
								<View className="gap-2">
									<Text
										weight="medium"
										className="text-xs text-muted-foreground">
										Full Name / Username
									</Text>
									<View
										className={`flex-row items-center rounded-xl border ${
											fieldErrors.username
												? "border-destructive"
												: "border-border"
										} bg-card px-4 py-1.5 focus:border-primary`}>
										<User
											size={18}
											strokeWidth={1.75}
											className="mr-3 text-muted-foreground"
										/>
										<TextInput
											className="flex-1 text-base text-foreground"
											placeholder="Jane Doe"
											placeholderTextColor="#686868"
											value={username}
											onChangeText={(text) => {
												setUsername(text);
												if (fieldErrors.username) {
													setFieldErrors((prev) => ({
														...prev,
														username: undefined,
													}));
												}
											}}
											autoCapitalize="words"
											autoCorrect={false}
											returnKeyType="next"
										/>
									</View>
									{fieldErrors.username && (
										<Text className="text-xs text-destructive">
											{fieldErrors.username}
										</Text>
									)}
								</View>
								<View className="gap-2">
									<Text
										weight="medium"
										className="text-xs text-muted-foreground">
										Email Address
									</Text>
									<View
										className={`flex-row items-center rounded-xl border ${
											fieldErrors.email ? "border-destructive" : "border-border"
										} bg-card px-4 py-1.5 focus:border-primary`}>
										<Mail
											size={18}
											strokeWidth={1.75}
											className="mr-3 text-muted-foreground"
										/>
										<TextInput
											className="flex-1 text-base text-foreground"
											placeholder="name@example.com"
											placeholderTextColor="#686868"
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
										/>
									</View>
									{fieldErrors.email && (
										<Text className="text-xs text-destructive">
											{fieldErrors.email}
										</Text>
									)}
								</View>
								<View className="gap-2">
									<Text
										weight="medium"
										className="text-xs text-muted-foreground">
										Password
									</Text>
									<View
										className={`flex-row items-center rounded-xl border ${
											fieldErrors.password
												? "border-destructive"
												: "border-border"
										} bg-card px-4 py-1.5 focus:border-primary`}>
										<Lock
											size={18}
											strokeWidth={1.75}
											className="mr-3 text-muted-foreground"
										/>
										<TextInput
											className="flex-1 text-base text-foreground"
											placeholder="At least 8 characters"
											placeholderTextColor="#686868"
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
															? { confirmPassword: undefined }
															: {}),
													}));
												}
												if (errorMessage === "Passwords do not match.") {
													setErrorMessage(null);
												}
											}}
											secureTextEntry={!showPassword}
											autoCapitalize="none"
											autoCorrect={false}
											returnKeyType="next"
										/>
									</View>
									{fieldErrors.password && (
										<Text className="text-xs text-destructive">
											{fieldErrors.password}
										</Text>
									)}
								</View>
								<View className="gap-2">
									<Text
										weight="medium"
										className="text-xs text-muted-foreground">
										Confirm Password
									</Text>
									<View
										className={`flex-row items-center rounded-xl border ${
											fieldErrors.confirmPassword
												? "border-destructive"
												: "border-border"
										} bg-card px-4 py-1.5 focus:border-primary`}>
										<Lock
											size={18}
											strokeWidth={1.75}
											className="mr-3 text-muted-foreground"
										/>
										<TextInput
											className="flex-1 text-base text-foreground"
											placeholder="Re-enter password"
											placeholderTextColor="#686868"
											value={confirmPassword}
											onChangeText={(text) => {
												setConfirmPassword(text);
												if (fieldErrors.confirmPassword) {
													setFieldErrors((prev) => ({
														...prev,
														confirmPassword: undefined,
													}));
												}
												if (errorMessage === "Passwords do not match.") {
													setErrorMessage(null);
												}
											}}
											secureTextEntry={!showPassword}
											autoCapitalize="none"
											autoCorrect={false}
											returnKeyType="done"
											onSubmitEditing={handleContinueToId}
										/>
									</View>
									{fieldErrors.confirmPassword && (
										<Text className="text-xs text-destructive">
											{fieldErrors.confirmPassword}
										</Text>
									)}
								</View>
								{/* Reveal Password Checkbox */}
								<Pressable
									onPress={() => setShowPassword(!showPassword)}
									hitSlop={8}
									accessibilityRole="checkbox"
									accessibilityState={{ checked: showPassword }}
									className="flex-row items-center gap-2 self-start active:opacity-70">
									<View
										className={`h-4 w-4 items-center justify-center rounded border transition-colors ${
											showPassword
												? "border-primary bg-primary"
												: "border-border bg-card"
										}`}>
										{showPassword && (
											<Check
												size={11}
												strokeWidth={2.5}
												className="text-primary-foreground"
											/>
										)}
									</View>
									<Text
										weight="medium"
										className="text-xs text-muted-foreground select-none">
										Reveal password
									</Text>
								</Pressable>
								<View className="pt-3">
									<Button
										size="lg"
										fullWidth
										variant="primary"
										endContent={
											<ChevronRight
												size={18}
												className="text-primary-foreground"
											/>
										}
										onPress={handleContinueToId}>
										Continue to Verification
									</Button>
								</View>
							</View>
							<View className="mt-auto flex-row items-center justify-center pt-8">
								<Text className="text-sm text-muted-foreground">
									Already have an account?{" "}
								</Text>
								<Pressable
									onPress={() => router.push("/(auth)/sign-in")}
									hitSlop={8}
									className="active:opacity-70">
									<Text weight="semibold" className="text-sm text-foreground">
										Log In
									</Text>
								</Pressable>
							</View>
						</View>
					)}
					{/* ID DOCUMENT UPLOAD STEP HERE */}
					{step === "id_upload" && (
						<View className="flex-1">
							<View className="pb-5">
								<Text
									weight="bold"
									className="text-3xl tracking-tight text-foreground">
									Verify your identity
								</Text>
								<Text className="mt-2 text-sm text-muted-foreground">
									Upload your GCT Student ID
								</Text>
							</View>
							{!idAsset ? (
								<View className="mb-5 items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 p-6 py-8">
									<View className="mb-3.5 h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
										<UploadCloud size={30} className="text-primary" />
									</View>
									<Text weight="semibold" className="text-base text-foreground">
										Select your ID
									</Text>
									<Text className="mt-1 text-center text-xs text-muted-foreground">
										Supported: JPG, PNG · Clear, uncropped, readable
									</Text>
									{/* Action Buttons */}
									<View className="mt-6 w-full flex-row gap-3">
										<Pressable
											onPress={handleTakePhoto}
											className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 active:scale-[0.98] active:bg-popover">
											<Camera
												size={18}
												strokeWidth={1.75}
												className="text-foreground"
											/>
											<Text
												weight="semibold"
												className="text-sm text-foreground">
												Take Photo
											</Text>
										</Pressable>
										<Pressable
											onPress={handlePickImage}
											className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 active:scale-[0.98] active:bg-popover">
											<ImageIcon
												size={18}
												strokeWidth={1.75}
												className="text-foreground"
											/>
											<Text
												weight="semibold"
												className="text-sm text-foreground">
												Browse Gallery
											</Text>
										</Pressable>
									</View>
								</View>
							) : (
								<View className="mb-5 rounded-3xl border border-border bg-card p-3">
									<View className="overflow-hidden rounded-2xl border border-white/10 bg-background">
										<Image
											source={{ uri: idAsset.uri }}
											style={{ width: "100%", height: 210 }}
											contentFit="cover"
											transition={200}
										/>
									</View>
									<View className="mt-3 flex-row items-center justify-between px-1">
										<View className="flex-row items-center gap-2">
											<FileText
												size={16}
												strokeWidth={1.75}
												className="text-muted-foreground"
											/>
											<Text weight="medium" className="text-sm text-foreground">
												ID_Document.jpg
											</Text>
										</View>
										<View className="flex-row items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5">
											<CheckCircle2 size={12} color="#10b981" />
											<Text className="font-medium text-xs text-emerald-400">
												Attached
											</Text>
										</View>
									</View>
									<View className="mt-3.5 flex-row gap-2.5 border-t border-border pt-3">
										<Pressable
											onPress={handleTakePhoto}
											className="min-h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-border bg-popover py-2.5 active:scale-[0.98]">
											<RotateCcw
												size={15}
												strokeWidth={1.75}
												className="text-muted-foreground"
											/>
											<Text weight="medium" className="text-xs text-foreground">
												Retake
											</Text>
										</Pressable>
										<Pressable
											onPress={handlePickImage}
											className="min-h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-border bg-popover py-2.5 active:scale-[0.98]">
											<ImageIcon
												size={15}
												strokeWidth={1.75}
												className="text-muted-foreground"
											/>
											<Text weight="medium" className="text-xs text-foreground">
												Choose Other
											</Text>
										</Pressable>
									</View>
								</View>
							)}
							<View className="mb-6 rounded-2xl border border-border bg-card p-4">
								<Text
									weight="medium"
									className="mb-3 text-xs tracking-wider text-muted-foreground uppercase">
									Guidelines for fast approval
								</Text>
								<View className="gap-2.5">
									<View className="flex-row items-center gap-2.5">
										<CheckCircle2 size={15} className="text-primary" />
										<Text className="text-xs text-muted-foreground">
											Ensure all four corners of the ID card are visible
										</Text>
									</View>
									<View className="flex-row items-center gap-2.5">
										<CheckCircle2 size={15} className="text-primary" />
										<Text className="text-xs text-muted-foreground">
											Avoid harsh lighting, glare, or blurred captures
										</Text>
									</View>
								</View>
							</View>
							{/* Submit CTA */}
							<View className="mt-auto pt-2">
								<Button
									size="lg"
									fullWidth
									variant="primary"
									disabled={!idAsset}
									loading={isSubmitting}
									onPress={handleSubmitVerification}>
									Submit for Verification
								</Button>
							</View>
						</View>
					)}
					{/* APPROVAL SCREEN */}
					{step === "pending_approval" && (
						<View className="flex-1 items-center justify-center py-6">
							{/* Ambient Status Halo */}
							<View className="relative mb-6 items-center justify-center">
								<View className="h-24 w-24 items-center justify-center rounded-3xl border border-primary/30 bg-primary/10">
									<Clock
										size={44}
										className="text-primary"
										strokeWidth={1.75}
									/>
								</View>
							</View>
							<Text
								weight="bold"
								className="text-center text-3xl tracking-tight text-foreground">
								Verification Pending
							</Text>
							<Text
								weight="semibold"
								className="mt-1 text-center text-xs tracking-widest text-primary uppercase">
								Application Under Review
							</Text>
							<Text className="mt-3 px-2 text-center text-sm leading-relaxed text-muted-foreground">
								Thank you for submitting your ID. Our team manually reviews all
								documentation to ensure account safety and platform integrity.
							</Text>
							<View className="my-6 w-full gap-3 rounded-2xl border border-border bg-card p-4">
								<View className="flex-row items-center justify-between border-b border-border pb-3">
									<Text className="text-xs text-muted-foreground">Account</Text>
									<Text weight="medium" className="text-xs text-foreground">
										{email || "Registered account"}
									</Text>
								</View>
								<View className="flex-row items-center justify-between border-b border-border pb-3">
									<Text className="text-xs text-muted-foreground">
										Typical Turnaround
									</Text>
									<Text weight="medium" className="text-xs text-foreground">
										Within 24 hours
									</Text>
								</View>
								<View className="flex-row items-center justify-between pt-0.5">
									<Text className="text-xs text-muted-foreground">Status</Text>
									<View className="flex-row items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5">
										<View className="h-1.5 w-1.5 rounded-full bg-amber-400" />
										<Text className="font-medium text-xs text-amber-400">
											Pending Admin Approval
										</Text>
									</View>
								</View>
							</View>
							<View className="mb-6 flex-row items-center gap-2.5 px-2">
								<Text className="text-center text-xs text-muted-foreground">
									You'll receive an email notification as soon as an
									administrator activates your account.
								</Text>
							</View>
							<View className="w-full gap-3">
								<Button
									size="lg"
									fullWidth
									variant="primary"
									onPress={() => router.replace("/(onboarding)/onboarding")}>
									Back to Home
								</Button>
								<Button
									size="lg"
									fullWidth
									variant="outline"
									onPress={() => router.replace("/(auth)/sign-in")}>
									Log In to Existing Account
								</Button>
							</View>
						</View>
					)}
				</ScrollView>
			</KeyboardAvoidingView>
			<Dialog
				open={dialogState.open}
				onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}>
				<Dialog.Content className="mx-4 max-w-sm rounded-2xl border border-border bg-card p-6">
					<Dialog.Title weight="bold" className="text-xl text-foreground">
						{dialogState.title}
					</Dialog.Title>
					<Dialog.Description className="mt-2 text-sm text-muted-foreground">
						{dialogState.description}
					</Dialog.Description>
					<Dialog.Footer className="mt-6 flex-row justify-end">
						<Button
							size="md"
							variant="primary"
							onPress={() =>
								setDialogState((prev) => ({ ...prev, open: false }))
							}>
							Okay
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>
		</View>
	);
}
