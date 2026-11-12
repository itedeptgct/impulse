import { useAuthStore } from "@auth/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import {
	AlertCircle,
	Calendar,
	Check,
	Lock,
	MapPin,
	Send,
} from "lucide-react-native";
import { useState } from "react";
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

import type { GuildId } from "@/features/guilds/types";
import { createPost } from "@/features/posts/api";
import type { Post } from "@/features/posts/types";

export interface DispatchComposerModalProps {
	visible: boolean;
	open?: boolean;
	onClose: () => void;
	onCreated?: (dispatch: Post) => void;
}

const STORAGE_POSTS_KEY = "impulse_posts_cache_v2";

const TARGET_OPTIONS: { id: GuildId | null; label: string }[] = [
	{ id: null, label: "GLOBAL WIRE" },
	{ id: "octagram", label: "OCTOGRAM" },
	{ id: "chameleon", label: "CHAMELEON" },
	{ id: "blue_jays", label: "BLUE JAYS" },
];

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

export function DispatchComposerModal({
	visible,
	open,
	onClose,
	onCreated,
}: DispatchComposerModalProps) {
	const isOpen = open ?? visible;
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);

	const userRole = profile?.role;
	const userGuild = profile?.guild ?? null;
	const isHouseMod = userRole === "house_mod";

	const [targetGuild, setTargetGuild] = useState<GuildId | null>(
		isHouseMod ? userGuild : null,
	);
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [eventDate, setEventDate] = useState("");
	const [eventLocation, setEventLocation] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const resetForm = () => {
		setTargetGuild(isHouseMod ? userGuild : null);
		setTitle("");
		setContent("");
		setEventDate("");
		setEventLocation("");
		setError(null);
		setIsSubmitting(false);
	};

	const handleClose = () => {
		resetForm();
		onClose();
	};

	const isValid =
		title.trim().length > 0 &&
		title.length <= 120 &&
		content.trim().length > 0 &&
		content.length <= 5000;

	const handleSubmit = async () => {
		if (!isValid || isSubmitting) return;
		if (!user?.id) {
			setError("Authentication required to broadcast dispatches");
			return;
		}

		setIsSubmitting(true);
		setError(null);
		triggerHaptic();

		try {
			const authorObj = {
				id: user.id,
				username:
					profile?.username ||
					user.email?.split("@")[0] ||
					"operator",
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
				const cached: Post[] = raw ? JSON.parse(raw) : [];
				const filtered = cached.filter((p) => p.id !== dispatchPost.id);
				await AsyncStorage.setItem(
					STORAGE_POSTS_KEY,
					JSON.stringify([dispatchPost, ...filtered]),
				);
			} catch {}

			triggerHaptic();
			onCreated?.(dispatchPost);
			handleClose();
		} catch (err: unknown) {
			const e = err as Error;
			setError(e?.message || "Failed to broadcast dispatch to the wire");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Modal
			visible={isOpen}
			animationType="slide"
			presentationStyle="fullScreen"
			statusBarTranslucent={true}
			onRequestClose={() => {
				if (!isSubmitting) handleClose();
			}}>
			<View
				style={{ backgroundColor: "#faf9f5", flex: 1 }}
				className="flex-1 bg-background">
				<SafeAreaView
					style={{ backgroundColor: "#faf9f5", flex: 1 }}
					className="flex-1 bg-background"
					edges={["top", "bottom"]}>
					{/* Top Header */}
					<View className="flex-row items-center justify-between border-b-2 border-border bg-background px-4 py-3 shadow-neo-header">
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Cancel"
							onPress={handleClose}
							disabled={isSubmitting}
							className="border-2 border-border bg-surface px-3 py-1.5 shadow-neo-sm active:translate-x-px active:translate-y-px">
							<Text className="font-bold text-xs text-foreground uppercase">
								[ CANCEL ]
							</Text>
						</Pressable>

						<View className="flex-row items-center gap-1.5">
							<Text className="font-display text-lg tracking-wider text-foreground uppercase">
								OFFICIAL DISPATCH
							</Text>
						</View>

						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Broadcast dispatch"
							onPress={handleSubmit}
							disabled={!isValid || isSubmitting}
							className={`flex-row items-center gap-1.5 border-2 border-border bg-primary px-4 py-1.5 shadow-neo-sm ${
								!isValid || isSubmitting
									? "opacity-50"
									: "active:translate-x-px active:translate-y-px"
							}`}>
							{isSubmitting ? (
								<ActivityIndicator size={14} color="#FFFFFF" />
							) : (
								<>
									<Text className="font-bold text-xs tracking-wider text-primary-foreground uppercase">
										BROADCAST
									</Text>
									<Send
										size={13}
										color="#FFFFFF"
										strokeWidth={2.5}
									/>
								</>
							)}
						</Pressable>
					</View>

					<KeyboardAvoidingView
						behavior={Platform.OS === "ios" ? "padding" : undefined}
						className="flex-1">
						<ScrollView
							contentContainerStyle={{
								padding: 16,
								paddingBottom: 40,
							}}
							keyboardShouldPersistTaps="handled"
							className="flex-1">
							{error && (
								<View className="mb-4 flex-row items-center gap-2 border-2 border-border bg-destructive/15 p-3">
									<AlertCircle
										size={16}
										color="#FF2A00"
										strokeWidth={2.5}
									/>
									<Text className="flex-1 font-mono text-xs text-destructive">
										{error}
									</Text>
								</View>
							)}

							{/* Wire Destination Selector */}
							<View className="mb-5">
								<Text className="mb-2 font-bold text-xs tracking-wider text-foreground uppercase">
									TARGET WIRE / DESTINATION
								</Text>

								{isHouseMod ? (
									<View className="flex-row items-center gap-2 border-2 border-border bg-neo-surface-active p-3">
										<Lock
											size={16}
											color="#000000"
											strokeWidth={2.4}
										/>
										<View className="flex-1">
											<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
												LOCKED TO{" "}
												{userGuild?.toUpperCase()}
											</Text>
											<Text className="font-mono text-2xs text-foreground/70">
												House Moderator wire
												authorization locked to your
												assigned house.
											</Text>
										</View>
									</View>
								) : (
									<View className="flex-row flex-wrap gap-2">
										{TARGET_OPTIONS.map((opt) => {
											const isSelected =
												targetGuild === opt.id;
											return (
												<Pressable
													key={String(opt.id)}
													accessibilityRole="radio"
													accessibilityState={{
														selected: isSelected,
													}}
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
														className={`font-bold text-xs tracking-wider uppercase ${
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
									<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
										HEADLINE / TITLE *
									</Text>
									<Text className="font-mono text-2xs text-foreground/60 tabular-nums">
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
									className="border-2 border-border bg-surface px-3 py-2.5 font-bold text-sm text-foreground uppercase shadow-neo-xs"
								/>
							</View>

							{/* Content Input */}
							<View className="mb-4">
								<View className="mb-1.5 flex-row items-center justify-between">
									<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
										DISPATCH CONTENT *
									</Text>
									<Text className="font-mono text-2xs text-foreground/60 tabular-nums">
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
									className="min-h-35 border-2 border-border bg-surface p-3 font-mono text-sm leading-relaxed text-foreground shadow-neo-xs"
								/>
							</View>

							{/* Event Metadata (Optional) */}
							<View className="mb-6 border-2 border-border bg-neo-surface-active p-3">
								<Text className="mb-2.5 font-bold text-xs tracking-wider text-foreground uppercase">
									EVENT SCHEDULE & VENUE (OPTIONAL)
								</Text>

								<View className="mb-3">
									<View className="mb-1 flex-row items-center gap-1.5">
										<Calendar
											size={13}
											color="#000000"
											strokeWidth={2.4}
										/>
										<Text className="font-bold text-2xs tracking-wider text-foreground/80 uppercase">
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
										<MapPin
											size={13}
											color="#000000"
											strokeWidth={2.4}
										/>
										<Text className="font-bold text-2xs tracking-wider text-foreground/80 uppercase">
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
						</ScrollView>
					</KeyboardAvoidingView>
				</SafeAreaView>
			</View>
		</Modal>
	);
}
