import { signInWithGitHub } from "@auth/api";
import { useAuthStore } from "@auth/store";
import { dismissGitHubPrompt } from "@auth/utils/github";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { AlertCircle, CheckCircle2, Link2, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NeoButton } from "@/components/ui";
import { GitHubIcon } from "@/components/ui/GitHubIcon";

export interface GitHubConnectModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function GitHubConnectModal({
	open,
	onOpenChange,
}: GitHubConnectModalProps) {
	const user = useAuthStore((state) => state.user);
	const [status, setStatus] = useState<
		"idle" | "loading" | "success" | "error"
	>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		if (open) {
			setStatus("idle");
			setErrorMessage(null);
		}
	}, [open]);

	const handleConnect = async () => {
		setStatus("loading");
		setErrorMessage(null);
		try {
			const { url } = await signInWithGitHub();
			if (!url) throw new Error("Could not get GitHub sign-in URL.");

			const result = await WebBrowser.openAuthSessionAsync(url);
			if (result.type === "success" && result.url) {
				const parsed = Linking.parse(result.url);
				const errorDesc =
					(parsed.queryParams?.error_description as string) ||
					(parsed.queryParams?.error as string);
				if (errorDesc) throw new Error(errorDesc);

				// The session is handled by onAuthStateChange automatically.
				// The identity is now linked to the user's account.
				setStatus("success");
				if (user?.id) await dismissGitHubPrompt(user.id);

				// Auto-close after a short delay
				setTimeout(() => onOpenChange(false), 1500);
			} else {
				// User cancelled
				setStatus("idle");
			}
		} catch (err: unknown) {
			const error = err as Error;
			setStatus("error");
			setErrorMessage(
				error?.message || "Failed to connect GitHub. Please try again.",
			);
		}
	};

	const handleSkip = async () => {
		if (user?.id) await dismissGitHubPrompt(user.id);
		onOpenChange(false);
	};

	return (
		<Modal
			visible={open}
			animationType="fade"
			transparent
			statusBarTranslucent
			onRequestClose={() => onOpenChange(false)}>
			<View className="flex-1 items-center justify-center bg-black/50 px-6">
				<SafeAreaView edges={["top", "bottom"]}>
					<View className="w-full max-w-sm rounded-none border-2 border-border bg-card p-6 shadow-neo">
						{/* Close button */}
						<Pressable
							onPress={handleSkip}
							hitSlop={8}
							className="absolute top-3 right-3 size-8 items-center justify-center">
							<X size={18} color="#000000" strokeWidth={2.5} />
						</Pressable>

						{/* Icon */}
						<View className="mb-4 items-center">
							<View className="size-14 items-center justify-center rounded-none border-2 border-border bg-muted">
								<GitHubIcon size={28} color="#000000" />
							</View>
						</View>

						{/* Title */}
						<Text className="text-center font-display text-xl tracking-tight text-foreground uppercase">
							CONNECT GITHUB
						</Text>
						<Text className="mt-2 text-center font-mono text-xs leading-relaxed text-muted-foreground">
							Link your GitHub account for faster sign-in. You can
							skip this and set it up later in Account Settings.
						</Text>

						{/* Error message */}
						{status === "error" && errorMessage && (
							<View className="mt-4 flex-row items-center gap-2 rounded-none border-2 border-destructive bg-destructive/10 p-3">
								<AlertCircle
									size={16}
									color="#ff2a00"
									className="shrink-0"
								/>
								<Text className="flex-1 font-mono text-xs text-destructive">
									{errorMessage}
								</Text>
							</View>
						)}

						{/* Success message */}
						{status === "success" && (
							<View className="mt-4 flex-row items-center gap-2 rounded-none border-2 border-border bg-[#00ff66]/20 p-3">
								<CheckCircle2
									size={16}
									color="#000000"
									strokeWidth={2.5}
								/>
								<Text className="flex-1 font-bold text-xs text-foreground">
									GitHub connected successfully!
								</Text>
							</View>
						)}

						{/* Actions */}
						{status !== "success" && (
							<View className="mt-6 gap-3">
								<NeoButton
									variant="primary"
									size="lg"
									className="w-full"
									loading={status === "loading"}
									startContent={
										<Link2
											size={16}
											color="#faf9f5"
											strokeWidth={2.2}
										/>
									}
									onPress={handleConnect}>
									CONNECT GITHUB
								</NeoButton>

								<NeoButton
									variant="outline"
									size="md"
									className="w-full"
									disabled={status === "loading"}
									onPress={handleSkip}>
									SKIP FOR NOW
								</NeoButton>
							</View>
						)}

						{/* Note */}
						<Text className="mt-4 text-center font-mono text-[10px] leading-relaxed text-muted-foreground uppercase">
							You can always connect GitHub later in{"\n"}
							Profile → Account Settings
						</Text>
					</View>
				</SafeAreaView>
			</View>
		</Modal>
	);
}
