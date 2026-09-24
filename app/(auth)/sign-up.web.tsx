import { createIdVerification, uploadIdDocument } from "@auth/api";
import { useGoogleSignIn } from "@auth/hooks/useGoogleSignIn";
import { useSignUp } from "@auth/hooks/useSignUp";
import { idDocumentSchema, signUpCredentialsSchema } from "@auth/schemas";
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
	Eye,
	EyeOff,
	FileText,
	ImageIcon,
	Lock,
	Mail,
	RotateCcw,
	Shield,
	ShieldCheck,
	Sparkles,
	UploadCloud,
	User,
} from "lucide-react-native";
import { Badge, Button, Dialog, Text } from "panelui-native";
import { GoogleIcon } from "panelui-native/icons";
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

		const validation = signUpCredentialsSchema.safeParse({
			username,
			email,
			password,
			confirmPassword,
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

	// Web file input change handler
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
				idValidation.error.issues[0]?.message || "Invalid document asset.",
			);
			return;
		}

		setIsSubmitting(true);
		setErrorMessage(null);

		try {
			// Trigger Supabase sign up
			const signUpData = await signUpMutation.mutateAsync({
				username: username.trim(),
				email: email.trim(),
				password,
			});

			const newUserId = signUpData?.user?.id;
			if (newUserId && idAsset) {
				try {
					const documentPath = await uploadIdDocument(
						newUserId,
						idAsset.uri,
						idAsset.fileName,
					);
					await createIdVerification(newUserId, documentPath);
				} catch {
					// Proceed to pending review state even if initial upload has a transient issue
				}
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
				<View className="mx-auto flex-row items-center justify-between px-6 py-4 lg:max-w-7xl lg:px-10">
					<Pressable
						onPress={() => router.replace("/(onboarding)/onboarding")}
						className="cursor-pointer flex-row items-center gap-2.5">
						<Text
							weight="bold"
							className="text-xl tracking-tight text-foreground">
							impulse
						</Text>
					</Pressable>
					{/* Step Progress Tracker */}
					<View className="flex-row items-center gap-2">
						<View
							className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1 ${
								step === "credentials"
									? "border-primary bg-primary/10"
									: "border-border bg-card"
							}`}>
							{step !== "credentials" ? (
								<Check size={12} className="text-primary" />
							) : (
								<View className="h-1.5 w-1.5 rounded-full bg-primary" />
							)}
							<Text
								weight="medium"
								className={`text-xs ${
									step === "credentials"
										? "text-primary"
										: "text-muted-foreground"
								}`}>
								1. Account
							</Text>
						</View>
						<View className="h-px w-4 bg-border" />
						<View
							className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1 ${
								step === "id_upload"
									? "border-primary bg-primary/10"
									: "border-border bg-card"
							}`}>
							{step === "pending_approval" ? (
								<Check size={12} className="text-primary" />
							) : (
								<View
									className={`h-1.5 w-1.5 rounded-full ${
										step === "id_upload" ? "bg-primary" : "bg-muted-foreground"
									}`}
								/>
							)}
							<Text
								weight="medium"
								className={`text-xs ${
									step === "id_upload"
										? "text-primary"
										: "text-muted-foreground"
								}`}>
								2. Verification
							</Text>
						</View>
						<View className="h-px w-4 bg-border" />
						<View
							className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1 ${
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
								className={`text-xs ${
									step === "pending_approval"
										? "text-primary"
										: "text-muted-foreground"
								}`}>
								3. Review
							</Text>
						</View>
					</View>
					<View className="flex-row items-center gap-3">
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
			{/* Main Split Layout */}
			<ScrollView
				contentContainerStyle={{ flexGrow: 1 }}
				showsVerticalScrollIndicator={false}
				className="flex-1">
				<View className="mx-auto w-full flex-1 flex-col justify-center px-6 py-12 lg:max-w-7xl lg:flex-row lg:items-center lg:gap-16 lg:px-10 lg:py-16">
					{/* Left Column: Context & Guidelines based on current step */}
					<View className="hidden flex-1 flex-col justify-center lg:flex">
						{step === "credentials" && (
							<>
								<View className="mb-4 flex-row items-center gap-2">
									<Badge
										variant="outline"
										className="border-primary/30 bg-primary/10">
										<View className="flex-row items-center gap-1.5">
											<Sparkles size={12} className="text-primary" />
											<Text className="text-xs text-primary">
												Step 1: Student Profile
											</Text>
										</View>
									</Badge>
								</View>
								<Text
									weight="bold"
									className="text-4xl leading-tight tracking-tight text-foreground lg:text-5xl">
									Create your verified campus identity.
								</Text>
								<Text className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
									Set up your account credentials to begin student onboarding.
									Once registered, you'll upload your student ID for instant
									peer verification.
								</Text>
								<View className="mt-8 max-w-lg gap-3">
									<View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card/60 p-4">
										<ShieldCheck size={20} className="shrink-0 text-primary" />
										<View className="flex-1">
											<Text
												weight="semibold"
												className="text-sm text-foreground">
												Official GCT Student ID Required
											</Text>
											<Text className="text-xs text-muted-foreground">
												Verification ensures all interactions are with enrolled
												classmates.
											</Text>
										</View>
									</View>
									<View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card/60 p-4">
										<Lock
											size={20}
											className="shrink-0 text-muted-foreground"
										/>
										<View className="flex-1">
											<Text
												weight="semibold"
												className="text-sm text-foreground">
												Privacy Guaranteed
											</Text>
											<Text className="text-xs text-muted-foreground">
												Your document is encrypted and never displayed publicly
												on your profile.
											</Text>
										</View>
									</View>
								</View>
							</>
						)}
						{step === "id_upload" && (
							<>
								<View className="mb-4 flex-row items-center gap-2">
									<Badge
										variant="outline"
										className="border-primary/30 bg-primary/10">
										<View className="flex-row items-center gap-1.5">
											<Shield size={12} className="text-primary" />
											<Text className="text-xs text-primary">
												Step 2: ID Verification
											</Text>
										</View>
									</Badge>
								</View>
								<Text
									weight="bold"
									className="text-4xl leading-tight tracking-tight text-foreground lg:text-5xl">
									Guidelines for fast verification.
								</Text>
								<Text className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
									Our student administrative team verifies each ID card manually
									to preserve the integrity of the campus network.
								</Text>
								{/* Checklist */}
								<View className="mt-8 max-w-lg gap-3">
									<View className="flex-row items-start gap-3 rounded-2xl border border-border bg-card/60 p-4">
										<CheckCircle2 size={18} className="mt-0.5 text-primary" />
										<View className="flex-1">
											<Text
												weight="semibold"
												className="text-sm text-foreground">
												All 4 Corners Visible
											</Text>
											<Text className="text-xs text-muted-foreground">
												Place your card on a flat surface and ensure the full
												card outline is in frame.
											</Text>
										</View>
									</View>
									<View className="flex-row items-start gap-3 rounded-2xl border border-border bg-card/60 p-4">
										<CheckCircle2 size={18} className="mt-0.5 text-primary" />
										<View className="flex-1">
											<Text
												weight="semibold"
												className="text-sm text-foreground">
												Readable Student Number & Name
											</Text>
											<Text className="text-xs text-muted-foreground">
												Ensure good lighting and avoid reflections or blur over
												your name and ID number.
											</Text>
										</View>
									</View>
									<View className="flex-row items-start gap-3 rounded-2xl border border-border bg-card/60 p-4">
										<CheckCircle2 size={18} className="mt-0.5 text-primary" />
										<View className="flex-1">
											<Text
												weight="semibold"
												className="text-sm text-foreground">
												Valid GCT ID Card
											</Text>
											<Text className="text-xs text-muted-foreground">
												Must be a current, official student ID from the
												institution.
											</Text>
										</View>
									</View>
								</View>
							</>
						)}
						{step === "pending_approval" && (
							<>
								<View className="mb-4 flex-row items-center gap-2">
									<Badge
										variant="outline"
										className="border-amber-500/30 bg-amber-500/10">
										<View className="flex-row items-center gap-1.5">
											<Clock size={12} className="text-amber-400" />
											<Text className="text-xs text-amber-400">
												Under Review
											</Text>
										</View>
									</Badge>
								</View>
								<Text
									weight="bold"
									className="text-4xl leading-tight tracking-tight text-foreground lg:text-5xl">
									What happens next?
								</Text>
								<Text className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
									Your student document has been securely submitted to the
									administrative queue.
								</Text>
								<View className="mt-8 max-w-lg gap-4">
									<View className="flex-row items-center gap-4 rounded-2xl border border-border bg-card/60 p-4">
										<View className="h-8 w-8 items-center justify-center rounded-xl bg-primary/20">
											<Text weight="bold" className="text-xs text-primary">
												1
											</Text>
										</View>
										<View className="flex-1">
											<Text
												weight="semibold"
												className="text-sm text-foreground">
												Document Checked
											</Text>
											<Text className="text-xs text-muted-foreground">
												Admins check enrollment status against the institution
												registrar.
											</Text>
										</View>
									</View>
									<View className="flex-row items-center gap-4 rounded-2xl border border-border bg-card/60 p-4">
										<View className="h-8 w-8 items-center justify-center rounded-xl bg-primary/20">
											<Text weight="bold" className="text-xs text-primary">
												2
											</Text>
										</View>
										<View className="flex-1">
											<Text
												weight="semibold"
												className="text-sm text-foreground">
												Email Notification
											</Text>
											<Text className="text-xs text-muted-foreground">
												You will receive an activation confirmation as soon as
												approved.
											</Text>
										</View>
									</View>
									<View className="flex-row items-center gap-4 rounded-2xl border border-border bg-card/60 p-4">
										<View className="h-8 w-8 items-center justify-center rounded-xl bg-primary/20">
											<Text weight="bold" className="text-xs text-primary">
												3
											</Text>
										</View>
										<View className="flex-1">
											<Text
												weight="semibold"
												className="text-sm text-foreground">
												Immediate Access
											</Text>
											<Text className="text-xs text-muted-foreground">
												Unlock all feeds, discussions, and student channels
												right away.
											</Text>
										</View>
									</View>
								</View>
							</>
						)}
					</View>
					{/* Right Column: Multi-Step Interactive Form Card */}
					<View className="w-full lg:max-w-lg">
						{/* STEP 1: CREDENTIALS */}
						{step === "credentials" && (
							<View className="rounded-3xl border border-border bg-card p-8 shadow-2xl">
								<View className="pb-5">
									<Pressable
										onPress={() => router.replace("/(onboarding)/onboarding")}
										className="mb-4 inline-flex cursor-pointer flex-row items-center gap-1.5 self-start rounded-lg border border-border bg-popover px-2.5 py-1 active:opacity-70">
										<ArrowLeft size={14} className="text-muted-foreground" />
										<Text className="text-xs text-muted-foreground">Back</Text>
									</Pressable>
									<Text
										weight="bold"
										className="text-2xl tracking-tight text-foreground">
										Create Account
									</Text>
									<Text className="mt-1 text-sm text-muted-foreground">
										Enter your information to begin your verification
									</Text>
								</View>
								{errorMessage && (
									<View className="mb-5 flex-row items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5">
										<AlertCircle
											size={18}
											className="shrink-0 text-destructive"
										/>
										<Text className="flex-1 text-xs text-destructive">
											{errorMessage}
										</Text>
									</View>
								)}
								{/* Google SSO */}
								<Button
									size="xl"
									fullWidth
									variant="social"
									disabled={true}
									loading={googleSignInMutation.isPending}
									startContent={<GoogleIcon size={20} />}
									onPress={handleGoogleSignIn}>
									Sign up with Google
								</Button>
								<View className="my-5 flex-row items-center gap-3">
									<View className="h-px flex-1 bg-border" />
									<Text
										weight="medium"
										className="text-xs text-muted-foreground uppercase">
										or register with email
									</Text>
									<View className="h-px flex-1 bg-border" />
								</View>
								{/* Form Fields */}
								<View className="gap-3.5">
									{/* Name Field */}
									<View className="gap-1.5">
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
											} bg-popover px-3.5 py-3 focus:border-primary`}>
											<User
												size={16}
												strokeWidth={1.75}
												className="mr-3 text-muted-foreground"
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
											<Text className="text-xs text-destructive">
												{fieldErrors.username}
											</Text>
										)}
									</View>
									{/* Email Field */}
									<View className="gap-1.5">
										<Text
											weight="medium"
											className="text-xs text-muted-foreground">
											Email Address
										</Text>
										<View
											className={`flex-row items-center rounded-xl border ${
												fieldErrors.email
													? "border-destructive"
													: "border-border"
											} bg-popover px-3.5 py-3 focus:border-primary`}>
											<Mail
												size={16}
												strokeWidth={1.75}
												className="mr-3 text-muted-foreground"
											/>
											<TextInput
												className="flex-1 text-sm text-foreground outline-none"
												placeholder="name@example.com"
												placeholderTextColor="#686868"
												value={email}
												onChangeText={(text) => {
													setEmail(text);
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
									{/* Password Field */}
									<View className="gap-1.5">
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
											} bg-popover px-3.5 py-3 focus:border-primary`}>
											<Lock
												size={16}
												strokeWidth={1.75}
												className="mr-3 text-muted-foreground"
											/>
											<TextInput
												className="flex-1 text-sm text-foreground outline-none"
												placeholder="At least 6 characters"
												placeholderTextColor="#686868"
												value={password}
												onChangeText={(text) => {
													setPassword(text);
													if (fieldErrors.password) {
														setFieldErrors((prev) => ({
															...prev,
															password: undefined,
														}));
													}
												}}
												secureTextEntry={!showPassword}
												autoCapitalize="none"
												autoCorrect={false}
												returnKeyType="next"
											/>
											<Pressable
												onPress={() => setShowPassword(!showPassword)}
												hitSlop={12}
												className="ml-2 h-7 w-7 cursor-pointer items-center justify-center active:opacity-70">
												{showPassword ? (
													<EyeOff size={16} className="text-muted-foreground" />
												) : (
													<Eye size={16} className="text-muted-foreground" />
												)}
											</Pressable>
										</View>
										{fieldErrors.password && (
											<Text className="text-xs text-destructive">
												{fieldErrors.password}
											</Text>
										)}
									</View>
									{/* Confirm Password Field */}
									<View className="gap-1.5">
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
											} bg-popover px-3.5 py-3 focus:border-primary`}>
											<Lock
												size={16}
												strokeWidth={1.75}
												className="mr-3 text-muted-foreground"
											/>
											<TextInput
												className="flex-1 text-sm text-foreground outline-none"
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
									<View className="pt-2">
										<Button
											size="xl"
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
								<View className="mt-6 flex-row items-center justify-center border-t border-border pt-4">
									<Text className="text-xs text-muted-foreground">
										Already have an account?{" "}
									</Text>
									<Pressable
										onPress={() => router.push("/(auth)/sign-in")}
										className="cursor-pointer">
										<Text weight="semibold" className="text-xs text-primary">
											Log In
										</Text>
									</Pressable>
								</View>
							</View>
						)}
						{/* STEP 2: ID DOCUMENT UPLOAD */}
						{step === "id_upload" && (
							<View className="rounded-3xl border border-border bg-card p-8 shadow-2xl">
								<View className="pb-5">
									<Pressable
										onPress={() => setStep("credentials")}
										className="mb-4 inline-flex cursor-pointer flex-row items-center gap-1.5 self-start rounded-lg border border-border bg-popover px-2.5 py-1 active:opacity-70">
										<ArrowLeft size={14} className="text-muted-foreground" />
										<Text className="text-xs text-muted-foreground">
											Back to Credentials
										</Text>
									</Pressable>
									<Text
										weight="bold"
										className="text-2xl tracking-tight text-foreground">
										Verify Student Identity
									</Text>
									<Text className="mt-1 text-sm text-muted-foreground">
										Upload your GCT Student ID card to complete registration
									</Text>
								</View>
								{/* Drag & Drop Zone */}
								{!idAsset ? (
									<div
										onDragOver={handleDragOver}
										onDragLeave={handleDragLeave}
										onDrop={handleDrop}
										className={`mb-5 cursor-pointer rounded-2xl border-2 border-dashed p-8 transition-colors ${
											isDragging
												? "border-primary bg-primary/10"
												: "border-border bg-card/60 hover:border-primary/50 hover:bg-card/80"
										}`}>
										<View className="items-center justify-center">
											<View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
												<UploadCloud size={32} className="text-primary" />
											</View>
											<Text
												weight="semibold"
												className="text-base text-foreground">
												Drag & drop your student ID here
											</Text>
											<Text className="mt-1.5 text-center text-xs text-muted-foreground">
												Supported formats: PNG, JPG, or WebP up to 10MB
											</Text>
											{/* Desktop Action Buttons */}
											<View className="mt-6 w-full flex-row gap-3">
												<Pressable
													onPress={handlePickImage}
													className="min-h-11 flex-1 cursor-pointer flex-row items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 hover:bg-popover active:scale-[0.98]">
													<ImageIcon size={16} className="text-foreground" />
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
									<View className="mb-5 rounded-2xl border border-border bg-popover p-4">
										{/* Document Preview */}
										<View className="overflow-hidden rounded-xl border border-border bg-background">
											<Image
												source={{ uri: idAsset.uri }}
												style={{ width: "100%", height: 220 }}
												contentFit="cover"
												transition={200}
											/>
										</View>
										{/* Asset Metadata */}
										<View className="mt-3.5 flex-row items-center justify-between px-1">
											<View className="flex-row items-center gap-2">
												<FileText size={16} className="text-muted-foreground" />
												<Text
													weight="medium"
													className="text-xs text-foreground">
													{idAsset.fileName || "GCT_Student_ID.jpg"}
												</Text>
											</View>
											<View className="flex-row items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5">
												<CheckCircle2 size={12} className="text-emerald-400" />
												<Text className="font-medium text-[11px] text-emerald-400">
													Ready to upload
												</Text>
											</View>
										</View>
										{/* Replacement Options */}
										<View className="mt-3.5 flex-row gap-2.5 border-t border-border pt-3">
											<Pressable
												onPress={handlePickImage}
												className="min-h-10 flex-1 cursor-pointer flex-row items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2 hover:bg-popover active:scale-[0.98]">
												<RotateCcw
													size={14}
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
								<View className="mb-6 rounded-2xl border border-border bg-card/60 p-4">
									<Text
										weight="medium"
										className="mb-2 text-xs tracking-wider text-muted-foreground uppercase">
										Fast Approval Checklist
									</Text>
									<View className="gap-2">
										<View className="flex-row items-center gap-2">
											<CheckCircle2 size={14} className="text-primary" />
											<Text className="text-xs text-muted-foreground">
												All four corners of the ID card are visible
											</Text>
										</View>
										<View className="flex-row items-center gap-2">
											<CheckCircle2 size={14} className="text-primary" />
											<Text className="text-xs text-muted-foreground">
												No flash glare covering name or student ID number
											</Text>
										</View>
									</View>
								</View>
								{/* Submit CTA */}
								<Button
									size="xl"
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
							<View className="rounded-3xl border border-border bg-card p-8 shadow-2xl">
								<View className="items-center justify-center py-4">
									<View className="mb-4 h-20 w-20 items-center justify-center rounded-3xl border border-primary/30 bg-primary/10">
										<Clock
											size={40}
											className="text-primary"
											strokeWidth={1.75}
										/>
									</View>
									<Text
										weight="bold"
										className="text-center text-2xl tracking-tight text-foreground">
										Verification Pending
									</Text>
									<Badge
										variant="outline"
										className="mt-2 border-amber-500/30 bg-amber-500/10">
										<Text className="font-medium text-xs text-amber-400">
											Application Under Review
										</Text>
									</Badge>
									<Text className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
										Thank you for submitting your ID. Our administrative team
										manually reviews all documentation to protect account safety
										and platform integrity.
									</Text>
								</View>
								{/* Application Details Summary */}
								<View className="my-5 w-full gap-3 rounded-2xl border border-border bg-popover p-4">
									<View className="flex-row items-center justify-between border-b border-border pb-2.5">
										<Text className="text-xs text-muted-foreground">
											Registered Account
										</Text>
										<Text weight="medium" className="text-xs text-foreground">
											{email || "student@institution.edu"}
										</Text>
									</View>
									<View className="flex-row items-center justify-between border-b border-border pb-2.5">
										<Text className="text-xs text-muted-foreground">
											Typical Turnaround
										</Text>
										<Text weight="medium" className="text-xs text-foreground">
											Within 24 hours
										</Text>
									</View>
									<View className="flex-row items-center justify-between pt-0.5">
										<Text className="text-xs text-muted-foreground">
											Review Status
										</Text>
										<View className="flex-row items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5">
											<View className="h-1.5 w-1.5 rounded-full bg-amber-400" />
											<Text className="font-medium text-[11px] text-amber-400">
												Queued for Admin Review
											</Text>
										</View>
									</View>
								</View>
								<View className="mb-6 flex-row items-center gap-2.5 px-2">
									<ShieldCheck
										size={16}
										className="shrink-0 text-muted-foreground"
									/>
									<Text className="text-xs text-muted-foreground">
										You'll receive an email notification as soon as an
										administrator activates your account.
									</Text>
								</View>
								<View className="w-full gap-3">
									<Button
										size="xl"
										fullWidth
										variant="primary"
										onPress={() => router.replace("/(onboarding)/onboarding")}>
										Back to Home
									</Button>
									<Button
										size="xl"
										fullWidth
										variant="outline"
										onPress={() => router.replace("/(auth)/sign-in")}>
										Log In to Existing Account
									</Button>
								</View>
							</View>
						)}
					</View>
				</View>
			</ScrollView>
			{/* Dialog Alert Modal */}
			<Dialog
				open={dialogState.open}
				onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}>
				<Dialog.Content className="mx-4 max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
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
