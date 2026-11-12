import { useAuthStore } from "@auth/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import {
	AlertCircle,
	Calendar,
	Check,
	Lock,
	MapPin,
	Radio,
	Send,
	X,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NeoButton } from "@/components/ui";
import type { GuildId } from "@/features/guilds/types";
import { createPost } from "@/features/posts/api";
import type { Post } from "@/features/posts/types";

export interface DispatchComposerModalProps {
	visible: boolean;
	onClose: () => void;
	onCreated?: (dispatch: Post) => void;
}

const STORAGE_POSTS_KEY = "impulse_posts_cache_v2";

const TARGET_OPTIONS: { id: GuildId | null; label: string; bgClass: string }[] =
	[
		{ id: null, label: "GLOBAL DISPATCH", bgClass: "bg-neo-yellow" },
		{ id: "octagram", label: "OCTOGRAM", bgClass: "bg-primary text-neo-yellow" },
		{ id: "chameleon", label: "CHAMELEON", bgClass: "bg-neo-magenta" },
		{ id: "blue_jays", label: "BLUE JAYS", bgClass: "bg-neo-green-dark" },
	];

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

export function DispatchComposerModal({
	visible,
	onClose,
	onCreated,
}: DispatchComposerModalProps) {
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);

	const userRole = profile?.role;
	const userGuild = profile?.guild ?? null;
	const isHouseMod = userRole === "house_mod";

	// Initial default target: if house_mod, locked to userGuild; otherwise Global (null)
	const [targetGuild, setTargetGuild] = useState<GuildId | null>(
		isHouseMod ? userGuild : null,
	);
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [eventDate, setEventDate] = useState("");
	const [eventLocation, setEventLocation] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Reset state whenever modal opens or role changes
	useEffect(() => {
		if (visible) {
			setTargetGuild(isHouseMod ? userGuild : null);
			setTitle("");
			setContent("");
			setEventDate("");
			setEventLocation("");
			setError(null);
			setIsSubmitting(false);
		}
	}, [visible, isHouseMod, userGuild]);

	const isValid = title.trim().length > 0 && content.trim().length > 0;

	const handleSubmit = async () => {
		if (!isValid || isSubmitting) return;
		if (!user?.id) {
			setError("Authentication required to issue dispatches");
			return;
		}

		// Double-tap prevention
		setIsSubmitting(true);
		setError(null);
		triggerHaptic();

		try {
			const authorObj = {
				id: user.id,
				username: profile?.username || user.email?.split("@")[0] || "operator",
				display_name: profile?.display_name || null,
				avatar_url: profile?.avatar_url || null,
				email: profile?.email || user.email,
				role: profile?.role || "user",
				guild: profile?.guild || null,
			};

			const target = isHouseMod ? userGuild : targetGuild;

			const created = await createPost(
				{
					title: title.trim(),
					content: content.trim(),
					visibility: "public",
					guild: target,
					post_type: "dispatch",
					event_date: eventDate.trim() || null,
					event_location: eventLocation.trim() || null,
				},
				authorObj,
			);

			const dispatchPost: Post = {
				...created,
				post_type: "dispatch",
				guild: target,
				event_date: eventDate.trim() || null,
				event_location: eventLocation.trim() || null,
			};

			// Sync into AsyncStorage cache so dispatch tab and feed retain full metadata
			try {
				const raw = await AsyncStorage.getItem(STORAGE_POSTS_KEY);
				if (raw) {
					const cached: Post[] = JSON.parse(raw);
					const filtered = cached.filter((p) => p.id !== dispatchPost.id);
					await AsyncStorage.setItem(
						STORAGE_POSTS_KEY,
						JSON.stringify([dispatchPost, ...filtered]),
					);
				}
			} catch {}

			triggerHaptic();
			onCreated?.(dispatchPost);
			onClose();
		} catch (err: any) {
			setError(err?.message || "Failed to broadcast dispatch to the wire");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={() => {
				if (!isSubmitting) onClose();
			}}>
			<SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : undefined}
					className="flex-1">
					{/* Header */}
					<View className="flex-row items-center justify-between border-b-2 border-border bg-surface px-4 py-3">
						<View className="flex-row items-center gap-2">
							<Radio size={18} color="#000000" strokeWidth={2.5} />
							<Text className="font-display text-lg tracking-wider uppercase text-foreground">
								OFFICIAL DISPATCH COMPOSER
							</Text>
						</View>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Close composer"
							disabled={isSubmitting}
							hitSlop={8}
							onPress={() => {
								triggerHaptic();
								onClose();
							}}
							className="size-8 items-center justify-center border-2 border-border bg-surface shadow-neo-xs active:translate-x-px active:translate-y-px">
							<X size={16} color="#000000" strokeWidth={2.4} />
						</Pressable>
					</View>

					<ScrollView
						contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
						keyboardShouldPersistTaps="handled"
						className="flex-1">
						{error && (
							<View className="mb-4 flex-row items-center gap-2 border-2 border-border bg-destructive/15 p-3">
								<AlertCircle size={16} color="#FF2A00" strokeWidth={2.5} />
								<Text className="flex-1 font-mono text-xs text-destructive">
									{error}
								</Text>
							</View>
						)}

						{/* Wire Destination Selector */}
						<View className="mb-5">
							<Text className="mb-2 font-bold text-xs uppercase tracking-wider text-foreground">
								TARGET WIRE / DESTINATION
							</Text>

							{isHouseMod ? (
								<View className="flex-row items-center gap-2 border-2 border-border bg-neo-surface-active p-3">
									<Lock size={16} color="#000000" strokeWidth={2.4} />
									<View className="flex-1">
										<Text className="font-bold text-xs uppercase tracking-wider text-foreground">
											LOCKED TO {userGuild?.toUpperCase()}
										</Text>
										<Text className="font-mono text-2xs text-foreground/70">
											House Moderator wire authorization locked to your assigned house.
										</Text>
									</View>
								</View>
							) : (
								<View className="flex-row flex-wrap gap-2">
									{TARGET_OPTIONS.map((opt) => {
										const isSelected = targetGuild === opt.id;
										return (
											<Pressable
												key={String(opt.id)}
												accessibilityRole="radio"
												accessibilityState={{ selected: isSelected }}
												disabled={isSubmitting}
												onPress={() => {
													triggerHaptic();
													setTargetGuild(opt.id);
												}}
												className={`flex-row items-center gap-1.5 border-2 border-border px-3 py-2 shadow-neo-xs active:translate-x-px active:translate-y-px ${
													isSelected
														? "bg-primary"
														: "bg-surface"
												}`}>
												{isSelected && (
													<Check
														size={14}
														color="#FAF9F5"
														strokeWidth={2.5}
													/>
												)}
												<Text
													className={`font-bold text-xs uppercase tracking-wider ${
														isSelected
															? "text-primary-foreground"
															: "text-foreground"
													}`}>
													{opt.label}
												</Text>
											</Pressable>
										);
									})}
								</View>
							)}
						</View>

						{/* Title Input */}
						<View className="mb-4">
							<View className="mb-1.5 flex-row items-center justify-between">
								<Text className="font-bold text-xs uppercase tracking-wider text-foreground">
									HEADLINE / TITLE *
								</Text>
								<Text className="font-mono text-2xs tabular-nums text-foreground/60">
									{title.length}/120
								</Text>
							</View>
							<TextInput
								value={title}
								onChangeText={setTitle}
								maxLength={120}
								editable={!isSubmitting}
								placeholder="OFFICIAL DISPATCH HEADLINE..."
								placeholderTextColor="#666666"
								className="border-2 border-border bg-surface px-3 py-2.5 font-bold text-sm uppercase text-foreground shadow-neo-xs"
							/>
						</View>

						{/* Content Input */}
						<View className="mb-4">
							<View className="mb-1.5 flex-row items-center justify-between">
								<Text className="font-bold text-xs uppercase tracking-wider text-foreground">
									DISPATCH CONTENT *
								</Text>
								<Text className="font-mono text-2xs tabular-nums text-foreground/60">
									{content.length}/5000
								</Text>
							</View>
							<TextInput
								value={content}
								onChangeText={setContent}
								maxLength={5000}
								editable={!isSubmitting}
								multiline
								textAlignVertical="top"
								placeholder="Enter official statement, announcement details, or house wire updates..."
								placeholderTextColor="#666666"
								className="min-h-[140px] border-2 border-border bg-surface p-3 font-mono text-sm leading-relaxed text-foreground shadow-neo-xs"
							/>
						</View>

						{/* Event Metadata (Optional) */}
						<View className="mb-6 border-2 border-border bg-neo-surface-active p-3">
							<Text className="mb-2.5 font-bold text-xs uppercase tracking-wider text-foreground">
								EVENT SCHEDULE & VENUE (OPTIONAL)
							</Text>

							<View className="mb-3">
								<View className="mb-1 flex-row items-center gap-1.5">
									<Calendar size={13} color="#000000" strokeWidth={2.4} />
									<Text className="font-bold text-2xs uppercase tracking-wider text-foreground/80">
										EVENT DATE / TIME
									</Text>
								</View>
								<TextInput
									value={eventDate}
									onChangeText={setEventDate}
									maxLength={50}
									editable={!isSubmitting}
									placeholder="e.g. 2026-11-20 or NOV 20, 18:00 UTC"
									placeholderTextColor="#666666"
									className="border border-border bg-surface px-3 py-2 font-mono text-xs text-foreground"
								/>
							</View>

							<View>
								<View className="mb-1 flex-row items-center gap-1.5">
									<MapPin size={13} color="#000000" strokeWidth={2.4} />
									<Text className="font-bold text-2xs uppercase tracking-wider text-foreground/80">
										EVENT VENUE / LOCATION
									</Text>
								</View>
								<TextInput
									value={eventLocation}
									onChangeText={setEventLocation}
									maxLength={100}
									editable={!isSubmitting}
									placeholder="e.g. MAIN AUDITORIUM / STAGE 01"
									placeholderTextColor="#666666"
									className="border border-border bg-surface px-3 py-2 font-mono text-xs text-foreground"
								/>
							</View>
						</View>

						{/* Submit button with double-tap prevention */}
						<NeoButton
							variant="primary"
							size="lg"
							disabled={!isValid || isSubmitting}
							loading={isSubmitting}
							startContent={
								!isSubmitting ? (
									<Send size={16} color="#FAF9F5" strokeWidth={2.5} />
								) : undefined
							}
							onPress={handleSubmit}
							className="bg-primary">
							BROADCAST DISPATCH
						</NeoButton>
					</ScrollView>
				</KeyboardAvoidingView>
			</SafeAreaView>
		</Modal>
	);
}
