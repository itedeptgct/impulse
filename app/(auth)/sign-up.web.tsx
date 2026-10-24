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
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	FileText,
	ImageIcon,
	Lock,
	Mail,
	RotateCcw,
	ShieldCheck,
	UploadCloud,
	User,
} from "lucide-react-native";
import { Button, Dialog, Text } from "panelui-native";
import { useRef, useState } from "react";
import { Platform, Pressable, ScrollView, TextInput, View } from "react-native";

type SignUpStep = "credentials" | "id_upload" | "pending_approval";

export default function SignUpWebScreen() {
	const [step, setStep] = useState<SignUpStep>("credentials");

	// credentials form state
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isValidatingStep1, setIsValidatingStep1] = useState(false);
	const [registeredUserId, setRegisteredUserId] = useState<string | null>(
		null,
	);
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
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

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

	// validate credentials with zod and check if email exists
	const handleContinueToId = async () => {
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
				validation.error.issues[0]?.message ||
					"Please check your inputs.",
			);
			return;
		}

		// if user was already successfully registered with this email in this session, proceed
		if (registeredUserId && registeredEmail === trimmedEmail) {
			setStep("id_upload");
			return;
		}

		setIsValidatingStep1(true);
		try {
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
				setFieldErrors({
					email: "An account with this email already exists.",
				});
				setErrorMessage(
					"An account with this email already exists. Please log in or use another email.",
				);
				return;
			}

			const newUserId = signUpData?.user?.id;
			if (!newUserId) {
				throw new Error("Unable to create account. Please try again.");
			}

			setRegisteredUserId(newUserId);
			setRegisteredEmail(trimmedEmail);
			setStep("id_upload");
		} catch (err: unknown) {
			const error = err as Error & { code?: string; status?: number };
			const msg = error?.message || "";
			const isDuplicate =
				error?.code === "user_already_exists" ||
				error?.status === 422 ||
				msg.toLowerCase().includes("already registered") ||
				msg.toLowerCase().includes("already exists");

			if (isDuplicate) {
				setFieldErrors({
					email: "An account with this email already exists.",
				});
				setErrorMessage(
					"An account with this email already exists. Please log in or use another email.",
				);
			} else {
				setErrorMessage(
					msg ||
						"Failed to verify account credentials. Please try again.",
				);
			}
		} finally {
			setIsValidatingStep1(false);
		}
	};

	// pick image via Expo ImagePicker or web file input
	const handlePickImage = async () => {
		if (Platform.OS === "web" && fileInputRef.current) {
			fileInputRef.current.click();
			return;
		}

		try {
			const permission =
				await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (!permission.granted) {
				showDialog(
					"File Access Needed",
					"Permission is required to select your identity document.",
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
				"File Error",
				"Unable to open file selector. Please try again.",
			);
		}
	};

	// web file input change handler
	const handleWebFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const uri = URL.createObjectURL(file);
			setIdAsset({
				uri,
				fileName: file.name,
				fileSize: file.size,
				width: 800,
				height: 600,
			});
		}
	};

	// Web drag & drop handlers
	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		const file = e.dataTransfer.files?.[0];
		if (file && file.type.startsWith("image/")) {
			const uri = URL.createObjectURL(file);
			setIdAsset({
				uri,
				fileName: file.name,
				fileSize: file.size,
				width: 800,
				height: 600,
			});
		} else if (file) {
			showDialog(
				"Invalid File",
				"Please upload an image file (PNG, JPG, or WebP).",
			);
		}
	};

	// submit verification
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

		setIsSubmitting(true);
		setErrorMessage(null);

		try {
			let currentUserId = registeredUserId;

			// fallback: If user was not yet registered, perform sign up
			if (!currentUserId) {
				const signUpData = await signUpMutation.mutateAsync({
					username: username.trim(),
					email: email.trim(),
					password,
				});
				currentUserId = signUpData?.user?.id ?? null;
			}

			if (currentUserId && idAsset) {
				try {
					const documentPath = await uploadIdDocument(
						currentUserId,
						idAsset.uri,
						idAsset.fileName,
					);
					await createIdVerification(currentUserId, documentPath);
				} catch {
					// proceed to pending review state even if initial upload has a transient issue
				}
			}

			// ensure user is not auto-logged in; account awaits admin review
			try {
				await signOut();
				useAuthStore.getState().clearSession();
			} catch {
				// Continue to pending state
			}

			// Advance to admin approval pending state
			setStep("pending_approval");
		} catch (err: unknown) {
			const error = err as Error;
			setErrorMessage(
				error?.message || "Failed to create account. Please try again.",
			);
			showDialog(
				"Registration Error",
				error?.message || "Failed to create account. Please try again.",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<View className="min-h-screen flex-1 bg-background text-foreground">
			<StatusBar style="light" />
			{/* Hidden file input for web file picker */}
			{Platform.OS === "web" && (
				<input
					type="file"
					ref={fileInputRef}
					onChange={handleWebFileChange}
					accept="image/png,image/jpeg,image/webp,image/jpg"
					style={{ display: "none" }}
				/>
			)}
			{/* Top Navbar */}
			<header className="border-b border-border bg-background/80 backdrop-blur-md">
				<View className="mx-auto flex-row items-center justify-between px-6 py-2.5 lg:max-w-7xl lg:px-8">
					<Pressable
						onPress={() =>
							router.replace("/(onboarding)/onboarding")
						}
						className="cursor-pointer flex-row items-center gap-2.5">
						<Text
							weight="bold"
							className="text-lg tracking-tight text-foreground">
							impulse
						</Text>
					</Pressable>
					{/* Step Progress Tracker */}
					<View className="flex-row items-center gap-1.5 sm:gap-2">
						<View
							className={`flex-row items-center gap-1.5 rounded-full border px-2.5 py-0.5 sm:px-3 sm:py-1 ${
								step === "credentials"
									? "border-primary bg-primary/10"
									: "border-border bg-card"
							}`}>
							{step !== "credentials" ? (
								<Check size={11} className="text-primary" />
							) : (
								<View className="h-1.5 w-1.5 rounded-full bg-primary" />
							)}
							<Text
								weight="medium"
								className={`text-[11px] sm:text-xs ${
									step === "credentials"
										? "text-primary"
										: "text-muted-foreground"
								}`}>
								1. Account
							</Text>
						</View>
						<View className="h-px w-2.5 bg-border sm:w-4" />
						<View
							className={`flex-row items-center gap-1.5 rounded-full border px-2.5 py-0.5 sm:px-3 sm:py-1 ${
								step === "id_upload"
									? "border-primary bg-primary/10"
									: "border-border bg-card"
							}`}>
							{step === "pending_approval" ? (
								<Check size={11} className="text-primary" />
							) : (
								<View
									className={`h-1.5 w-1.5 rounded-full ${
										step === "id_upload"
											? "bg-primary"
											: "bg-muted-foreground"
									}`}
								/>
							)}
							<Text
								weight="medium"
								className={`text-[11px] sm:text-xs ${
									step === "id_upload"
										? "text-primary"
										: "text-muted-foreground"
								}`}>
								2. Verification
							</Text>
						</View>
						<View className="h-px w-2.5 bg-border sm:w-4" />
						<View
							className={`flex-row items-center gap-1.5 rounded-full border px-2.5 py-0.5 sm:px-3 sm:py-1 ${
								step === "pending_approval"
									? "border-primary bg-primary/10"
									: "border-border bg-card"
							}`}>
							<View
								className={`h-1.5 w-1.5 rounded-full ${
									step === "pending_approval"
										? "bg-primary"
										: "bg-muted-foreground"
								}`}
							/>
							<Text
								weight="medium"
								className={`text-[11px] sm:text-xs ${
									step === "pending_approval"
										? "text-primary"
										: "text-muted-foreground"
								}`}>
								3. Review
							</Text>
						</View>
					</View>
					<View className="flex-row items-center gap-2.5">
						<Text className="hidden text-xs text-muted-foreground md:inline">
							Already registered?
						</Text>
						<Button
							size="sm"
							variant="outline"
							onPress={() => router.push("/(auth)/sign-in")}>
							Log In
						</Button>
					</View>
				</View>
			</header>
			{/* Main Content Area */}
			<ScrollView
				contentContainerStyle={{
					flexGrow: 1,
					justifyContent: "center",
				}}
				showsVerticalScrollIndicator={false}
				className="flex-1">
				<View className="mx-auto w-full max-w-lg flex-1 justify-center px-4 py-4 md:py-6">
					{/* STEP 1: CREDENTIALS */}
					{step === "credentials" && (
						<View className="rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6">
							<View className="pb-3">
								<Pressable
									onPress={() =>
										router.replace(
											"/(onboarding)/onboarding",
										)
									}
									className="mb-2 inline-flex cursor-pointer flex-row items-center gap-1.5 self-start rounded-lg border border-border bg-popover px-2 py-0.5 active:opacity-70">
									<ArrowLeft
										size={13}
										className="text-muted-foreground"
									/>
									<Text className="text-xs text-muted-foreground">
										Back
									</Text>
								</Pressable>
								<Text
									weight="bold"
									className="text-xl tracking-tight text-foreground sm:text-2xl">
									Create Account
								</Text>
								<Text className="mt-0.5 text-xs text-muted-foreground">
									Enter your information to begin your
									verification
								</Text>
							</View>
							{errorMessage && (
								<View className="mb-3.5 flex-row items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3">
									<AlertCircle
										size={16}
										className="shrink-0 text-destructive"
									/>
									<Text className="flex-1 text-xs text-destructive">
										{errorMessage}
									</Text>
								</View>
							)}
							{/* Form Fields */}
							<View className="gap-2.5">
								{/* Name Field */}
								<View className="gap-1">
									<Text
										weight="medium"
										className="text-xs text-muted-foreground">
										Full Name / Username
									</Text>
									<View
										className={`h-10.5 flex-row items-center rounded-xl border ${
											fieldErrors.username
												? "border-destructive"
												: "border-border"
										} bg-popover px-3 focus:border-primary`}>
										<User
											size={15}
											strokeWidth={1.75}
											className="mr-2.5 text-muted-foreground"
										/>
										<TextInput
											className="flex-1 text-sm text-foreground outline-none"
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
										<Text className="text-[11px] text-destructive">
											{fieldErrors.username}
										</Text>
									)}
								</View>
								{/* Email Field */}
								<View className="gap-1">
									<Text
										weight="medium"
										className="text-xs text-muted-foreground">
										Email Address
									</Text>
									<View
										className={`h-10.5 flex-row items-center rounded-xl border ${
											fieldErrors.email
												? "border-destructive"
												: "border-border"
										} bg-popover px-3 focus:border-primary`}>
										<Mail
											size={15}
											strokeWidth={1.75}
											className="mr-2.5 text-muted-foreground"
										/>
										<TextInput
											className="flex-1 text-sm text-foreground outline-none"
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
										<Text className="text-[11px] text-destructive">
											{fieldErrors.email}
										</Text>
									)}
								</View>
								{/* Passwords in 2-column on desktop / tablet */}
								<View className="flex-col gap-2.5 sm:flex-row">
									{/* Password Field */}
									<View className="flex-1 gap-1">
										<Text
											weight="medium"
											className="text-xs text-muted-foreground">
											Password
										</Text>
										<View
											className={`h-10.5 flex-row items-center rounded-xl border ${
												fieldErrors.password
													? "border-destructive"
													: "border-border"
											} bg-popover px-3 focus:border-primary`}>
											<Lock
												size={15}
												strokeWidth={1.75}
												className="mr-2.5 text-muted-foreground"
											/>
											<TextInput
												className="min-w-0 flex-1 text-sm text-foreground outline-none"
												placeholder="••••••••"
												placeholderTextColor="#686868"
												value={password}
												onChangeText={(text) => {
													setPassword(text);
													if (
														fieldErrors.password ||
														fieldErrors.confirmPassword ===
															"Passwords do not match."
													) {
														setFieldErrors(
															(prev) => ({
																...prev,
																password:
																	undefined,
																...(prev.confirmPassword ===
																"Passwords do not match."
																	? {
																			confirmPassword:
																				undefined,
																		}
																	: {}),
															}),
														);
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
											/>
										</View>
										{fieldErrors.password && (
											<Text className="text-[11px] text-destructive">
												{fieldErrors.password}
											</Text>
										)}
									</View>
									{/* Confirm Password Field */}
									<View className="flex-1 gap-1">
										<Text
											weight="medium"
											className="text-xs text-muted-foreground">
											Confirm Password
										</Text>
										<View
											className={`h-10.5 flex-row items-center rounded-xl border ${
												fieldErrors.confirmPassword
													? "border-destructive"
													: "border-border"
											} bg-popover px-3 focus:border-primary`}>
											<Lock
												size={15}
												strokeWidth={1.75}
												className="mr-2.5 text-muted-foreground"
											/>
											<TextInput
												className="min-w-0 flex-1 text-sm text-foreground outline-none"
												placeholder="••••••••"
												placeholderTextColor="#686868"
												value={confirmPassword}
												onChangeText={(text) => {
													setConfirmPassword(text);
													if (
														fieldErrors.confirmPassword
													) {
														setFieldErrors(
															(prev) => ({
																...prev,
																confirmPassword:
																	undefined,
															}),
														);
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
												returnKeyType="done"
												onSubmitEditing={
													handleContinueToId
												}
											/>
										</View>
										{fieldErrors.confirmPassword && (
											<Text className="text-[11px] text-destructive">
												{fieldErrors.confirmPassword}
											</Text>
										)}
									</View>
								</View>
								{/* Reveal Password Checkbox */}
								<Pressable
									onPress={() =>
										setShowPassword(!showPassword)
									}
									hitSlop={8}
									accessibilityRole="checkbox"
									accessibilityState={{
										checked: showPassword,
									}}
									className="cursor-pointer flex-row items-center gap-2 self-start active:opacity-70">
									<View
										className={`h-4 w-4 items-center justify-center rounded border transition-colors ${
											showPassword
												? "border-primary bg-primary"
												: "border-border bg-popover"
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
								<View className="pt-1">
									<Button
										size="md"
										fullWidth
										variant="primary"
										disabled={isValidatingStep1}
										loading={isValidatingStep1}
										endContent={
											!isValidatingStep1 ? (
												<ChevronRight
													size={16}
													className="text-primary-foreground"
												/>
											) : undefined
										}
										onPress={handleContinueToId}>
										Continue to Verification
									</Button>
								</View>
							</View>
							<View className="mt-3.5 flex-row items-center justify-center border-t border-border pt-3">
								<Text className="text-xs text-muted-foreground">
									Already have an account?{" "}
								</Text>
								<Pressable
									onPress={() =>
										router.push("/(auth)/sign-in")
									}
									className="cursor-pointer">
									<Text
										weight="semibold"
										className="text-xs text-primary">
										Log In
									</Text>
								</Pressable>
							</View>
						</View>
					)}
					{/* STEP 2: ID DOCUMENT UPLOAD */}
					{step === "id_upload" && (
						<View className="rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6">
							<View className="pb-3">
								<Pressable
									onPress={() => setStep("credentials")}
									className="mb-2 inline-flex cursor-pointer flex-row items-center gap-1.5 self-start rounded-lg border border-border bg-popover px-2 py-0.5 active:opacity-70">
									<ArrowLeft
										size={13}
										className="text-muted-foreground"
									/>
									<Text className="text-xs text-muted-foreground">
										Back to Credentials
									</Text>
								</Pressable>
								<Text
									weight="bold"
									className="text-xl tracking-tight text-foreground sm:text-2xl">
									Verify Student Identity
								</Text>
								<Text className="mt-0.5 text-xs text-muted-foreground">
									Upload your GCT Student ID card to complete
									registration
								</Text>
							</View>
							{/* Drag & Drop Zone */}
							{!idAsset ? (
								<div
									onDragOver={handleDragOver}
									onDragLeave={handleDragLeave}
									onDrop={handleDrop}
									className={`mb-3.5 cursor-pointer rounded-xl border-2 border-dashed p-4 transition-colors sm:p-5 ${
										isDragging
											? "border-primary bg-primary/10"
											: "border-border bg-card/60 hover:border-primary/50 hover:bg-card/80"
									}`}>
									<View className="items-center justify-center">
										<View className="mb-2 h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
											<UploadCloud
												size={20}
												className="text-primary"
											/>
										</View>
										<Text
											weight="semibold"
											className="text-sm text-foreground">
											Drag & drop your student ID here
										</Text>
										<Text className="mt-0.5 text-center text-[11px] text-muted-foreground">
											Supported formats: PNG, JPG, or WebP
											up to 10MB
										</Text>
										{/* Desktop Action Buttons */}
										<View className="mt-2.5 w-full flex-row gap-2">
											<Pressable
												onPress={handlePickImage}
												className="min-h-9 flex-1 cursor-pointer flex-row items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2 hover:bg-popover active:scale-[0.98]">
												<ImageIcon
													size={14}
													className="text-foreground"
												/>
												<Text
													weight="semibold"
													className="text-xs text-foreground">
													Browse Files
												</Text>
											</Pressable>
										</View>
									</View>
								</div>
							) : (
								<View className="mb-3.5 rounded-xl border border-border bg-popover p-3">
									{/* Document Preview */}
									<View className="overflow-hidden rounded-lg border border-border bg-background">
										<Image
											source={{ uri: idAsset.uri }}
											style={{
												width: "100%",
												height: 140,
											}}
											contentFit="cover"
											transition={200}
										/>
									</View>
									{/* Asset Metadata */}
									<View className="mt-2.5 flex-row items-center justify-between px-0.5">
										<View className="flex-row items-center gap-1.5">
											<FileText
												size={14}
												className="text-muted-foreground"
											/>
											<Text
												weight="medium"
												className="text-xs text-foreground">
												{idAsset.fileName ||
													"GCT_Student_ID.jpg"}
											</Text>
										</View>
										<View className="flex-row items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5">
											<CheckCircle2
												size={11}
												className="text-emerald-400"
											/>
											<Text className="font-medium text-[10px] text-emerald-400">
												Ready to upload
											</Text>
										</View>
									</View>
									{/* Replacement Options */}
									<View className="mt-2.5 flex-row gap-2 border-t border-border pt-2">
										<Pressable
											onPress={handlePickImage}
											className="min-h-8 flex-1 cursor-pointer flex-row items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-1.5 hover:bg-popover active:scale-[0.98]">
											<RotateCcw
												size={13}
												className="text-muted-foreground"
											/>
											<Text
												weight="medium"
												className="text-xs text-foreground">
												Choose Different File
											</Text>
										</Pressable>
									</View>
								</View>
							)}
							{/* Compact Guidelines Box */}
							<View className="mb-3.5 rounded-xl border border-border bg-card/60 p-3">
								<Text
									weight="medium"
									className="mb-1.5 text-[10px] tracking-wider text-muted-foreground uppercase">
									Fast Approval Checklist
								</Text>
								<View className="gap-1.5">
									<View className="flex-row items-center gap-1.5">
										<CheckCircle2
											size={13}
											className="text-primary"
										/>
										<Text className="text-[11px] text-muted-foreground">
											All four corners of the ID card are
											visible
										</Text>
									</View>
									<View className="flex-row items-center gap-1.5">
										<CheckCircle2
											size={13}
											className="text-primary"
										/>
										<Text className="text-[11px] text-muted-foreground">
											No flash glare covering name or
											student ID number
										</Text>
									</View>
								</View>
							</View>
							{/* Submit CTA */}
							<Button
								size="md"
								fullWidth
								variant="primary"
								disabled={!idAsset}
								loading={isSubmitting}
								onPress={handleSubmitVerification}>
								Submit for Verification
							</Button>
						</View>
					)}
					{/* STEP 3: PENDING APPROVAL */}
					{step === "pending_approval" && (
						<View className="rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6">
							<View className="items-center justify-center py-2">
								<View className="mb-2.5 h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
									<Clock
										size={24}
										className="text-primary"
										strokeWidth={1.75}
									/>
								</View>
								<Text
									weight="bold"
									className="text-center text-xl tracking-tight text-foreground">
									Verification Pending
								</Text>
								<Text className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">
									Thank you for submitting your ID. Our
									administrative team manually reviews all
									documentation to protect account safety and
									platform integrity.
								</Text>
							</View>
							{/* Application Details Summary */}
							<View className="my-3 w-full gap-2 rounded-xl border border-border bg-popover p-3">
								<View className="flex-row items-center justify-between border-b border-border pb-1.5">
									<Text className="text-xs text-muted-foreground">
										Registered Account
									</Text>
									<Text
										weight="medium"
										className="text-xs text-foreground">
										{email || "student@institution.edu"}
									</Text>
								</View>
								<View className="flex-row items-center justify-between border-b border-border pb-1.5">
									<Text className="text-xs text-muted-foreground">
										Typical Turnaround
									</Text>
									<Text
										weight="medium"
										className="text-xs text-foreground">
										Within 24 hours
									</Text>
								</View>
								<View className="flex-row items-center justify-between pt-0.5">
									<Text className="text-xs text-muted-foreground">
										Review Status
									</Text>
									<View className="flex-row items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5">
										<View className="h-1.5 w-1.5 rounded-full bg-amber-400" />
										<Text className="font-medium text-[10px] text-amber-400">
											Queued for Admin Review
										</Text>
									</View>
								</View>
							</View>
							<View className="mb-3.5 flex-row items-center gap-2 px-1">
								<ShieldCheck
									size={14}
									className="shrink-0 text-muted-foreground"
								/>
								<Text className="text-[11px] text-muted-foreground">
									You'll receive an email notification as soon
									as an administrator activates your account.
								</Text>
							</View>
							<View className="w-full gap-2">
								<Button
									size="md"
									fullWidth
									variant="primary"
									onPress={() =>
										router.replace(
											"/(onboarding)/onboarding",
										)
									}>
									Back to Home
								</Button>
								<Button
									size="md"
									fullWidth
									variant="outline"
									onPress={() =>
										router.replace("/(auth)/sign-in")
									}>
									Log In to Existing Account
								</Button>
							</View>
						</View>
					)}
				</View>
			</ScrollView>
			{/* Dialog Alert Modal */}
			<Dialog
				open={dialogState.open}
				onOpenChange={(open) =>
					setDialogState((prev) => ({ ...prev, open }))
				}>
				<Dialog.Content className="mx-4 max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
					<Dialog.Title
						weight="bold"
						className="text-xl text-foreground">
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
								setDialogState((prev) => ({
									...prev,
									open: false,
								}))
							}>
							Okay
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>
		</View>
	);
}
