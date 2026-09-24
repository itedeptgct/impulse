import { useGoogleSignIn } from "@auth/hooks/useGoogleSignIn";
import { useResetPassword } from "@auth/hooks/useResetPassword";
import { useSignIn } from "@auth/hooks/useSignIn";
import { forgotPasswordSchema, signInSchema } from "@auth/schemas";
import { useAuthStore } from "@auth/store";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
	AlertCircle,
	ArrowLeft,
	CheckCircle2,
	Eye,
	EyeOff,
	Lock,
	Mail,
	Sparkles,
} from "lucide-react-native";
import { Badge, Button, Dialog, Text } from "panelui-native";
import { GoogleIcon } from "panelui-native/icons";
import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";

export default function SignInWebScreen() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<{
		email?: string;
		password?: string;
	}>({});

	// Forgot password state
	const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
	const [forgotEmail, setForgotEmail] = useState("");
	const [forgotStatus, setForgotStatus] = useState<
		"idle" | "success" | "error"
	>("idle");
	const [forgotMessage, setForgotMessage] = useState<string | null>(null);

	const signInMutation = useSignIn();
	const googleSignInMutation = useGoogleSignIn();
	const resetPasswordMutation = useResetPassword();
	const setSession = useAuthStore((state) => state.setSession);

	const handleSignIn = async () => {
		setErrorMessage(null);
		setFieldErrors({});

		const validation = signInSchema.safeParse({
			email,
			password,
		});

		if (!validation.success) {
			const formatted = validation.error.flatten().fieldErrors;
			setFieldErrors({
				email: formatted.email?.[0],
				password: formatted.password?.[0],
			});
			setErrorMessage(
				validation.error.issues[0]?.message || "Please check your inputs.",
			);
			return;
		}

		try {
			const data = await signInMutation.mutateAsync({
				email: validation.data.email,
				password: validation.data.password,
			});
			if (data?.session) {
				setSession(data.session);
				router.replace("/(tabs)");
			}
		} catch (err: unknown) {
			const error = err as Error;
			setErrorMessage(
				error?.message || "Invalid email or password. Please try again.",
			);
		}
	};

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

	const handleResetPassword = async () => {
		setForgotStatus("idle");
		setForgotMessage(null);

		const validation = forgotPasswordSchema.safeParse({ email: forgotEmail });
		if (!validation.success) {
			setForgotStatus("error");
			setForgotMessage(
				validation.error.issues[0]?.message || "Invalid email address.",
			);
			return;
		}

		try {
			await resetPasswordMutation.mutateAsync(validation.data.email);
			setForgotStatus("success");
			setForgotMessage("Password reset email sent. Please check your inbox.");
		} catch (err: unknown) {
			const error = err as Error;
			setForgotStatus("error");
			setForgotMessage(
				error?.message || "Failed to send password reset email.",
			);
		}
	};

	return (
		<View className="min-h-screen flex-1 bg-background text-foreground">
			<StatusBar style="light" />
			{/* Top Bar for Desktop */}
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
					<View className="flex-row items-center gap-3">
						<Text className="text-xs text-muted-foreground">
							New to impulse?
						</Text>
						<Button
							size="sm"
							variant="outline"
							onPress={() => router.push("/(auth)/sign-up")}>
							Create Account
						</Button>
					</View>
				</View>
			</header>
			{/* Main Split Screen */}
			<ScrollView
				contentContainerStyle={{ flexGrow: 1 }}
				showsVerticalScrollIndicator={false}
				className="flex-1">
				<View className="mx-auto w-full flex-1 flex-col justify-center px-6 py-12 lg:max-w-7xl lg:flex-row lg:items-center lg:gap-16 lg:px-10 lg:py-16">
					{/* Left Column: Showcase & Platform Context */}
					<View className="hidden flex-1 flex-col justify-center lg:flex">
						<View className="mb-4 flex-row items-center gap-2">
							<Badge
								variant="outline"
								className="border-primary/30 bg-primary/10">
								<View className="flex-row items-center gap-1.5">
									<Sparkles size={12} className="text-primary" />
									<Text className="text-xs text-primary">Student Portal</Text>
								</View>
							</Badge>
						</View>
						<Text
							weight="bold"
							className="text-4xl leading-tight tracking-tight text-foreground lg:text-5xl">
							Sit cillum elit et commodo velit aute nulla.
						</Text>
						<Text className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
							Ex excepteur Lorem cillum exercitation aliquip incididunt minim.
						</Text>
					</View>

					{/* Right Column: Sign In Form Card */}
					<View className="w-full lg:max-w-md">
						<View className="rounded-3xl border border-border bg-card p-8 shadow-2xl">
							<View className="pb-6">
								<Pressable
									onPress={() => router.replace("/(onboarding)/onboarding")}
									className="mb-4 inline-flex cursor-pointer flex-row items-center gap-1.5 self-start rounded-lg border border-border bg-popover px-2.5 py-1 active:opacity-70">
									<ArrowLeft size={14} className="text-muted-foreground" />
									<Text className="text-xs text-muted-foreground">Back</Text>
								</Pressable>
								<Text
									weight="bold"
									className="text-2xl tracking-tight text-foreground">
									Log In
								</Text>
								<Text className="mt-1 text-sm text-muted-foreground">
									Enter your email and password to access your account
								</Text>
							</View>
							{errorMessage && (
								<View className="mb-6 flex-row items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5">
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
								Continue with Google
							</Button>
							<View className="my-5 flex-row items-center gap-3">
								<View className="h-px flex-1 bg-border" />
								<Text
									weight="medium"
									className="text-xs text-muted-foreground uppercase">
									or sign in with email
								</Text>
								<View className="h-px flex-1 bg-border" />
							</View>

							{/* Form Fields */}
							<View className="gap-4">
								{/* Email Input */}
								<View className="gap-1.5">
									<Text
										weight="medium"
										className="text-xs text-muted-foreground">
										Email Address
									</Text>
									<View
										className={`flex-row items-center rounded-xl border ${
											fieldErrors.email ? "border-destructive" : "border-border"
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
								{/* Password Input */}
								<View className="gap-1.5">
									<View className="flex-row items-center justify-between">
										<Text
											weight="medium"
											className="text-xs text-muted-foreground">
											Password
										</Text>
										<Pressable
											onPress={() => {
												setForgotEmail(email);
												setForgotStatus("idle");
												setForgotMessage(null);
												setIsForgotPasswordOpen(true);
											}}
											hitSlop={8}
											className="cursor-pointer active:opacity-70">
											<Text weight="medium" className="text-xs text-primary">
												Forgot password?
											</Text>
										</Pressable>
									</View>
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
											placeholder="Enter your password"
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
											returnKeyType="done"
											onSubmitEditing={handleSignIn}
										/>
										<Pressable
											onPress={() => setShowPassword(!showPassword)}
											hitSlop={12}
											className="ml-2 h-7 w-7 cursor-pointer items-center justify-center active:opacity-70">
											{showPassword ? (
												<EyeOff
													size={16}
													strokeWidth={1.75}
													className="text-muted-foreground"
												/>
											) : (
												<Eye
													size={16}
													strokeWidth={1.75}
													className="text-muted-foreground"
												/>
											)}
										</Pressable>
									</View>
									{fieldErrors.password && (
										<Text className="text-xs text-destructive">
											{fieldErrors.password}
										</Text>
									)}
								</View>
								{/* Submit Button */}
								<View className="pt-2">
									<Button
										size="xl"
										fullWidth
										variant="primary"
										loading={signInMutation.isPending}
										onPress={handleSignIn}>
										Log In
									</Button>
								</View>
							</View>
							{/* Bottom Link */}
							<View className="mt-6 flex-row items-center justify-center border-t border-border pt-4">
								<Text className="text-xs text-muted-foreground">
									Don't have an account?{" "}
								</Text>
								<Pressable
									onPress={() => router.push("/(auth)/sign-up")}
									className="cursor-pointer">
									<Text weight="semibold" className="text-xs text-primary">
										Sign Up
									</Text>
								</Pressable>
							</View>
						</View>
					</View>
				</View>
			</ScrollView>
			{/* Forgot Password Dialog */}
			<Dialog
				open={isForgotPasswordOpen}
				onOpenChange={setIsForgotPasswordOpen}>
				<Dialog.Content className="mx-4 max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
					<Dialog.Title weight="bold" className="text-xl text-foreground">
						Reset Password
					</Dialog.Title>
					<Dialog.Description className="mt-2 text-sm text-muted-foreground">
						Enter your email address and we'll send a password recovery link.
					</Dialog.Description>
					{forgotMessage && (
						<View
							className={`mt-4 flex-row items-center gap-3 rounded-xl border ${
								forgotStatus === "success"
									? "border-emerald-500/30 bg-emerald-500/10"
									: "border-destructive/30 bg-destructive/10"
							} p-3.5`}>
							{forgotStatus === "success" ? (
								<CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
							) : (
								<AlertCircle size={18} className="shrink-0 text-destructive" />
							)}
							<Text
								className={`flex-1 text-xs ${
									forgotStatus === "success"
										? "text-emerald-300"
										: "text-destructive"
								}`}>
								{forgotMessage}
							</Text>
						</View>
					)}
					<View className="mt-4 gap-2">
						<Text weight="medium" className="text-xs text-muted-foreground">
							Email Address
						</Text>
						<View className="flex-row items-center rounded-xl border border-border bg-popover px-3.5 py-3">
							<Mail size={16} className="mr-3 text-muted-foreground" />
							<TextInput
								className="flex-1 text-sm text-foreground outline-none"
								placeholder="name@example.com"
								placeholderTextColor="#686868"
								value={forgotEmail}
								onChangeText={setForgotEmail}
								autoCapitalize="none"
								autoCorrect={false}
								keyboardType="email-address"
							/>
						</View>
					</View>
					<Dialog.Footer className="mt-6 flex-row gap-2.5">
						<Button
							size="md"
							variant="outline"
							className="flex-1"
							onPress={() => setIsForgotPasswordOpen(false)}>
							Cancel
						</Button>
						<Button
							size="md"
							variant="primary"
							className="flex-1"
							loading={resetPasswordMutation.isPending}
							onPress={handleResetPassword}>
							Send Link
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>
		</View>
	);
}
