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
	ChevronRight,
	Eye,
	EyeOff,
	Lock,
	Mail,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MobileSheet, NeoButton, NeoInput } from "@/components/ui";

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

	const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
	const [forgotEmail, setForgotEmail] = useState("");
	const [forgotStatus, setForgotStatus] = useState<
		"idle" | "success" | "error"
	>("idle");
	const [forgotMessage, setForgotMessage] = useState<string | null>(null);

	const signInMutation = useSignIn();
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
				validation.error.issues[0]?.message ||
					"Please check your inputs.",
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
				error?.message ||
					"Invalid email or password. Please try again.",
			);
		}
	};

	const handleResetPassword = async () => {
		setForgotStatus("idle");
		setForgotMessage(null);

		const validation = forgotPasswordSchema.safeParse({
			email: forgotEmail,
		});
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
			setForgotMessage(
				"Password reset email sent. Please check your inbox.",
			);
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
					<View className="flex-row items-center justify-between pb-8">
						<Pressable
							onPress={() => router.back()}
							hitSlop={8}
							className="size-10 items-center justify-center rounded-none border-2 border-border bg-card shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
							<ArrowLeft
								size={18}
								color="#000000"
								strokeWidth={2.5}
								className="-translate-x-0.5"
							/>
						</Pressable>
					</View>

					<View className="pb-8">
						<Text className="font-display text-3xl tracking-tight text-foreground uppercase">
							SIGN IN
						</Text>
						<Text className="mt-1.5 font-mono text-xs text-muted-foreground uppercase">
							ENTER ACCESS CREDENTIALS
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

					<View className="gap-5">
						<NeoInput
							label="EMAIL"
							placeholder="student@example.com"
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
							error={fieldErrors.email}
							startContent={
								<Mail
									size={16}
									color="#000000"
									strokeWidth={2.2}
								/>
							}
						/>

						<View className="gap-1">
							<View className="flex-row items-center justify-between pb-1">
								<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
									PASSWORD
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
									<Text className="font-mono text-xs text-primary">
										FORGOT PASSWORD?
									</Text>
								</Pressable>
							</View>
							<NeoInput
								placeholder="Enter your password"
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
										className="size-7 items-center justify-center active:opacity-70">
										{showPassword ? (
											<EyeOff
												size={16}
												strokeWidth={2}
												color="#9aa1b2"
											/>
										) : (
											<Eye
												size={16}
												strokeWidth={2}
												color="#9aa1b2"
											/>
										)}
									</Pressable>
								}
							/>
						</View>

						<View className="pt-3">
							<NeoButton
								variant="primary"
								size="lg"
								className="w-full"
								loading={signInMutation.isPending}
								onPress={handleSignIn}
								endContent={
									<ChevronRight
										size={18}
										color="#faf9f5"
										strokeWidth={2.5}
									/>
								}>
								SIGN IN
							</NeoButton>
						</View>
					</View>

					<View className="mt-auto flex-row items-center justify-center pt-8">
						<Text className="font-mono text-xs text-muted-foreground uppercase">
							NEW STUDENT?{" "}
						</Text>
						<Pressable
							onPress={() => router.push("/(auth)/sign-up")}
							hitSlop={8}
							className="active:opacity-70">
							<Text className="font-mono text-xs text-primary">
								REGISTER ACCOUNT →
							</Text>
						</Pressable>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>

			<MobileSheet
				open={isForgotPasswordOpen}
				onOpenChange={setIsForgotPasswordOpen}
				title="RESET PASSWORD"
				subtitle="Enter your academic email address to receive recovery instructions.">
				<View className="py-2">
					{forgotMessage && (
						<View
							className={`mb-4 flex-row items-center gap-3 rounded-none border-2 ${
								forgotStatus === "success"
									? "border-border bg-muted"
									: "border-destructive bg-destructive/10"
							} p-3.5 shadow-neo-sm`}>
							{forgotStatus === "success" ? (
								<CheckCircle2
									size={18}
									color="#000000"
									className="shrink-0"
								/>
							) : (
								<AlertCircle
									size={18}
									color="#ff2a00"
									className="shrink-0"
								/>
							)}
							<Text
								className={`flex-1 font-mono text-xs ${
									forgotStatus === "success"
										? "font-bold text-foreground"
										: "text-destructive"
								}`}>
								{forgotMessage}
							</Text>
						</View>
					)}
					<NeoInput
						label="EMAIL ADDRESS"
						placeholder="name@example.com"
						value={forgotEmail}
						onChangeText={setForgotEmail}
						autoCapitalize="none"
						autoCorrect={false}
						keyboardType="email-address"
						startContent={
							<Mail size={16} color="#000000" strokeWidth={2.2} />
						}
					/>
					<View className="mt-6 flex-row gap-2.5">
						<NeoButton
							variant="outline"
							size="md"
							className="flex-1"
							onPress={() => setIsForgotPasswordOpen(false)}>
							CANCEL
						</NeoButton>
						<NeoButton
							variant="primary"
							size="md"
							className="flex-1"
							loading={resetPasswordMutation.isPending}
							onPress={handleResetPassword}>
							SEND LINK
						</NeoButton>
					</View>
				</View>
			</MobileSheet>
		</View>
	);
}
