import { changeUsername, updateUserProfile, uploadAvatar } from "@auth/api";
import { useAuthStore } from "@auth/store";
import type { Course, Profile, YearLevel } from "@auth/types";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
	AlertCircle,
	ArrowLeft,
	AtSign,
	Camera,
	Check,
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NeoInput } from "@/components/ui";

import { ProfileSurfaceEffect } from "./ProfileSurfaceEffect";

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

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
	const academicPreview = [course, yearLevel ? `YEAR ${yearLevel}` : null]
		.filter(Boolean)
		.join(" · ");
	const isSaveDisabled = !hasChanges || isSubmitting || isUploadingAvatar;

	return (
		<Modal
			visible={open}
			animationType="slide"
			presentationStyle="fullScreen"
			statusBarTranslucent={true}
			onRequestClose={() => onOpenChange(false)}>
			<View
				style={{ backgroundColor: "#faf9f5", flex: 1 }}
				className="flex-1 bg-background">
				<SafeAreaView
					style={{ backgroundColor: "#faf9f5", flex: 1 }}
					className="flex-1 bg-background"
					edges={["top", "bottom"]}>
					{/* Clean Non-Overlapping Header */}
					<View className="flex-row items-center justify-between border-b-2 border-border bg-background px-4 py-3">
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Cancel editing profile"
							hitSlop={8}
							onPress={() => {
								triggerHaptic();
								onOpenChange(false);
							}}
							className="size-9 items-center justify-center border-2 border-border bg-surface shadow-neo-xs active:translate-x-px active:translate-y-px">
							<ArrowLeft
								size={16}
								color="#000000"
								strokeWidth={2.5}
							/>
						</Pressable>

						<Text className="font-ndot-caps text-base tracking-wider text-foreground uppercase">
							EDIT PROFILE
						</Text>

						<View className="size-9" />
					</View>

					{error && (
						<View className="mx-4 mt-3 flex-row items-center gap-2.5 border-2 border-destructive bg-destructive/10 p-3">
							<AlertCircle
								size={16}
								color="#ff2a00"
								strokeWidth={2.4}
							/>
							<Text className="flex-1 font-mono text-xs text-destructive">
								{error}
							</Text>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Dismiss error"
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
								paddingBottom: 28,
							}}
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled"
							className="flex-1 px-4 pt-4">
							<View className="mx-auto w-full max-w-xl gap-5">
								{/* Section 1: Live Operator Identity Preview & Avatar */}
								<View className="bg-card shadow-neo">
									<View className="overflow-hidden border-2 border-border bg-card">
										<ProfileSurfaceEffect
											guild={profile?.guild}
											height={72}
										/>

										<View className="border-t-2 border-border bg-card px-4 pb-4">
											<View className="flex-row items-end gap-3.5">
												<View className="-mt-9 size-18 items-center justify-center overflow-hidden border-2 border-border bg-surface">
													{isUploadingAvatar ? (
														<ActivityIndicator
															color="#000000"
															size="small"
														/>
													) : avatarUrl &&
													  avatarUrl.startsWith(
															"http",
													  ) ? (
														<ExpoImage
															source={{
																uri: avatarUrl,
															}}
															style={{
																width: "100%",
																height: "100%",
															}}
															contentFit="cover"
														/>
													) : (
														<Text className="font-display text-2xl text-foreground uppercase">
															{initials}
														</Text>
													)}
												</View>

												<View className="min-w-0 flex-1 pt-2">
													<Text
														numberOfLines={1}
														className="font-ndot-caps text-lg leading-none text-foreground uppercase">
														{displayName.trim() ||
															profile?.username ||
															"STUDENT"}
													</Text>
													<Text
														numberOfLines={1}
														className="mt-1 font-mono text-xs text-muted-foreground">
														@
														{username.trim() ||
															profile?.username ||
															"handle"}
													</Text>
												</View>
											</View>
										</View>

										{/* Docked Photo Action Rail */}
										<View className="flex-row border-t-2 border-border bg-surface">
											<Pressable
												accessibilityRole="button"
												accessibilityLabel="Choose new profile photo"
												disabled={isUploadingAvatar}
												onPress={() => {
													triggerHaptic();
													void handlePickAvatar();
												}}
												className={`h-11 flex-1 flex-row items-center justify-center gap-1.5 active:bg-secondary ${
													avatarUrl
														? "border-r-2 border-border"
														: ""
												}`}>
												<Camera
													size={14}
													color="#000000"
													strokeWidth={2.3}
												/>
												<Text className="font-bold text-2xs tracking-widest text-foreground uppercase">
													{isUploadingAvatar
														? "UPLOADING..."
														: "CHANGE PHOTO"}
												</Text>
											</Pressable>

											{avatarUrl ? (
												<Pressable
													accessibilityRole="button"
													accessibilityLabel="Remove profile photo"
													disabled={isUploadingAvatar}
													onPress={() => {
														triggerHaptic();
														handleRemoveAvatar();
													}}
													className="h-11 flex-1 flex-row items-center justify-center gap-1.5 active:bg-destructive/10">
													<Trash2
														size={14}
														color="#ff2a00"
														strokeWidth={2.3}
													/>
													<Text className="font-bold text-2xs tracking-widest text-destructive uppercase">
														REMOVE PHOTO
													</Text>
												</Pressable>
											) : null}
										</View>
									</View>
								</View>

								{/* Section 2: Identity & Bio */}
								<View className="bg-card shadow-neo">
									<View className="overflow-hidden border-2 border-border bg-card">
										<View className="flex-row items-center gap-2 border-b-2 border-border bg-surface px-4 py-2.5">
											<User
												size={14}
												color="#000000"
												strokeWidth={2.4}
											/>
											<Text className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
												IDENTITY &amp; BIO
											</Text>
										</View>

										<View className="gap-4 bg-card p-4">
											<NeoInput
												label="USERNAME (HANDLE)"
												value={username}
												onChangeText={(text) => {
													const clean = text
														.toLowerCase()
														.replace(
															/[^a-z0-9_]/g,
															"",
														);
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
												helperText={`${username.length}/20 · Letters, numbers, underscores`}
											/>

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

											<NeoInput
												label="BIO / INTEL"
												value={bio}
												onChangeText={setBio}
												placeholder="Briefly describe your campus focus, stack, or projects..."
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
										</View>
									</View>
								</View>

								{/* Section 3: Academic Classification */}
								<View className="bg-card shadow-neo">
									<View className="overflow-hidden border-2 border-border bg-card">
										<View className="flex-row items-center justify-between border-b-2 border-border bg-surface px-4 py-2.5">
											<View className="flex-row items-center gap-2">
												<GraduationCap
													size={14}
													color="#000000"
													strokeWidth={2.4}
												/>
												<Text className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
													ACADEMIC CLASSIFICATION
												</Text>
											</View>
											{academicPreview ? (
												<View className="border border-border bg-primary px-2 py-0.5">
													<Text className="font-bold text-3xs tracking-widest text-primary-foreground uppercase">
														{academicPreview}
													</Text>
												</View>
											) : null}
										</View>

										<View className="gap-4 bg-card p-4">
											{/* Degree Course Segmented Control */}
											<View>
												<Text className="mb-1.5 font-bold text-2xs tracking-widest text-foreground uppercase">
													DEGREE COURSE
												</Text>
												<View className="flex-row overflow-hidden border-2 border-border bg-surface">
													{(
														[
															"BSIT",
															"BSCS",
														] as Course[]
													).map((c, idx) => {
														const isSelected =
															course === c;
														return (
															<Pressable
																key={c}
																accessibilityRole="radio"
																accessibilityState={{
																	checked:
																		isSelected,
																}}
																onPress={() => {
																	triggerHaptic();
																	setCourse(
																		isSelected
																			? null
																			: c,
																	);
																}}
																className={`h-11 flex-1 items-center justify-center ${
																	idx === 0
																		? "border-r-2 border-border"
																		: ""
																} ${
																	isSelected
																		? "bg-primary"
																		: "bg-surface active:bg-secondary"
																}`}>
																<Text
																	className={`font-bold text-xs tracking-widest uppercase ${
																		isSelected
																			? "text-primary-foreground"
																			: "text-foreground"
																	}`}>
																	{c}
																</Text>
															</Pressable>
														);
													})}
												</View>
											</View>

											{/* Year Level Segmented Control */}
											<View>
												<Text className="mb-1.5 font-bold text-2xs tracking-widest text-foreground uppercase">
													YEAR LEVEL
												</Text>
												<View className="flex-row overflow-hidden border-2 border-border bg-surface">
													{(
														[
															1, 2, 3, 4,
														] as YearLevel[]
													).map((yl, idx) => {
														const isSelected =
															yearLevel === yl;
														return (
															<Pressable
																key={yl}
																accessibilityRole="radio"
																accessibilityState={{
																	checked:
																		isSelected,
																}}
																onPress={() => {
																	triggerHaptic();
																	setYearLevel(
																		isSelected
																			? null
																			: yl,
																	);
																}}
																className={`h-11 flex-1 items-center justify-center ${
																	idx < 3
																		? "border-r-2 border-border"
																		: ""
																} ${
																	isSelected
																		? "bg-primary"
																		: "bg-surface active:bg-secondary"
																}`}>
																<Text
																	className={`font-bold text-xs tracking-wider uppercase ${
																		isSelected
																			? "text-primary-foreground"
																			: "text-foreground"
																	}`}>
																	Y{yl}
																</Text>
															</Pressable>
														);
													})}
												</View>
											</View>
										</View>
									</View>
								</View>
							</View>
						</ScrollView>

						{/* Sticky Bottom Save Bar */}
						<View className="border-t-2 border-border bg-card px-4 py-3">
							<View className="mx-auto w-full max-w-xl flex-row gap-2.5">
								<Pressable
									accessibilityRole="button"
									accessibilityLabel="Cancel"
									onPress={() => {
										triggerHaptic();
										onOpenChange(false);
									}}
									className="h-12 items-center justify-center border-2 border-border bg-surface px-4 active:bg-secondary">
									<Text className="font-bold text-xs tracking-widest text-foreground uppercase">
										CANCEL
									</Text>
								</Pressable>

								<Pressable
									accessibilityRole="button"
									accessibilityLabel="Save profile changes"
									disabled={isSaveDisabled}
									onPress={() => {
										triggerHaptic();
										void handleSave();
									}}
									className={`h-12 flex-1 flex-row items-center justify-center gap-2 border-2 border-border px-4 active:opacity-85 ${
										isSaveDisabled
											? "bg-secondary"
											: "bg-neo-green"
									}`}>
									{isSubmitting || isUploadingAvatar ? (
										<ActivityIndicator
											size="small"
											color="#000000"
										/>
									) : (
										<>
											<Check
												size={15}
												color={
													isSaveDisabled
														? "#4c4546"
														: "#000000"
												}
												strokeWidth={2.8}
											/>
											<Text
												className={`font-bold text-xs tracking-widest uppercase ${
													isSaveDisabled
														? "text-muted-foreground"
														: "text-foreground"
												}`}>
												SAVE CHANGES
											</Text>
										</>
									)}
								</Pressable>
							</View>
						</View>
					</KeyboardAvoidingView>
				</SafeAreaView>
			</View>
		</Modal>
	);
}
