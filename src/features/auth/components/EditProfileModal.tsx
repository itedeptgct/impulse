import { updateUserProfile } from "@auth/api";
import { useAuthStore } from "@auth/store";
import type { Profile } from "@auth/types";
import {
	AlertCircle,
	BookOpen,
	Check,
	FileText,
	Palette,
	User,
	X,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NeoBadge, NeoButton, NeoInput } from "@/components/ui";

export interface EditProfileModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onProfileUpdated?: (updatedProfile: Profile) => void;
}

const AVATAR_PRESETS = [
	{ label: "terminal", color: "bg-emerald-500", desc: "Emerald Matrix" },
	{ label: "cyber", color: "bg-cyan-500", desc: "Cyan Circuit" },
	{ label: "matrix", color: "bg-lime-400", desc: "Neon Phosphor" },
	{ label: "void", color: "bg-purple-600", desc: "Deep Void" },
	{ label: "neural", color: "bg-rose-500", desc: "Neural Pink" },
];

export function EditProfileModal({
	open,
	onOpenChange,
	onProfileUpdated,
}: EditProfileModalProps) {
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);
	const setProfile = useAuthStore((state) => state.setProfile);

	const [displayName, setDisplayName] = useState(profile?.display_name || "");
	const [major, setMajor] = useState(profile?.major || "");
	const [bio, setBio] = useState(profile?.bio || "");
	const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const prevOpenRef = useRef(open);

	useEffect(() => {
		if (open && !prevOpenRef.current && profile) {
			setDisplayName(profile.display_name || "");
			setMajor(profile.major || "");
			setBio(profile.bio || "");
			setAvatarUrl(profile.avatar_url || "");
			setError(null);
		}
		prevOpenRef.current = open;
	}, [open, profile]);

	const handleSave = async () => {
		if (!user?.id) return;
		if (displayName.trim().length > 50) {
			setError("Display name must be 50 characters or less.");
			return;
		}
		if (bio.trim().length > 250) {
			setError("Bio must be 250 characters or less.");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			const updated = await updateUserProfile(user.id, {
				display_name: displayName.trim(),
				major: major.trim(),
				bio: bio.trim(),
				avatar_url: avatarUrl.trim() || null,
			});
			setProfile(updated);
			onProfileUpdated?.(updated);
			onOpenChange(false);
		} catch (err: unknown) {
			const e = err as Error;
			setError(e.message || "Failed to update profile.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Modal
			visible={open}
			animationType="slide"
			presentationStyle="fullScreen"
			statusBarTranslucent={true}
			onRequestClose={() => onOpenChange(false)}>
			<View
				style={{ backgroundColor: "#0a0a0c", flex: 1 }}
				className="flex-1 bg-background">
				<SafeAreaView
					style={{ backgroundColor: "#0a0a0c", flex: 1 }}
					className="flex-1 bg-background"
					edges={["top", "bottom"]}>
					{/* Top Header Bar */}
					<View className="flex-row items-center justify-between border-b-2 border-border bg-card px-4 py-3 shadow-neo-sm">
						<NeoButton
							variant="secondary"
							size="sm"
							onPress={() => onOpenChange(false)}>
							CANCEL
						</NeoButton>

						<Text className="font-display text-base tracking-tight text-foreground uppercase">
							EDIT PROFILE
						</Text>

						<NeoButton
							variant="primary"
							size="sm"
							loading={isSubmitting}
							disabled={isSubmitting}
							onPress={handleSave}>
							SAVE
						</NeoButton>
					</View>

					{error && (
						<View className="mx-4 mt-3 flex-row items-center gap-2 rounded-sm border-2 border-destructive bg-destructive/15 p-3">
							<AlertCircle size={16} color="#ff5c5c" />
							<Text className="flex-1 font-mono text-xs text-destructive">
								{error}
							</Text>
							<Pressable
								onPress={() => setError(null)}
								hitSlop={8}>
								<X size={14} color="#ff5c5c" />
							</Pressable>
						</View>
					)}

					<KeyboardAvoidingView
						behavior={Platform.OS === "ios" ? "padding" : undefined}
						className="flex-1">
						<ScrollView
							contentContainerStyle={{
								flexGrow: 1,
								paddingBottom: 32,
							}}
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled"
							className="flex-1 px-4 pt-4">
							<View className="gap-5">
								{/* Display Name */}
								<NeoInput
									label="DISPLAY NAME"
									value={displayName}
									onChangeText={setDisplayName}
									placeholder="e.g. Alex Rivera"
									maxLength={50}
									startContent={
										<User
											size={15}
											color="#91e6b1"
											strokeWidth={2.2}
										/>
									}
								/>

								{/* Academic Specialization / Major */}
								<NeoInput
									label="ACADEMIC MAJOR / SPECIALIZATION"
									value={major}
									onChangeText={setMajor}
									placeholder="e.g. Computer Science, Systems Engineering"
									maxLength={80}
									startContent={
										<BookOpen
											size={15}
											color="#91e6b1"
											strokeWidth={2.2}
										/>
									}
								/>

								{/* Bio / Intel */}
								<NeoInput
									label="BIO / INTEL"
									value={bio}
									onChangeText={setBio}
									placeholder="Briefly describe your campus focus, technical stack, or projects..."
									multiline
									numberOfLines={4}
									maxLength={250}
									textAlignVertical="top"
									inputWrapperClassName="items-start py-1"
									className="min-h-24"
									startContent={
										<View className="pt-2">
											<FileText
												size={15}
												color="#91e6b1"
												strokeWidth={2.2}
											/>
										</View>
									}
									helperText={`${bio.length}/250 characters`}
								/>

								{/* Avatar Theme Presets */}
								<View>
									<View className="mb-2 flex-row items-center justify-between">
										<View className="flex-row items-center gap-1.5">
											<Palette
												size={14}
												color="#91e6b1"
												strokeWidth={2.2}
											/>
											<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
												AVATAR THEME PRESET
											</Text>
										</View>
										{avatarUrl ? (
											<NeoBadge
												variant="primary"
												size="sm">
												{avatarUrl.toUpperCase()}
											</NeoBadge>
										) : null}
									</View>

									<View className="gap-2">
										{AVATAR_PRESETS.map((preset) => {
											const isSelected =
												avatarUrl === preset.label;
											return (
												<Pressable
													key={preset.label}
													onPress={() =>
														setAvatarUrl(
															preset.label,
														)
													}
													className={`flex-row items-center justify-between rounded-sm border-2 p-3 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
														isSelected
															? "border-primary bg-primary/10 shadow-neo-sm"
															: "border-border bg-card shadow-neo-sm"
													}`}>
													<View className="flex-row items-center gap-3">
														<View
															className={`size-6 rounded-sm border-2 border-border ${preset.color}`}
														/>
														<View>
															<Text
																className={`font-mono text-xs uppercase ${
																	isSelected
																		? "text-primary"
																		: "text-foreground"
																}`}>
																{preset.label}
															</Text>
															<Text className="font-mono text-[10px] text-muted-foreground">
																{preset.desc}
															</Text>
														</View>
													</View>
													{isSelected ? (
														<View className="size-6 items-center justify-center rounded-sm border-2 border-primary bg-primary">
															<Check
																size={14}
																color="#0a0a0c"
																strokeWidth={3}
															/>
														</View>
													) : (
														<View className="size-6 rounded-sm border-2 border-border bg-secondary" />
													)}
												</Pressable>
											);
										})}
									</View>
								</View>

								{/* Bottom Save Action */}
								<View className="mt-4 gap-3 border-t-2 border-border pt-4">
									<NeoButton
										variant="primary"
										size="md"
										loading={isSubmitting}
										disabled={isSubmitting}
										onPress={handleSave}
										className="w-full">
										SAVE CHANGES
									</NeoButton>
									<NeoButton
										variant="outline"
										size="md"
										onPress={() => onOpenChange(false)}
										className="w-full">
										CANCEL
									</NeoButton>
								</View>
							</View>
						</ScrollView>
					</KeyboardAvoidingView>
				</SafeAreaView>
			</View>
		</Modal>
	);
}
