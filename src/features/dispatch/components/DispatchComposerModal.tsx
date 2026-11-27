import { useAuthStore } from "@auth/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker, {
	DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
	AlertCircle,
	Calendar,
	Check,
	Image as ImageIcon,
	Lock,
	MapPin,
	Send,
	X,
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
import { createPost, serializePostMediaUrl } from "@/features/posts/api";
import { MentionAutocomplete } from "@/features/posts/components/MentionAutocomplete";
import type { Post } from "@/features/posts/types";
import { formatEventDateTime } from "@/lib/date";
import { validateUploadFileSize } from "@/lib/media-validation";

export interface DispatchComposerModalProps {
	visible: boolean;
	open?: boolean;
	onClose: () => void;
	onCreated?: (dispatch: Post) => void;
}

const STORAGE_POSTS_KEY = "impulse_posts_cache_v2";

const TARGET_OPTIONS: { id: GuildId | null; label: string }[] = [
	{ id: null, label: "GLOBAL WIRE" },
	{ id: "octagram", label: "OCTAGRAM" },
	{ id: "chameleon", label: "CHAMELEON" },
	{ id: "blue_jays", label: "BLUE JAYS" },
];

const triggerHaptic = () => {
	if (Platform.OS !== "web") {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
	}
};

function formatDatetimeLocal(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	const y = date.getFullYear();
	const m = pad(date.getMonth() + 1);
	const d = pad(date.getDate());
	const h = pad(date.getHours());
	const min = pad(date.getMinutes());
	return `${y}-${m}-${d}T${h}:${min}`;
}

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
	const [contentCursor, setContentCursor] = useState<number | undefined>(
		undefined,
	);
	const [eventDate, setEventDate] = useState("");
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [fallbackDate] = useState(() => new Date());
	const [showIosPicker, setShowIosPicker] = useState(false);
	const [mediaUrls, setMediaUrls] = useState<string[]>([]);
	const [eventLocation, setEventLocation] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const resetForm = () => {
		setTargetGuild(isHouseMod ? userGuild : null);
		setTitle("");
		setContent("");
		setEventDate("");
		setSelectedDate(null);
		setShowIosPicker(false);
		setMediaUrls([]);
		setEventLocation("");
		setError(null);
		setIsSubmitting(false);
	};

	const handleClose = () => {
		resetForm();
		onClose();
	};

	const handlePickMedia = async () => {
		try {
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ["images"],
				allowsMultipleSelection: true,
			});
			if (result.canceled || !result.assets?.length) return;

			for (const asset of result.assets) {
				const sizeCheck = validateUploadFileSize(asset.fileSize);
				if (!sizeCheck.valid) {
					triggerHaptic();
					setError(
						sizeCheck.error || "File exceeds the 10 MB size limit.",
					);
					return;
				}
			}

			const validUris = result.assets
				.map((asset) => asset.uri)
				.filter(Boolean);

			if (validUris.length > 0) {
				setMediaUrls((prev) =>
					Array.from(new Set([...prev, ...validUris])),
				);
				setError(null);
				triggerHaptic();
			}
		} catch (err: unknown) {
			const e = err as Error;
			setError(e?.message || "Failed to open image library.");
		}
	};

	const handleRemoveMedia = (index: number) => {
		triggerHaptic();
		setMediaUrls((prev) => prev.filter((_, i) => i !== index));
	};

	const openAndroidDatePicker = () => {
		triggerHaptic();
		const current = selectedDate || new Date();
		DateTimePickerAndroid.open({
			value: current,
			mode: "date",
			is24Hour: false,
			onChange: (event, date) => {
				if (event.type === "set" && date) {
					const pickedDate = date;
					DateTimePickerAndroid.open({
						value: pickedDate,
						mode: "time",
						is24Hour: false,
						onChange: (timeEvent, time) => {
							if (timeEvent.type === "set" && time) {
								const finalDateTime = new Date(pickedDate);
								finalDateTime.setHours(time.getHours());
								finalDateTime.setMinutes(time.getMinutes());
								finalDateTime.setSeconds(0);
								finalDateTime.setMilliseconds(0);
								setSelectedDate(finalDateTime);
								setEventDate(finalDateTime.toISOString());
							} else if (timeEvent.type === "dismissed") {
								setSelectedDate(pickedDate);
								setEventDate(pickedDate.toISOString());
							}
						},
					});
				}
			},
		});
	};

	const openIosDatePicker = () => {
		triggerHaptic();
		if (!selectedDate) {
			const now = new Date();
			setSelectedDate(now);
			setEventDate(now.toISOString());
		}
		setShowIosPicker((prev) => !prev);
	};

	const handleWebDateChange = (val: string) => {
		if (!val) {
			setSelectedDate(null);
			setEventDate("");
			return;
		}
		const d = new Date(val);
		if (!Number.isNaN(d.getTime())) {
			setSelectedDate(d);
			setEventDate(d.toISOString());
		}
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
					image_url: serializePostMediaUrl(mediaUrls),
					image_urls: mediaUrls,
				},
				authorObj,
			);

			const dispatchPost: Post = {
				...created,
				post_type: "dispatch",
				guild: target,
				event_date: eventDate.trim() || null,
				event_location: eventLocation.trim() || null,
				image_url:
					created.image_url || serializePostMediaUrl(mediaUrls),
				image_urls: created.image_urls || mediaUrls,
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
					{/* Clean 3-Slot Header */}
					<View className="flex-row items-center justify-between border-b-2 border-border bg-background px-4 py-3">
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Cancel"
							hitSlop={8}
							onPress={handleClose}
							disabled={isSubmitting}
							className="size-9 items-center justify-center border-2 border-border bg-surface shadow-neo-xs active:translate-x-px active:translate-y-px">
							<X size={16} color="#000000" strokeWidth={2.5} />
						</Pressable>

						<Text className="font-ndot-caps text-base tracking-wider text-foreground uppercase">
							OFFICIAL DISPATCH
						</Text>

						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Broadcast dispatch"
							onPress={handleSubmit}
							disabled={!isValid || isSubmitting}
							className={`h-9 flex-row items-center gap-1.5 border-2 border-border px-3.5 shadow-neo-xs ${
								!isValid || isSubmitting
									? "bg-secondary"
									: "bg-neo-yellow active:translate-x-px active:translate-y-px"
							}`}>
							{isSubmitting ? (
								<ActivityIndicator size={14} color="#000000" />
							) : (
								<>
									<Text
										className={`font-bold text-2xs tracking-widest uppercase ${
											!isValid || isSubmitting
												? "text-muted-foreground"
												: "text-foreground"
										}`}>
										BROADCAST
									</Text>
									<Send
										size={12}
										color={
											!isValid || isSubmitting
												? "#4c4546"
												: "#000000"
										}
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
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled"
							className="flex-1">
							<View className="mx-auto w-full max-w-xl gap-5">
								{error && (
									<View className="flex-row items-center gap-2.5 border-2 border-destructive bg-destructive/10 p-3">
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

								{/* Card 1: Broadcast Destination */}
								<View className="bg-card shadow-neo-sm">
									<View className="overflow-hidden border-2 border-border bg-card">
										<View className="border-b-2 border-border bg-surface px-4 py-2">
											<Text className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
												BROADCAST WIRE
											</Text>
										</View>

										{isHouseMod ? (
											<View className="flex-row items-center gap-3 bg-neo-yellow/25 p-3.5">
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
													<Text className="mt-0.5 font-mono text-2xs text-muted-foreground">
														House Moderator wire
														authorization is scoped
														to your assigned house.
													</Text>
												</View>
											</View>
										) : (
											<View>
												<View className="flex-row border-b-2 border-border">
													{TARGET_OPTIONS.slice(
														0,
														2,
													).map((opt, idx) => {
														const isSelected =
															targetGuild ===
															opt.id;
														return (
															<Pressable
																key={String(
																	opt.id,
																)}
																accessibilityRole="radio"
																accessibilityState={{
																	checked:
																		isSelected,
																}}
																disabled={
																	isSubmitting
																}
																onPress={() => {
																	triggerHaptic();
																	setTargetGuild(
																		opt.id,
																	);
																}}
																className={`h-11 flex-1 flex-row items-center justify-center gap-1.5 ${
																	idx === 0
																		? "border-r-2 border-border"
																		: ""
																} ${
																	isSelected
																		? "bg-primary"
																		: "bg-surface active:bg-secondary"
																}`}>
																{isSelected && (
																	<Check
																		size={
																			13
																		}
																		color="#FFE600"
																		strokeWidth={
																			2.8
																		}
																	/>
																)}
																<Text
																	className={`font-bold text-2xs tracking-widest uppercase ${
																		isSelected
																			? "text-neo-yellow"
																			: "text-foreground"
																	}`}>
																	{opt.label}
																</Text>
															</Pressable>
														);
													})}
												</View>
												<View className="flex-row">
													{TARGET_OPTIONS.slice(
														2,
														4,
													).map((opt, idx) => {
														const isSelected =
															targetGuild ===
															opt.id;
														return (
															<Pressable
																key={String(
																	opt.id,
																)}
																accessibilityRole="radio"
																accessibilityState={{
																	checked:
																		isSelected,
																}}
																disabled={
																	isSubmitting
																}
																onPress={() => {
																	triggerHaptic();
																	setTargetGuild(
																		opt.id,
																	);
																}}
																className={`h-11 flex-1 flex-row items-center justify-center gap-1.5 ${
																	idx === 0
																		? "border-r-2 border-border"
																		: ""
																} ${
																	isSelected
																		? "bg-primary"
																		: "bg-surface active:bg-secondary"
																}`}>
																{isSelected && (
																	<Check
																		size={
																			13
																		}
																		color="#FFE600"
																		strokeWidth={
																			2.8
																		}
																	/>
																)}
																<Text
																	className={`font-bold text-2xs tracking-widest uppercase ${
																		isSelected
																			? "text-neo-yellow"
																			: "text-foreground"
																	}`}>
																	{opt.label}
																</Text>
															</Pressable>
														);
													})}
												</View>
											</View>
										)}
									</View>
								</View>

								{/* Card 2: Dispatch Editor & Media */}
								<View className="bg-card shadow-neo">
									<View className="overflow-hidden border-2 border-border bg-card">
										{/* Headline Strip */}
										<View className="flex-row items-center justify-between border-b-2 border-border bg-surface px-4 py-2">
											<Text className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
												HEADLINE *
											</Text>
											<Text className="font-mono text-2xs text-muted-foreground tabular-nums">
												{title.length}/120
											</Text>
										</View>
										<TextInput
											value={title}
											onChangeText={setTitle}
											maxLength={120}
											editable={!isSubmitting}
											placeholder="OFFICIAL DISPATCH HEADLINE..."
											placeholderTextColor="#888888"
											className="bg-card px-4 py-3 font-display text-xl text-foreground uppercase"
										/>

										{/* Content Strip */}
										<View className="flex-row items-center justify-between border-y-2 border-border bg-surface px-4 py-2">
											<Text className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
												DISPATCH CONTENT *
											</Text>
											<Text className="font-mono text-2xs text-muted-foreground tabular-nums">
												{content.length}/5000
											</Text>
										</View>
										<View className="bg-card px-4 py-3">
											<MentionAutocomplete
												text={content}
												cursorIndex={contentCursor}
												onSelectText={(next) => {
													setContent(next);
													setContentCursor(undefined);
												}}
												className="mb-2.5"
											/>
											<TextInput
												value={content}
												onChangeText={(next) => {
													setContentCursor((prev) =>
														prev !== undefined
															? Math.max(
																	0,
																	prev +
																		(next.length -
																			content.length),
																)
															: undefined,
													);
													setContent(next);
												}}
												onSelectionChange={(e) => {
													const pos =
														e.nativeEvent.selection
															.end;
													setContentCursor(
														pos < content.length
															? pos
															: undefined,
													);
												}}
												maxLength={5000}
												editable={!isSubmitting}
												multiline
												textAlignVertical="top"
												placeholder="Enter official statement, announcement details, or house wire updates..."
												placeholderTextColor="#888888"
												className="min-h-36 font-sans text-sm leading-relaxed text-foreground"
											/>
										</View>

										{/* Attached Media Thumbnails */}
										{mediaUrls.length > 0 && (
											<View className="flex-row flex-wrap gap-2.5 border-t-2 border-border bg-surface p-3">
												{mediaUrls.map((uri, idx) => (
													<View
														key={uri}
														className="relative size-18 border-2 border-border bg-card">
														<ExpoImage
															source={{ uri }}
															style={{
																width: "100%",
																height: "100%",
															}}
															contentFit="cover"
														/>
														<Pressable
															accessibilityRole="button"
															accessibilityLabel={`Remove media ${idx + 1}`}
															onPress={() =>
																handleRemoveMedia(
																	idx,
																)
															}
															className="absolute -top-1.5 -right-1.5 border border-border bg-destructive p-0.5">
															<X
																size={10}
																color="#FFFFFF"
																strokeWidth={
																	2.5
																}
															/>
														</Pressable>
													</View>
												))}
											</View>
										)}

										{/* Docked Media Attach Bar */}
										<Pressable
											accessibilityRole="button"
											accessibilityLabel="Attach media image"
											disabled={isSubmitting}
											onPress={handlePickMedia}
											className="h-11 flex-row items-center justify-between border-t-2 border-border bg-surface px-4 active:bg-secondary">
											<View className="flex-row items-center gap-2">
												<ImageIcon
													size={15}
													color="#000000"
													strokeWidth={2.4}
												/>
												<Text className="font-bold text-2xs tracking-widest text-foreground uppercase">
													{mediaUrls.length > 0
														? "ATTACH MORE IMAGES"
														: "ATTACH IMAGES (MAX 10 MB)"}
												</Text>
											</View>
											<Text className="font-mono text-2xs text-muted-foreground tabular-nums">
												{mediaUrls.length}{" "}
												{mediaUrls.length === 1
													? "FILE"
													: "FILES"}
											</Text>
										</Pressable>
									</View>
								</View>

								{/* Card 3: Event Schedule & Venue (Optional) */}
								<View className="bg-card shadow-neo-sm">
									<View className="overflow-hidden border-2 border-border bg-card">
										<View className="border-b-2 border-border bg-surface px-4 py-2">
											<Text className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
												EVENT SCHEDULE &amp; VENUE
												(OPTIONAL)
											</Text>
										</View>

										<View className="bg-card p-4">
											<View className="mb-3">
												<View className="mb-1.5 flex-row items-center gap-1.5">
													<Calendar
														size={13}
														color="#000000"
														strokeWidth={2.4}
													/>
													<Text className="font-bold text-2xs tracking-wider text-foreground/80 uppercase">
														EVENT DATE / TIME
													</Text>
												</View>

												{Platform.OS === "web" ? (
													<View className="border border-border bg-surface p-2 shadow-neo-xs">
														<input
															type="datetime-local"
															value={
																selectedDate
																	? formatDatetimeLocal(
																			selectedDate,
																		)
																	: ""
															}
															onChange={(
																e: any,
															) =>
																handleWebDateChange(
																	e.target
																		.value,
																)
															}
															style={{
																width: "100%",
																padding:
																	"8px 10px",
																fontFamily:
																	"monospace",
																fontSize:
																	"12px",
																fontWeight:
																	"bold",
																border: "1px solid #000000",
																backgroundColor:
																	"#FAF9F5",
																color: "#000000",
																borderRadius: 0,
																outline: "none",
																boxSizing:
																	"border-box",
																textTransform:
																	"uppercase",
															}}
														/>
														{selectedDate && (
															<Pressable
																accessibilityRole="button"
																accessibilityLabel="Clear event date"
																onPress={() => {
																	triggerHaptic();
																	setSelectedDate(
																		null,
																	);
																	setEventDate(
																		"",
																	);
																}}
																className="mt-2 self-start border border-border bg-destructive/10 px-2 py-1 shadow-neo-xs active:translate-x-px active:translate-y-px">
																<Text className="font-bold text-2xs text-destructive uppercase">
																	[ CLEAR DATE
																	]
																</Text>
															</Pressable>
														)}
													</View>
												) : selectedDate ? (
													<View className="border border-border bg-surface p-2.5 shadow-neo-xs">
														<View className="flex-row items-center justify-between">
															<View className="flex-1 pr-2">
																<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
																	{formatEventDateTime(
																		selectedDate.toISOString(),
																	)}
																</Text>
															</View>
															<View className="flex-row items-center gap-1.5">
																<Pressable
																	accessibilityRole="button"
																	accessibilityLabel="Edit date"
																	disabled={
																		isSubmitting
																	}
																	onPress={() => {
																		if (
																			Platform.OS ===
																			"android"
																		) {
																			openAndroidDatePicker();
																		} else {
																			openIosDatePicker();
																		}
																	}}
																	className="border border-border bg-surface px-2.5 py-1 shadow-neo-xs active:translate-x-px active:translate-y-px">
																	<Text className="font-bold text-2xs text-foreground uppercase">
																		[ EDIT ]
																	</Text>
																</Pressable>
																<Pressable
																	accessibilityRole="button"
																	accessibilityLabel="Clear date"
																	disabled={
																		isSubmitting
																	}
																	onPress={() => {
																		triggerHaptic();
																		setSelectedDate(
																			null,
																		);
																		setEventDate(
																			"",
																		);
																		setShowIosPicker(
																			false,
																		);
																	}}
																	className="border border-border bg-destructive/10 px-2.5 py-1 shadow-neo-xs active:translate-x-px active:translate-y-px">
																	<Text className="font-bold text-2xs text-destructive uppercase">
																		[ CLEAR
																		]
																	</Text>
																</Pressable>
															</View>
														</View>
													</View>
												) : (
													<Pressable
														accessibilityRole="button"
														accessibilityLabel="Select event date and time"
														disabled={isSubmitting}
														onPress={() => {
															if (
																Platform.OS ===
																"android"
															) {
																openAndroidDatePicker();
															} else {
																openIosDatePicker();
															}
														}}
														className="flex-row items-center justify-between border border-border bg-surface px-3 py-2.5 shadow-neo-xs active:translate-x-px active:translate-y-px">
														<Text className="font-mono text-xs text-foreground/60 uppercase">
															SELECT EVENT DATE &
															TIME...
														</Text>
														<Text className="font-bold text-2xs text-primary uppercase">
															[ PICK DATE ]
														</Text>
													</Pressable>
												)}

												{Platform.OS === "ios" &&
													showIosPicker && (
														<View className="mt-2 border-2 border-border bg-surface p-2.5 shadow-neo-xs">
															<View className="mb-2 flex-row items-center justify-between border-b border-border pb-1.5">
																<Text className="font-bold text-2xs tracking-wider text-foreground uppercase">
																	SELECT DATE
																	& TIME
																</Text>
																<Pressable
																	accessibilityRole="button"
																	accessibilityLabel="Confirm date"
																	onPress={() =>
																		setShowIosPicker(
																			false,
																		)
																	}
																	className="border border-border bg-primary px-3 py-1 shadow-neo-xs active:translate-x-px active:translate-y-px">
																	<Text className="font-bold text-2xs tracking-wider text-primary-foreground uppercase">
																		DONE
																	</Text>
																</Pressable>
															</View>
															<DateTimePicker
																value={
																	selectedDate ||
																	fallbackDate
																}
																mode="datetime"
																display="spinner"
																themeVariant="light"
																onChange={(
																	_event,
																	date,
																) => {
																	if (date) {
																		setSelectedDate(
																			date,
																		);
																		setEventDate(
																			date.toISOString(),
																		);
																	}
																}}
															/>
														</View>
													)}
											</View>

											<View>
												<View className="mb-1.5 flex-row items-center gap-1.5">
													<MapPin
														size={13}
														color="#000000"
														strokeWidth={2.4}
													/>
													<Text className="font-bold text-2xs tracking-widest text-foreground uppercase">
														EVENT VENUE / LOCATION
													</Text>
												</View>
												<TextInput
													value={eventLocation}
													onChangeText={
														setEventLocation
													}
													maxLength={100}
													editable={!isSubmitting}
													placeholder="e.g. MAIN AUDITORIUM / STAGE 01"
													placeholderTextColor="#888888"
													className="border-2 border-border bg-surface px-3 py-2.5 font-mono text-xs text-foreground"
												/>
											</View>
										</View>
									</View>
								</View>
							</View>
						</ScrollView>
					</KeyboardAvoidingView>
				</SafeAreaView>
			</View>
		</Modal>
	);
}
