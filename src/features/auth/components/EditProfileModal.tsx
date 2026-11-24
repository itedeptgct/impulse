import { changeUsername, updateUserProfile, uploadAvatar } from "@auth/api";
import { useAuthStore } from "@auth/store";
import type { Course, Profile, YearLevel } from "@auth/types";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
	AlertCircle,
	AtSign,
	BookOpen,
	Camera,
	FileText,
	GraduationCap,
	Trash2,
	User,
	X,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
	useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NeoBadge, NeoButton, NeoInput } from "@/components/ui";

export interface EditProfileModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onProfileUpdated?: (updatedProfile: Profile) => void;
}

export function EditProfileModal({
	open,
	onOpenChange,
	onProfileUpdated,
}: EditProfileModalProps) {
	const { width } = useWindowDimensions();
	const isDesktop = Platform.OS === "web" && width >= 1024;
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);
	const setProfile = useAuthStore((state) => state.setProfile);

	const [username, setUsername] = useState(profile?.username || "");
	const [displayName, setDisplayName] = useState(
		profile?.display_name || profile?.username || "",
	);
	const [course, setCourse] = useState<Course | null>(
		profile?.course || null,
	);
	const [yearLevel, setYearLevel] = useState<YearLevel | null>(
		profile?.year_level || null,
	);
	const [bio, setBio] = useState(profile?.bio || "");
	const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [initialValues, setInitialValues] = useState({
		username: profile?.username || "",
		displayName: profile?.display_name || profile?.username || "",
		course: profile?.course || null,
		yearLevel: profile?.year_level || null,
		bio: profile?.bio || "",
		avatarUrl: profile?.avatar_url || "",
	});

	const prevOpenRef = useRef(open);

	useEffect(() => {
		if (open && !prevOpenRef.current && profile) {
			setUsername(profile.username || "");
			setDisplayName(profile.display_name || profile.username || "");
			setCourse(profile.course || null);
			setYearLevel(profile.year_level || null);
			setBio(profile.bio || "");
			setAvatarUrl(profile.avatar_url || "");
			setInitialValues({
				username: profile.username || "",
				displayName: profile.display_name || profile.username || "",
				course: profile.course || null,
				yearLevel: profile.year_level || null,
				bio: profile.bio || "",
				avatarUrl: profile.avatar_url || "",
			});
			setError(null);
		}
		prevOpenRef.current = open;
	}, [open, profile]);

	const hasChanges =
		username.trim().toLowerCase() !==
			initialValues.username.trim().toLowerCase() ||
		displayName.trim() !== initialValues.displayName.trim() ||
		course !== initialValues.course ||
		yearLevel !== initialValues.yearLevel ||
		bio.trim() !== initialValues.bio.trim() ||
		avatarUrl.trim() !== initialValues.avatarUrl.trim();

	const handlePickAvatar = async () => {
		try {
			const permission =
				await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (!permission.granted) {
				setError(
					"Photo library permission is required to select an avatar.",
				);
				return;
			}

			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ["images"],
				allowsEditing: true,
				aspect: [1, 1],
				quality: 0.85,
			});

			if (!result.canceled && result.assets[0]?.uri && user?.id) {
				setIsUploadingAvatar(true);
				setError(null);
				try {
					const publicUrl = await uploadAvatar(
						user.id,
						result.assets[0].uri,
						result.assets[0].fileName,
					);
					setAvatarUrl(publicUrl);
				} catch (err: unknown) {
					const e = err as Error;
					setError(e.message || "Failed to upload avatar image.");
				} finally {
					setIsUploadingAvatar(false);
				}
			}
		} catch (err: unknown) {
			const e = err as Error;
			setError(e.message || "Unable to open photo picker.");
		}
	};

	const handleRemoveAvatar = () => {
		setAvatarUrl("");
	};

	const handleSave = async () => {
		if (!user?.id) return;
		const cleanUsername = username.trim().toLowerCase();
		if (cleanUsername.length < 1 || cleanUsername.length > 20) {
			setError("Username must be between 1 and 20 characters.");
			return;
		}
		if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
			setError(
				"Username can only contain letters, numbers, and underscores.",
			);
			return;
		}
		if (displayName.trim().length > 50) {
			setError("Display name must be 50 characters or less.");
			return;
		}
		if (displayName.trim().length < 2) {
			setError("Display name must be at least 2 characters.");
			return;
		}
		if (bio.trim().length > 250) {
			setError("Bio must be 250 characters or less.");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			if (cleanUsername !== initialValues.username.toLowerCase()) {
				await changeUsername(user.id, cleanUsername);
			}

			const updated = await updateUserProfile(user.id, {
				username: cleanUsername,
				display_name: displayName.trim(),
				course: course,
				year_level: yearLevel,
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

	const initials = (displayName || profile?.username || "ST")
		.slice(0, 2)
		.toUpperCase();

	return (
		<Modal
			visible={open}
			animationType={isDesktop ? "fade" : "slide"}
			transparent={isDesktop}
			presentationStyle={isDesktop ? "overFullScreen" : "fullScreen"}
			statusBarTranslucent={true}
			onRequestClose={() => onOpenChange(false)}>
			<View
				style={
					isDesktop
						? {
								flex: 1,
								alignItems: "center",
								justifyContent: "center",
								padding: 24,
								backgroundColor: "rgba(0, 0, 0, 0.45)",
							}
						: { backgroundColor: "#faf9f5", flex: 1 }
				}
				className="flex-1">
				<SafeAreaView
					style={{
						backgroundColor: "#faf9f5",
						flex: isDesktop ? undefined : 1,
						...(isDesktop
							? {
									width: "100%",
									maxWidth: 760,
									height: "90%",
									maxHeight: 820,
									borderWidth: 2,
									borderColor: "#000000",
								}
							: {}),
					}}
					className={
						isDesktop
							? "w-full bg-background"
							: "flex-1 bg-background"
					}
					edges={["top", "bottom"]}>
					<View className="relative flex-row items-center justify-between border-b-2 border-border bg-card px-4 py-3 shadow-neo-sm">
						<NeoButton
							variant="secondary"
							size="sm"
							onPress={() => onOpenChange(false)}>
							CANCEL
						</NeoButton>

						<Text
							pointerEvents="none"
							className="absolute inset-x-0 text-center font-display text-base tracking-tight text-foreground uppercase">
							EDIT PROFILE
						</Text>
					</View>

					{error && (
						<View className="mx-4 mt-3 flex-row items-center gap-2 rounded-none border-2 border-destructive bg-destructive/10 p-3">
							<AlertCircle size={16} color="#ff2a00" />
							<Text className="flex-1 font-mono text-xs text-destructive">
								{error}
							</Text>
							<Pressable
								onPress={() => setError(null)}
								hitSlop={8}>
								<X size={14} color="#ff2a00" />
							</Pressable>
						</View>
					)}

					<KeyboardAvoidingView
						behavior={Platform.OS === "ios" ? "padding" : undefined}
						className="flex-1">
						<ScrollView
							contentContainerStyle={{
								flexGrow: 1,
								paddingBottom: isDesktop ? 20 : 32,
							}}
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled"
							className={`flex-1 px-4 ${
								isDesktop ? "pt-3" : "pt-4"
							}`}>
							<View className={isDesktop ? "gap-3" : "gap-5"}>
								<View className="rounded-none border-2 border-border bg-card p-4 shadow-neo-sm">
									<View className="mb-3 flex-row items-center gap-2">
										<Camera
											size={15}
											color="#000000"
											strokeWidth={2.2}
										/>
										<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
											PROFILE PICTURE
										</Text>
									</View>

									<View className="flex-row items-center gap-4">
										<View className="size-20 items-center justify-center overflow-hidden rounded-none border-2 border-border bg-muted shadow-neo-sm">
											{isUploadingAvatar ? (
												<ActivityIndicator
													color="#000000"
													size="small"
												/>
											) : avatarUrl &&
											  avatarUrl.startsWith("http") ? (
												<ExpoImage
													source={{ uri: avatarUrl }}
													style={{
														width: "100%",
														height: "100%",
													}}
													contentFit="cover"
												/>
											) : (
												<View className="flex-1 items-center justify-center">
													<Text className="font-bold text-2xl text-foreground">
														{initials}
													</Text>
												</View>
											)}
										</View>

										<View className="flex-1 gap-2">
											<NeoButton
												variant="secondary"
												size="sm"
												loading={isUploadingAvatar}
												disabled={isUploadingAvatar}
												onPress={handlePickAvatar}
												className="w-full">
												CHOOSE NEW PHOTO
											</NeoButton>
											{avatarUrl ? (
												<Pressable
													onPress={handleRemoveAvatar}
													className="flex-row items-center justify-center gap-1.5 py-1">
													<Trash2
														size={12}
														color="#ff2a00"
													/>
													<Text className="font-mono text-[11px] text-destructive uppercase">
														REMOVE PHOTO
													</Text>
												</Pressable>
											) : null}
										</View>
									</View>
								</View>

								<View
									className={
										isDesktop ? "flex-row gap-3" : "gap-5"
									}>
									<View className={isDesktop ? "flex-1" : ""}>
										<NeoInput
											label="USERNAME (HANDLE)"
											value={username}
											onChangeText={(text) => {
												const clean = text
													.toLowerCase()
													.replace(/[^a-z0-9_]/g, "");
												setUsername(clean);
											}}
											placeholder="janedoe"
											maxLength={20}
											autoCapitalize="none"
											autoCorrect={false}
											startContent={
												<AtSign
													size={15}
													color="#000000"
													strokeWidth={2.2}
												/>
											}
											helperText={`${username.length}/20 characters • Letters, numbers, underscores`}
										/>
									</View>

									<View className={isDesktop ? "flex-1" : ""}>
										<NeoInput
											label="DISPLAY NAME"
											value={displayName}
											onChangeText={setDisplayName}
											placeholder="e.g. Alex Rivera"
											maxLength={50}
											startContent={
												<User
													size={15}
													color="#000000"
													strokeWidth={2.2}
												/>
											}
										/>
									</View>
								</View>

								<View
									className={
										isDesktop ? "flex-row gap-3" : "gap-5"
									}>
									<View
										className={`rounded-none border-2 border-border bg-card p-3 shadow-neo-sm ${isDesktop ? "flex-1" : ""}`}>
										<View className="mb-2 flex-row items-center justify-between">
											<View className="flex-row items-center gap-2">
												<GraduationCap
													size={15}
													color="#000000"
													strokeWidth={2.2}
												/>
												<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
													DEGREE COURSE
												</Text>
											</View>
											{course && (
												<NeoBadge
													variant="primary"
													size="sm">
													{course}
												</NeoBadge>
											)}
										</View>

										<View className="flex-row gap-2">
											{(["BSIT", "BSCS"] as Course[]).map(
												(c) => {
													const isSelected =
														course === c;
													return (
														<Pressable
															key={c}
															onPress={() =>
																setCourse(
																	isSelected
																		? null
																		: c,
																)
															}
															className={`flex-1 items-center justify-center rounded-none border-2 py-2.5 shadow-neo-sm active:translate-x-px active:translate-y-px ${
																isSelected
																	? "border-border bg-primary"
																	: "border-border bg-card"
															}`}>
															<Text
																className={`font-bold text-xs uppercase ${
																	isSelected
																		? "text-primary-foreground"
																		: "text-foreground"
																}`}>
																{c}
															</Text>
														</Pressable>
													);
												},
											)}
										</View>
									</View>

									<View
										className={`rounded-none border-2 border-border bg-card p-3 shadow-neo-sm ${isDesktop ? "flex-1" : ""}`}>
										<View className="mb-2 flex-row items-center justify-between">
											<View className="flex-row items-center gap-2">
												<BookOpen
													size={15}
													color="#000000"
													strokeWidth={2.2}
												/>
												<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
													YEAR LEVEL
												</Text>
											</View>
											{yearLevel && (
												<NeoBadge
													variant="default"
													size="sm">
													{`YEAR ${yearLevel}`}
												</NeoBadge>
											)}
										</View>

										<View className="flex-row gap-2">
											{([1, 2, 3, 4] as YearLevel[]).map(
												(yl) => {
													const isSelected =
														yearLevel === yl;
													return (
														<Pressable
															key={yl}
															onPress={() =>
																setYearLevel(
																	isSelected
																		? null
																		: yl,
																)
															}
															className={`flex-1 items-center justify-center rounded-none border-2 py-2.5 shadow-neo-sm active:translate-x-px active:translate-y-px ${
																isSelected
																	? "border-border bg-primary"
																	: "border-border bg-card"
															}`}>
															<Text
																className={`font-bold text-xs uppercase ${
																	isSelected
																		? "text-primary-foreground"
																		: "text-foreground"
																}`}>
																{yl}
															</Text>
														</Pressable>
													);
												},
											)}
										</View>
									</View>
								</View>

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
												color="#000000"
												strokeWidth={2.2}
											/>
										</View>
									}
									helperText={`${bio.length}/250 characters`}
								/>

								<View
									className={`border-t-2 border-border ${
										isDesktop
											? "mt-1 flex-row gap-3 pt-3"
											: "mt-2 gap-3 pt-4"
									}`}>
									<NeoButton
										variant="primary"
										size="md"
										loading={
											isSubmitting || isUploadingAvatar
										}
										disabled={
											!hasChanges ||
											isSubmitting ||
											isUploadingAvatar
										}
										onPress={handleSave}
										className={
											isDesktop ? "flex-1" : "w-full"
										}>
										SAVE CHANGES
									</NeoButton>
									<NeoButton
										variant="outline"
										size="md"
										onPress={() => onOpenChange(false)}
										className={
											isDesktop ? "flex-1" : "w-full"
										}>
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
