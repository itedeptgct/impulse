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

export default function SignInScreen() {
	const insets = useSafeAreaInsets();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<{
		email?: string;
		password?: string;
	}>({});

	// forgot password state
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
					<View className="flex-row items-center justify-between pb-8">
						<Pressable
							onPress={() => router.back()}
							hitSlop={8}
							className="h-10 w-10 items-center justify-center rounded-xl border border-border bg-card active:scale-[0.96] active:bg-popover">
							<ArrowLeft
								size={18}
								className="-translate-x-0.5 text-foreground"
							/>
						</Pressable>
						<Text
							weight="semibold"
							className="text-sm tracking-widest text-muted-foreground uppercase">
							impulse
						</Text>
						<View className="w-10" />
					</View>
					<View className="pb-8">
						<Text
							weight="bold"
							className="text-3xl tracking-tight text-foreground">
							Welcome back
						</Text>
						<Text className="mt-2 text-sm text-muted-foreground">
							Enter your credentials to access your account
						</Text>
					</View>
					{errorMessage && (
						<View className="mb-6 flex-row items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
							<AlertCircle size={18} className="shrink-0 text-destructive" />
							<Text className="flex-1 text-sm text-destructive">
								{errorMessage}
							</Text>
						</View>
					)}
					{/* Google SSO Button */}
					<Button
						size="xl"
						fullWidth
						variant="social"
						loading={googleSignInMutation.isPending}
						startContent={<GoogleIcon size={20} />}
						onPress={handleGoogleSignIn}>
						Continue with Google
					</Button>
					<View className="my-6 flex-row items-center gap-3">
						<View className="h-px flex-1 bg-border" />
						<Text
							weight="medium"
							className="text-xs text-muted-foreground uppercase">
							or continue with email
						</Text>
						<View className="h-px flex-1 bg-border" />
					</View>
					<View className="gap-5">
						{/* Email Input */}
						<View className="gap-2">
							<Text weight="medium" className="text-xs text-muted-foreground">
								Email Address
							</Text>
							<View
								className={`flex-row items-center rounded-xl border ${
									fieldErrors.email ? "border-destructive" : "border-border"
								} bg-card px-4 py-3.5 focus:border-primary`}>
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
										if (fieldErrors.email) {
											setFieldErrors((prev) => ({ ...prev, email: undefined }));
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
						<View className="gap-2">
							<View className="flex-row items-center justify-between">
								<Text weight="medium" className="text-xs text-muted-foreground">
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
									className="active:opacity-70">
									<Text weight="medium" className="text-xs text-primary">
										Forgot password?
									</Text>
								</Pressable>
							</View>
							<View
								className={`flex-row items-center rounded-xl border ${
									fieldErrors.password ? "border-destructive" : "border-border"
								} bg-card px-4 py-3.5 focus:border-primary`}>
								<Lock
									size={18}
									strokeWidth={1.75}
									className="mr-3 text-muted-foreground"
								/>
								<TextInput
									className="flex-1 text-base text-foreground"
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
									hitSlop={14}
									className="ml-2 h-7 w-7 items-center justify-center active:opacity-70">
									{showPassword ? (
										<EyeOff
											size={18}
											strokeWidth={1.75}
											className="text-muted-foreground"
										/>
									) : (
										<Eye
											size={18}
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

						<View className="pt-3">
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
					<View className="mt-auto flex-row items-center justify-center pt-8">
						<Text className="text-sm text-muted-foreground">
							Don't have an account?{" "}
						</Text>
						<Pressable
							onPress={() => router.push("/(auth)/sign-up")}
							hitSlop={8}
							className="active:opacity-70">
							<Text weight="semibold" className="text-sm text-foreground">
								Sign Up
							</Text>
						</Pressable>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
			{/* Forgot Password Dialog */}
			<Dialog
				open={isForgotPasswordOpen}
				onOpenChange={setIsForgotPasswordOpen}>
				<Dialog.Content className="mx-4 max-w-sm rounded-2xl border border-border bg-card p-6">
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
						<View className="flex-row items-center rounded-xl border border-border bg-popover px-4 py-3">
							<Mail size={16} className="mr-3 text-muted-foreground" />
							<TextInput
								className="flex-1 text-sm text-foreground"
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
