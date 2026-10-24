import { useAuthStore } from "@auth/store";
import { BookOpen, Check, FileText, User, X } from "lucide-react-native";
import { Button, Dialog, Text } from "panelui-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";

import { updateUserProfile } from "../api";
import type { Profile } from "../types";

interface EditProfileModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onProfileUpdated?: (updated: Profile) => void;
}

const AVATAR_PRESETS = [
	{ label: "Emerald", color: "from-emerald-500 to-teal-700", text: "EM" },
	{ label: "Indigo", color: "from-indigo-500 to-purple-700", text: "IN" },
	{ label: "Amber", color: "from-amber-500 to-orange-700", text: "AM" },
	{ label: "Sky", color: "from-sky-500 to-blue-700", text: "SK" },
	{ label: "Rose", color: "from-rose-500 to-pink-700", text: "RO" },
];

export function EditProfileModal({
	open,
	onOpenChange,
	onProfileUpdated,
}: EditProfileModalProps) {
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);
	const setProfile = useAuthStore((state) => state.setProfile);

	const [displayName, setDisplayName] = useState("");
	const [major, setMajor] = useState("");
	const [bio, setBio] = useState("");
	const [avatarUrl, setAvatarUrl] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (open && profile) {
			setDisplayName(profile.display_name || profile.username || "");
			setMajor(profile.major || "");
			setBio(profile.bio || "");
			setAvatarUrl(profile.avatar_url || "");
			setError(null);
		}
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
		<Dialog open={open} onOpenChange={onOpenChange}>
			<Dialog.Content className="mx-4 max-h-[90vh] max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl">
				{/* Header */}
				<View className="mb-4 flex-row items-center justify-between border-b border-border pb-3">
					<View className="flex-row items-center gap-2">
						<User size={18} color="#10b981" />
						<Dialog.Title
							weight="bold"
							className="text-lg text-foreground">
							Customize Profile
						</Dialog.Title>
					</View>
					<Pressable
						onPress={() => onOpenChange(false)}
						className="h-8 w-8 items-center justify-center rounded-full hover:bg-muted/50 active:scale-[0.96]">
						<X size={16} color="#a1a1aa" />
					</Pressable>
				</View>

				{error && (
					<View className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3">
						<Text className="text-xs text-destructive">
							{error}
						</Text>
					</View>
				)}

				<ScrollView
					showsVerticalScrollIndicator={false}
					className="-mx-1 max-h-[55vh] px-1">
					<View className="gap-4 py-1">
						{/* Display Name */}
						<View>
							<Text
								weight="medium"
								className="mb-1.5 text-xs text-muted-foreground">
								Display Name
							</Text>
							<TextInput
								value={displayName}
								onChangeText={setDisplayName}
								placeholder="e.g. Alex Rivera"
								placeholderTextColor="#64748b"
								maxLength={50}
								className="rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-primary"
							/>
						</View>

						{/* Academic Specialization / Major */}
						<View>
							<View className="mb-1.5 flex-row items-center gap-1.5">
								<BookOpen size={13} color="#a1a1aa" />
								<Text
									weight="medium"
									className="text-xs text-muted-foreground">
									Major / Specialization
								</Text>
							</View>
							<TextInput
								value={major}
								onChangeText={setMajor}
								placeholder="e.g. BS Computer Science, 4th Year"
								placeholderTextColor="#64748b"
								maxLength={80}
								className="rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-primary"
							/>
						</View>

						{/* Bio */}
						<View>
							<View className="mb-1.5 flex-row items-center justify-between">
								<View className="flex-row items-center gap-1.5">
									<FileText size={13} color="#a1a1aa" />
									<Text
										weight="medium"
										className="text-xs text-muted-foreground">
										Biography
									</Text>
								</View>
								<Text className="text-[11px] text-muted-foreground">
									{bio.length}/250
								</Text>
							</View>
							<TextInput
								value={bio}
								onChangeText={setBio}
								multiline
								numberOfLines={3}
								textAlignVertical="top"
								placeholder="Share your technical interests, tech stack, or campus projects..."
								placeholderTextColor="#64748b"
								maxLength={250}
								className="min-h-20 rounded-xl border border-border bg-background p-3 text-xs text-foreground focus:border-primary"
							/>
						</View>

						{/* Avatar Theme Presets */}
						<View>
							<Text
								weight="medium"
								className="mb-2 text-xs text-muted-foreground">
								Avatar Badge Theme
							</Text>
							<View className="flex-row flex-wrap items-center gap-2">
								{AVATAR_PRESETS.map((preset) => {
									const isSelected =
										avatarUrl === preset.label;
									return (
										<Pressable
											key={preset.label}
											onPress={() =>
												setAvatarUrl(preset.label)
											}
											className={`flex-row items-center gap-1.5 rounded-xl border px-3 py-1.5 active:scale-[0.96] ${
												isSelected
													? "border-primary bg-primary/20 text-primary"
													: "border-border/70 bg-muted/30"
											}`}>
											<View
												className={`h-4 w-4 rounded-full bg-gradient-to-br ${preset.color}`}
											/>
											<Text
												weight={
													isSelected
														? "bold"
														: "normal"
												}
												className={`text-xs ${
													isSelected
														? "text-primary"
														: "text-muted-foreground"
												}`}>
												{preset.label}
											</Text>
											{isSelected && (
												<Check
													size={12}
													color="#10b981"
												/>
											)}
										</Pressable>
									);
								})}
							</View>
						</View>
					</View>
				</ScrollView>

				{/* Modal Footer */}
				<Dialog.Footer className="mt-5 flex-row items-center justify-end gap-3 border-t border-border pt-3">
					<Button
						size="md"
						variant="outline"
						className="transition-transform active:scale-[0.96]"
						onPress={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						size="md"
						variant="primary"
						loading={isSubmitting}
						disabled={isSubmitting}
						className="flex-1 transition-transform active:scale-[0.96] sm:flex-initial"
						onPress={handleSave}>
						Save Changes
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	);
}
