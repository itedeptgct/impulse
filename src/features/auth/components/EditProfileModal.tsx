import { updateUserProfile, uploadAvatar } from "@auth/api";
import { useAuthStore } from "@auth/store";
import type { Course, Profile, YearLevel } from "@auth/types";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
	AlertCircle,
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
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);
	const setProfile = useAuthStore((state) => state.setProfile);

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

	const prevOpenRef = useRef(open);

	useEffect(() => {
		if (open && !prevOpenRef.current && profile) {
			setDisplayName(profile.display_name || profile.username || "");
			setCourse(profile.course || null);
			setYearLevel(profile.year_level || null);
			setBio(profile.bio || "");
			setAvatarUrl(profile.avatar_url || "");
			setError(null);
		}
		prevOpenRef.current = open;
	}, [open, profile]);

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
			const updated = await updateUserProfile(user.id, {
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
							loading={isSubmitting || isUploadingAvatar}
							disabled={isSubmitting || isUploadingAvatar}
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
								{/* Custom Profile Photo Upload Section */}
								<View className="rounded-sm border-2 border-border bg-card p-4 shadow-neo-sm">
									<View className="mb-3 flex-row items-center gap-2">
										<Camera
											size={15}
											color="#91e6b1"
											strokeWidth={2.2}
										/>
										<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
											PROFILE PICTURE
										</Text>
									</View>

									<View className="flex-row items-center gap-4">
										{/* Avatar Image or Initials Box */}
										<View className="size-20 items-center justify-center overflow-hidden rounded-sm border-2 border-border bg-secondary shadow-neo-sm">
											{isUploadingAvatar ? (
												<ActivityIndicator
													color="#91e6b1"
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
												<Text className="font-bold font-mono text-2xl text-foreground">
													{initials}
												</Text>
											)}
										</View>

										{/* Photo Actions */}
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
														color="#ff5c5c"
													/>
													<Text className="font-mono text-[11px] text-destructive uppercase">
														REMOVE PHOTO
													</Text>
												</Pressable>
											) : null}
										</View>
									</View>
								</View>

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

								{/* Course Selector (BSIT vs BSCS) */}
								<View className="rounded-sm border-2 border-border bg-card p-3 shadow-neo-sm">
									<View className="mb-2 flex-row items-center justify-between">
										<View className="flex-row items-center gap-2">
											<GraduationCap
												size={15}
												color="#91e6b1"
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
												const isSelected = course === c;
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
														className={`flex-1 items-center justify-center rounded-sm border-2 py-2.5 shadow-neo-sm active:translate-x-px active:translate-y-px ${
															isSelected
																? "border-primary bg-primary text-black"
																: "border-border bg-secondary"
														}`}>
														<Text
															className={`font-bold font-mono text-xs ${
																isSelected
																	? "text-black"
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

								{/* Year Level Selector (1 to 4) */}
								<View className="rounded-sm border-2 border-border bg-card p-3 shadow-neo-sm">
									<View className="mb-2 flex-row items-center justify-between">
										<View className="flex-row items-center gap-2">
											<BookOpen
												size={15}
												color="#91e6b1"
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
														className={`flex-1 items-center justify-center rounded-sm border-2 py-2.5 shadow-neo-sm active:translate-x-px active:translate-y-px ${
															isSelected
																? "border-primary bg-primary text-black"
																: "border-border bg-secondary"
														}`}>
														<Text
															className={`font-bold text-xs ${
																isSelected
																	? "text-black"
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

								{/* Bottom Save Action */}
								<View className="mt-2 gap-3 border-t-2 border-border pt-4">
									<NeoButton
										variant="primary"
										size="md"
										loading={
											isSubmitting || isUploadingAvatar
										}
										disabled={
											isSubmitting || isUploadingAvatar
										}
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
