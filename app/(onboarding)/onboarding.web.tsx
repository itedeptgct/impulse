import { useGoogleSignIn } from "@auth/hooks/useGoogleSignIn";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
	AlertCircle,
	ArrowRight,
	Lock,
	Mail,
	Shield,
	Sparkles,
	Users,
} from "lucide-react-native";
import { Button, Text } from "panelui-native";
import { GoogleIcon } from "panelui-native/icons";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

export default function OnboardingWebScreen() {
	const googleSignInMutation = useGoogleSignIn();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

	return (
		<View className="min-h-screen flex-1 bg-background text-foreground">
			<StatusBar style="light" />
			{/* Desktop Top Navbar */}
			<header className="border-b border-border bg-background/80 backdrop-blur-md">
				<View className="mx-auto flex-row items-center justify-between px-6 py-4 lg:max-w-7xl lg:px-10">
					<View className="flex-row items-center gap-3">
						<Text
							weight="bold"
							className="text-xl tracking-tight text-foreground">
							impulse
						</Text>
					</View>
					<View className="flex-row items-center gap-3">
						<Text className="hidden text-xs text-muted-foreground md:inline">
							Already part of the network?
						</Text>
						<Button
							size="sm"
							variant="outline"
							onPress={() => router.push("/(auth)/sign-in")}>
							Log In
						</Button>
						<Button
							size="sm"
							variant="primary"
							onPress={() => router.push("/(auth)/sign-up")}>
							Create Account
						</Button>
					</View>
				</View>
			</header>
			{/* Main Split Content Area */}
			<ScrollView
				contentContainerStyle={{ flexGrow: 1 }}
				showsVerticalScrollIndicator={false}
				className="flex-1">
				<View className="mx-auto w-full flex-1 flex-col justify-center px-6 py-12 lg:max-w-7xl lg:flex-row lg:items-center lg:gap-16 lg:px-10 lg:py-16">
					{/* Left Column: Brand Identity & Campus Value Props */}
					<View className="flex-1 flex-col justify-center pb-12 lg:pb-0">
						<Text
							weight="bold"
							className="text-4xl leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
							Officia minim officia consequat laborum adipisicing.
						</Text>
						<Text className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
							Do amet tempor laborum sit ex dolore commodo sit occaecat
							adipisicing culpa officia nostrud ut. Tempor mollit voluptate
							Lorem nostrud cillum dolore nostrud ipsum Lorem.
						</Text>
						{/* Feature Bento Vignettes */}
						<View className="mt-10 max-w-xl gap-4">
							<View className="flex-row items-start gap-4 rounded-2xl border border-border bg-card/60 p-4">
								<View className="h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
									<Shield size={20} className="text-primary" />
								</View>
								<View className="flex-1">
									<Text weight="semibold" className="text-sm text-foreground">
										100% Student Verified
									</Text>
									<Text className="mt-1 text-xs text-muted-foreground">
										Every profile is checked against a valid GCT student ID to
										keep discussions authentic and community-first.
									</Text>
								</View>
							</View>
							<View className="flex-row items-start gap-4 rounded-2xl border border-border bg-card/60 p-4">
								<View className="h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-popover">
									<Users size={20} className="text-muted-foreground" />
								</View>
								<View className="flex-1">
									<Text weight="semibold" className="text-sm text-foreground">
										Department & Campus Channels
									</Text>
									<Text className="mt-1 text-xs text-muted-foreground">
										Find study groups, trade lecture notes, or catch real-time
										updates right from your peers.
									</Text>
								</View>
							</View>
							<View className="flex-row items-start gap-4 rounded-2xl border border-border bg-card/60 p-4">
								<View className="h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-popover">
									<Lock size={20} className="text-muted-foreground" />
								</View>
								<View className="flex-1">
									<Text weight="semibold" className="text-sm text-foreground">
										Private & Student Owned
									</Text>
									<Text className="mt-1 text-xs text-muted-foreground">
										Zero ads and no commercial profiling. Encrypted
										authentication backed by Supabase.
									</Text>
								</View>
							</View>
						</View>
					</View>
					{/* Right Column: Interactive Auth Initiation Card */}
					<View className="w-full lg:max-w-md">
						<View className="rounded-3xl border border-border bg-card p-8 shadow-2xl">
							<View className="pb-6">
								<View className="mb-2 flex-row items-center gap-2">
									<Sparkles size={16} className="text-primary" />
									<Text
										weight="medium"
										className="text-xs tracking-wider text-primary uppercase">
										Get Started
									</Text>
								</View>
								<Text
									weight="bold"
									className="text-2xl tracking-tight text-foreground">
									Join the Network
								</Text>
								<Text className="mt-1.5 text-sm text-muted-foreground">
									Create your account with your GCT credentials to begin student
									verification.
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
							{/* Auth CTAs */}
							<View className="gap-3.5">
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
								<View className="my-2 flex-row items-center gap-3">
									<View className="h-px flex-1 bg-border" />
									<Text
										weight="medium"
										className="text-xs text-muted-foreground uppercase">
										or continue with email
									</Text>
									<View className="h-px flex-1 bg-border" />
								</View>
								<Button
									size="xl"
									fullWidth
									variant="primary"
									startContent={
										<Mail
											size={18}
											strokeWidth={2}
											className="text-primary-foreground"
										/>
									}
									endContent={
										<ArrowRight size={16} className="text-primary-foreground" />
									}
									onPress={() => router.push("/(auth)/sign-up")}>
									Create Student Account
								</Button>
								<Button
									size="xl"
									fullWidth
									variant="outline"
									onPress={() => router.push("/(auth)/sign-in")}>
									Log In to Existing Account
								</Button>
							</View>
							<View className="mt-6 border-t border-border pt-5">
								<Text className="text-center text-xs leading-relaxed text-muted-foreground">
									By joining impulse, you agree to uphold student conduct and
									verify your active student status with your official ID.
								</Text>
							</View>
							<View className="mt-6 flex-row items-center justify-center gap-1.5">
								<Text className="text-xs text-muted-foreground">
									Already registered?
								</Text>
								<Pressable
									onPress={() => router.push("/(auth)/sign-in")}
									className="cursor-pointer">
									<Text weight="semibold" className="text-xs text-primary">
										Sign in here
									</Text>
								</Pressable>
							</View>
						</View>
						{/* Small Trust Badge under Card */}
						<View className="mt-4 flex-row items-center justify-center gap-2">
							<Shield size={14} className="text-muted-foreground" />
							<Text className="text-xs text-muted-foreground">
								End-to-end encrypted student authentication
							</Text>
						</View>
					</View>
				</View>
			</ScrollView>
			{/* Minimal Web Footer */}
			<footer className="border-t border-border bg-background/60 py-4">
				<View className="mx-auto flex-row items-center justify-between px-6 lg:max-w-7xl lg:px-10">
					<Text className="text-xs text-muted-foreground">
						© {new Date().getFullYear()} impulse
					</Text>
					<Text className="text-xs text-muted-foreground">
						Built for students, by students.
					</Text>
				</View>
			</footer>
		</View>
	);
}
