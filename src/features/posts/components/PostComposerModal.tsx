import { useAuthStore } from "@auth/store";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
	AlertCircle,
	AlertTriangle,
	Camera,
	Check,
	Code2,
	CornerDownLeft,
	Globe,
	Image as ImageIcon,
	Plus,
	Shield,
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
	TextInput,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NeoButton } from "@/components/ui";
import { toast } from "@/lib/toast";

import {
	createPost,
	isAllowedPostMediaAsset,
	normalizePostMedia,
	normalizePostTags,
	resolvePostGuild,
	serializePostMediaUrl,
	updatePost,
} from "../api";
import type { ComposerTray } from "../store";
import type { CreatePostInput, Post, PostVisibility } from "../types";
import {
	clearPostDraft,
	hasPostDraftContent,
	isPostEditDirty,
	loadPostDraft,
	savePostDraft,
} from "../utils/drafts";
import { MentionAutocomplete } from "./MentionAutocomplete";

export interface PostComposerModalProps {
	open?: boolean;
	visible?: boolean;
	onOpenChange?: (open: boolean) => void;
	onClose?: () => void;
	onPostCreated?: (post: Post) => void;
	onPostUpdated?: (post: Post) => void;
	onCreated?: (post: Post) => void;
	editingPost?: Post | null;
	initialPost?: Post | null;
	initialTray?: ComposerTray | null;
}

const CODE_LANGUAGES = ["C", "TS", "PY", "JAVA", "SQL"];

export function PostComposerModal({
	open,
	visible,
	onOpenChange,
	onClose,
	onPostCreated,
	onPostUpdated,
	onCreated,
	editingPost = null,
	initialPost = null,
	initialTray = null,
}: PostComposerModalProps) {
	const isOpen = open ?? visible ?? false;
	const handleClose = () => {
		onOpenChange?.(false);
		onClose?.();
	};

	const currentEditPost = editingPost || initialPost || null;
	const isEditing = Boolean(currentEditPost);

	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);

	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [contentCursor, setContentCursor] = useState<number | undefined>(
		undefined,
	);
	const [visibility, setVisibility] = useState<PostVisibility>("public");
	const [activeTray, setActiveTray] = useState<"code" | "media" | null>(null);
	const [codeSnippet, setCodeSnippet] = useState("");
	const [codeLanguage, setCodeLanguage] = useState("TS");
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const [tagInput, setTagInput] = useState("");
	const [isAddingTag, setIsAddingTag] = useState(false);
	const [mediaUrls, setMediaUrls] = useState<string[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [draftRestored, setDraftRestored] = useState(false);
	const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

	const isDraftHydratedRef = useRef(false);
	const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const isEditingOtherUser = Boolean(
		currentEditPost && user?.id && currentEditPost.author_id !== user.id,
	);
	const effectiveGuild = resolvePostGuild(
		currentEditPost?.guild,
		currentEditPost?.author?.guild,
		profile?.guild,
		isEditingOtherUser,
	);

	const resetComposerFields = (tray: ComposerTray | null = null) => {
		setTitle("");
		setContent("");
		setVisibility("public");
		setActiveTray(tray);
		setCodeSnippet("");
		setCodeLanguage("TS");
		setSelectedTags([]);
		setMediaUrls([]);
		setTagInput("");
		setIsAddingTag(false);
		setDraftRestored(false);
	};

	useEffect(() => {
		if (!isOpen) {
			isDraftHydratedRef.current = false;
			if (autosaveTimerRef.current) {
				clearTimeout(autosaveTimerRef.current);
				autosaveTimerRef.current = null;
			}
			queueMicrotask(() => {
				setCloseConfirmOpen(false);
			});
			return;
		}

		let cancelled = false;

		if (currentEditPost) {
			isDraftHydratedRef.current = true;
			queueMicrotask(() => {
				if (cancelled) return;
				setError(null);
				setTagInput("");
				setIsAddingTag(false);
				setCloseConfirmOpen(false);
				setDraftRestored(false);
				setTitle(currentEditPost.title || "");
				setContent(currentEditPost.content || "");
				setVisibility(currentEditPost.visibility || "public");
				const hasCode = Boolean(currentEditPost.code_snippet?.trim());
				if (hasCode) {
					setActiveTray("code");
					setCodeSnippet(currentEditPost.code_snippet || "");
					setCodeLanguage(
						(currentEditPost.code_language || "RUST").toUpperCase(),
					);
				} else {
					setCodeSnippet("");
					setCodeLanguage("TS");
				}
				setSelectedTags(normalizePostTags(currentEditPost.tags));
				const media = normalizePostMedia(currentEditPost);
				setMediaUrls(media);
				if (media.length > 0 && !hasCode) {
					setActiveTray("media");
				} else if (!hasCode) {
					setActiveTray(null);
				}
			});
		} else {
			isDraftHydratedRef.current = false;
			void loadPostDraft().then((saved) => {
				if (cancelled) return;
				setError(null);
				setTagInput("");
				setIsAddingTag(false);
				setCloseConfirmOpen(false);
				if (saved) {
					setTitle(saved.title);
					setContent(saved.content);
					setVisibility(saved.visibility);
					setCodeSnippet(saved.codeSnippet);
					setCodeLanguage(saved.codeLanguage);
					setSelectedTags(saved.selectedTags);
					setMediaUrls(saved.mediaUrls);
					setActiveTray(saved.activeTray ?? initialTray);
					setDraftRestored(true);
				} else {
					resetComposerFields(initialTray);
				}
				isDraftHydratedRef.current = true;
			});
		}

		return () => {
			cancelled = true;
		};
	}, [isOpen, currentEditPost, initialTray]);

	useEffect(() => {
		if (!isOpen || isEditing || !isDraftHydratedRef.current) return;

		if (autosaveTimerRef.current) {
			clearTimeout(autosaveTimerRef.current);
		}
		autosaveTimerRef.current = setTimeout(() => {
			void savePostDraft({
				title,
				content,
				visibility,
				codeSnippet,
				codeLanguage,
				selectedTags,
				mediaUrls,
				activeTray,
			});
		}, 400);

		return () => {
			if (autosaveTimerRef.current) {
				clearTimeout(autosaveTimerRef.current);
				autosaveTimerRef.current = null;
			}
		};
	}, [
		isOpen,
		isEditing,
		title,
		content,
		visibility,
		codeSnippet,
		codeLanguage,
		selectedTags,
		mediaUrls,
		activeTray,
	]);

	const handleRequestClose = () => {
		if (isSubmitting) return;
		if (isEditing && currentEditPost) {
			const dirty = isPostEditDirty(
				{
					title,
					content,
					visibility,
					codeSnippet,
					codeLanguage,
					selectedTags,
					mediaUrls,
				},
				currentEditPost,
			);
			if (dirty) {
				setCloseConfirmOpen(true);
				return;
			}
			handleClose();
			return;
		}

		const hasContent = hasPostDraftContent({
			title,
			content,
			codeSnippet,
			selectedTags,
			mediaUrls,
		});
		if (hasContent) {
			setCloseConfirmOpen(true);
			return;
		}
		if (autosaveTimerRef.current) {
			clearTimeout(autosaveTimerRef.current);
			autosaveTimerRef.current = null;
		}
		void clearPostDraft();
		handleClose();
	};

	const handleKeepDraft = async () => {
		if (autosaveTimerRef.current) {
			clearTimeout(autosaveTimerRef.current);
			autosaveTimerRef.current = null;
		}
		await savePostDraft({
			title,
			content,
			visibility,
			codeSnippet,
			codeLanguage,
			selectedTags,
			mediaUrls,
			activeTray,
		});
		setCloseConfirmOpen(false);
		handleClose();
		toast.info("Draft saved");
	};

	const handleDiscardAndClose = async () => {
		if (autosaveTimerRef.current) {
			clearTimeout(autosaveTimerRef.current);
			autosaveTimerRef.current = null;
		}
		if (!isEditing) {
			await clearPostDraft();
			resetComposerFields(null);
		}
		setCloseConfirmOpen(false);
		handleClose();
	};

	const commitTag = (rawText: string) => {
		const normalized = rawText
			.trim()
			.toLowerCase()
			.replace(/^#+/, "")
			.replace(/[^a-z0-9_-]/g, "");

		if (normalized.length >= 2 && normalized.length <= 24) {
			const formattedTag = `#${normalized.toUpperCase()}`;
			if (
				!selectedTags.includes(formattedTag) &&
				selectedTags.length < 5
			) {
				setSelectedTags((prev) => [...prev, formattedTag]);
			}
		}
		setTagInput("");
		setIsAddingTag(false);
	};

	const pickMedia = async () => {
		try {
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ["images"],
				allowsMultipleSelection: true,
			});
			if (result.canceled || !result.assets?.length) return;

			const validUris = result.assets
				.filter((asset) => isAllowedPostMediaAsset(asset))
				.map((asset) => asset.uri)
				.filter(Boolean);

			if (validUris.length > 0) {
				setMediaUrls((prev) =>
					Array.from(new Set([...prev, ...validUris])),
				);
				setActiveTray("media");
			}
		} catch (err: unknown) {
			setError((err as Error).message || "Unable to open media library.");
		}
	};

	const takePhoto = async () => {
		try {
			const perm = await ImagePicker.requestCameraPermissionsAsync();
			if (!perm.granted) {
				setError("Camera permission is required to take a photo.");
				return;
			}
			const result = await ImagePicker.launchCameraAsync({
				mediaTypes: ["images"],
				quality: 0.85,
			});
			if (result.canceled || !result.assets?.length) return;

			const validUris = result.assets
				.filter((asset) => isAllowedPostMediaAsset(asset))
				.map((asset) => asset.uri)
				.filter(Boolean);

			if (validUris.length > 0) {
				setMediaUrls((prev) =>
					Array.from(new Set([...prev, ...validUris])),
				);
				setActiveTray("media");
			}
		} catch (err: unknown) {
			setError((err as Error).message || "Unable to open camera.");
		}
	};

	const handleSubmit = async () => {
		if (isSubmitting) return;

		if (!title.trim() || !content.trim() || !user?.id) {
			setError("Post title and content cannot be blank.");
			return;
		}

		if (title.trim().length > 120) {
			setError("Post title cannot exceed 120 characters.");
			return;
		}

		if (content.trim().length > 5000) {
			setError("Post content cannot exceed 5,000 characters.");
			return;
		}

		if (visibility === "house" && !effectiveGuild) {
			setError(
				"House affiliation required before sending house-only posts.",
			);
			return;
		}

		setIsSubmitting(true);
		setError(null);

		const hasActiveCode = activeTray === "code" && codeSnippet.trim();
		const input: CreatePostInput = {
			title: title.trim(),
			content: content.trim(),
			visibility,
			guild:
				visibility === "house"
					? effectiveGuild
					: effectiveGuild || null,
			code_snippet: hasActiveCode ? codeSnippet.trim() : null,
			code_language: hasActiveCode ? codeLanguage.toLowerCase() : null,
			image_url: serializePostMediaUrl(mediaUrls),
			image_urls: mediaUrls,
			tags: selectedTags,
		};

		try {
			if (currentEditPost) {
				const updated = await updatePost(currentEditPost.id, input);
				onPostUpdated?.(updated);
				onCreated?.(updated);
				handleClose();
				toast.success("Saved");
			} else {
				const fallbackHandle =
					profile?.username || user.email?.split("@")[0] || "0xKAI";
				const newPost = await createPost(input, {
					id: user.id,
					username: fallbackHandle,
					display_name: profile?.display_name || fallbackHandle,
					avatar_url: profile?.avatar_url || null,
					email: profile?.email || user.email,
					role: profile?.role || "user",
					guild: profile?.guild || null,
				});
				if (autosaveTimerRef.current) {
					clearTimeout(autosaveTimerRef.current);
					autosaveTimerRef.current = null;
				}
				await clearPostDraft();
				resetComposerFields(null);
				onPostCreated?.(newPost);
				onCreated?.(newPost);
				handleClose();
				toast.success("Post published");
			}
		} catch (err: unknown) {
			setError(
				(err as Error).message ||
					"Failed to publish post across network.",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const mediaActive = activeTray === "media" || mediaUrls.length > 0;
	const traySlots = [
		{
			key: "code" as const,
			title: "CODE SNIPPET",
			sub: `${(codeLanguage || "TS").toUpperCase()} // ${codeSnippet.length} CHAR`,
			icon: Code2,
			active: activeTray === "code",
			iconColor: activeTray === "code" ? "#00FF66" : "#000000",
			subClass: "text-neo-green",
			onPress: () => setActiveTray(activeTray === "code" ? null : "code"),
		},
		{
			key: "media" as const,
			title: "GALLERY",
			sub:
				mediaUrls.length > 0
					? `${mediaUrls.length} SELECTED`
					: "PNG, JPG, WEBP",
			icon: ImageIcon,
			active: mediaActive,
			iconColor: mediaActive ? "#FF007A" : "#000000",
			subClass: "text-neo-magenta",
			onPress: () => {
				void pickMedia();
			},
		},
		{
			key: "camera" as const,
			title: "TAKE PHOTO",
			sub: "CAMERA CAPTURE",
			icon: Camera,
			active: false,
			iconColor: "#000000",
			subClass: "text-neo-cyan",
			onPress: () => {
				void takePhoto();
			},
		},
	];

	const isSubmitDisabled =
		isSubmitting ||
		!title.trim() ||
		!content.trim() ||
		title.length > 120 ||
		content.length > 5000;

	return (
		<Modal
			visible={isOpen}
			animationType="slide"
			presentationStyle="fullScreen"
			statusBarTranslucent={true}
			onRequestClose={handleRequestClose}>
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
							onPress={handleRequestClose}
							className="size-9 items-center justify-center border-2 border-border bg-surface shadow-neo-xs active:translate-x-px active:translate-y-px">
							<X size={16} color="#000000" strokeWidth={2.5} />
						</Pressable>

						<View className="items-center">
							<Text className="font-ndot-caps text-base tracking-wider text-foreground uppercase">
								{isEditing ? "EDIT POST" : "CREATE POST"}
							</Text>
							{draftRestored && !isEditing ? (
								<View className="mt-0.5 border border-border bg-neo-yellow px-1.5 py-0.5">
									<Text className="font-bold text-3xs tracking-widest text-foreground uppercase">
										DRAFT RESTORED
									</Text>
								</View>
							) : null}
						</View>

						<Pressable
							accessibilityRole="button"
							accessibilityLabel={
								isEditing ? "Save post" : "Publish post"
							}
							onPress={handleSubmit}
							disabled={isSubmitDisabled}
							className={`h-9 flex-row items-center gap-1.5 border-2 border-border px-3.5 shadow-neo-xs ${
								isSubmitDisabled
									? "bg-secondary"
									: "bg-neo-green active:translate-x-px active:translate-y-px"
							}`}>
							{isSubmitting ? (
								<ActivityIndicator size={14} color="#000000" />
							) : (
								<>
									<Text
										className={`font-bold text-2xs tracking-widest uppercase ${
											isSubmitDisabled
												? "text-muted-foreground"
												: "text-foreground"
										}`}>
										{isEditing ? "SAVE" : "PUBLISH"}
									</Text>
									<CornerDownLeft
										size={13}
										color={
											isSubmitDisabled
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
						style={{ flex: 1 }}
						className="flex-1">
						<ScrollView
							style={{ flex: 1 }}
							className="flex-1"
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled"
							contentContainerStyle={{
								flexGrow: 1,
								padding: 16,
								paddingBottom: 40,
							}}>
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

								{/* Target Audience Segmented Bar */}
								<View className="bg-surface shadow-neo-sm">
									<View className="flex-row items-stretch overflow-hidden border-2 border-border bg-surface">
										<Pressable
											accessibilityRole="radio"
											accessibilityState={{
												checked:
													visibility === "public",
											}}
											onPress={() =>
												setVisibility("public")
											}
											className={`h-11 flex-1 flex-row items-center justify-center gap-2 border-r-2 border-border ${
												visibility === "public"
													? "bg-primary"
													: "bg-surface active:bg-secondary"
											}`}>
											<Globe
												size={14}
												color={
													visibility === "public"
														? "#faf9f5"
														: "#000000"
												}
												strokeWidth={2.4}
											/>
											<Text
												className={`font-bold text-xs tracking-widest uppercase ${
													visibility === "public"
														? "text-primary-foreground"
														: "text-foreground"
												}`}>
												PUBLIC
											</Text>
										</Pressable>

										<Pressable
											accessibilityRole="radio"
											accessibilityState={{
												checked: visibility === "house",
											}}
											onPress={() =>
												setVisibility("house")
											}
											className={`h-11 flex-1 flex-row items-center justify-center gap-2 ${
												visibility === "house"
													? "bg-primary"
													: "bg-surface active:bg-secondary"
											}`}>
											<Shield
												size={14}
												color={
													visibility === "house"
														? "#00FF66"
														: "#000000"
												}
												strokeWidth={2.4}
											/>
											<Text
												className={`font-bold text-xs tracking-widest uppercase ${
													visibility === "house"
														? "text-neo-green"
														: "text-foreground"
												}`}>
												HOUSE-ONLY
											</Text>
										</Pressable>
									</View>
								</View>

								{/* Unified Editor Card */}
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
											placeholder="ENTER POST TITLE..."
											placeholderTextColor="#888888"
											className="bg-card px-4 py-3 font-display text-xl text-foreground uppercase"
										/>

										{/* Content Strip */}
										<View className="flex-row items-center justify-between border-y-2 border-border bg-surface px-4 py-2">
											<Text className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
												CONTENT *
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
												multiline
												textAlignVertical="top"
												placeholder="Write your post content here... Use @ to mention someone."
												placeholderTextColor="#888888"
												className="min-h-40 font-sans text-sm leading-relaxed text-foreground"
											/>
										</View>

										{/* Code Snippet Tray */}
										{activeTray === "code" && (
											<View className="border-t-2 border-border bg-primary p-3.5">
												<View className="mb-2.5 flex-row flex-wrap items-center justify-between gap-2">
													<View className="flex-row flex-wrap gap-1">
														{CODE_LANGUAGES.map(
															(lang) => (
																<Pressable
																	key={lang}
																	onPress={() =>
																		setCodeLanguage(
																			lang,
																		)
																	}
																	className={`border px-2 py-0.5 ${
																		codeLanguage ===
																		lang
																			? "border-white bg-surface"
																			: "border-white/35 bg-transparent"
																	}`}>
																	<Text
																		className={`font-bold text-3xs ${
																			codeLanguage ===
																			lang
																				? "text-foreground"
																				: "text-primary-foreground"
																		}`}>
																		{lang}
																	</Text>
																</Pressable>
															),
														)}
													</View>
													<Pressable
														accessibilityRole="button"
														accessibilityLabel="Close code tray"
														onPress={() =>
															setActiveTray(null)
														}
														hitSlop={8}>
														<X
															size={14}
															color="#faf9f5"
															strokeWidth={2.5}
														/>
													</Pressable>
												</View>
												<TextInput
													value={codeSnippet}
													onChangeText={
														setCodeSnippet
													}
													multiline
													placeholder="// paste code snippet..."
													placeholderTextColor="#71717a"
													textAlignVertical="top"
													className="min-h-24 border border-white/25 p-2.5 font-code text-xs text-neo-green"
												/>
											</View>
										)}

										{/* Attached Media Strip */}
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
															accessibilityLabel={`Remove image ${idx + 1}`}
															onPress={() => {
																const next =
																	mediaUrls.filter(
																		(
																			_,
																			i,
																		) =>
																			i !==
																			idx,
																	);
																setMediaUrls(
																	next,
																);
																if (
																	next.length ===
																		0 &&
																	activeTray ===
																		"media"
																) {
																	setActiveTray(
																		null,
																	);
																}
															}}
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

										{/* Docked Attachment Toolbar */}
										<View className="flex-row items-stretch border-t-2 border-border bg-surface">
											{traySlots.map((slot, idx) => {
												const Icon = slot.icon;
												return (
													<Pressable
														key={slot.key}
														accessibilityRole="button"
														accessibilityLabel={
															slot.title
														}
														onPress={slot.onPress}
														className={`h-11 flex-1 flex-row items-center justify-center gap-1.5 ${
															idx <
															traySlots.length - 1
																? "border-r-2 border-border"
																: ""
														} ${
															slot.active
																? "bg-primary"
																: "bg-surface active:bg-secondary"
														}`}>
														<Icon
															size={14}
															color={
																slot.iconColor
															}
															strokeWidth={2.4}
														/>
														<Text
															className={`font-bold text-3xs tracking-widest uppercase ${
																slot.active
																	? "text-primary-foreground"
																	: "text-foreground"
															}`}>
															{slot.key === "code"
																? "CODE"
																: slot.key ===
																	  "media"
																	? `MEDIA${mediaUrls.length > 0 ? ` (${mediaUrls.length})` : ""}`
																	: "CAMERA"}
														</Text>
													</Pressable>
												);
											})}
										</View>
									</View>
								</View>

								{/* Tags Card */}
								<View className="bg-card shadow-neo-sm">
									<View className="overflow-hidden border-2 border-border bg-card">
										<View className="flex-row items-center justify-between border-b-2 border-border bg-surface px-4 py-2">
											<Text className="font-mono text-2xs tracking-widest text-muted-foreground uppercase">
												TAGS
											</Text>
											<Text className="font-mono text-2xs text-muted-foreground tabular-nums">
												{selectedTags.length}/5
											</Text>
										</View>

										<View className="flex-row flex-wrap items-center gap-2 bg-card p-3">
											{selectedTags.map((tag) => (
												<Pressable
													key={tag}
													accessibilityRole="button"
													accessibilityLabel={`Remove tag ${tag}`}
													onPress={() =>
														setSelectedTags(
															(prev) =>
																prev.filter(
																	(t) =>
																		t !==
																		tag,
																),
														)
													}
													className="flex-row items-center gap-1.5 border border-border bg-surface px-2.5 py-1 active:bg-destructive/15">
													<Text className="font-bold text-2xs tracking-wider text-foreground uppercase">
														#{tag}
													</Text>
													<X
														size={11}
														color="#000000"
														strokeWidth={2.5}
													/>
												</Pressable>
											))}

											{isAddingTag ? (
												<View className="flex-row items-center gap-1 border-2 border-border bg-surface px-2.5 py-1">
													<TextInput
														value={tagInput}
														onChangeText={
															setTagInput
														}
														onSubmitEditing={() =>
															commitTag(tagInput)
														}
														autoFocus
														placeholder="TAG_NAME"
														placeholderTextColor="#888888"
														className="min-w-20 font-bold text-2xs text-foreground uppercase"
													/>
													<Pressable
														accessibilityRole="button"
														accessibilityLabel="Confirm tag"
														onPress={() =>
															commitTag(tagInput)
														}>
														<Check
															size={13}
															color="#000000"
															strokeWidth={3}
														/>
													</Pressable>
												</View>
											) : (
												selectedTags.length < 5 && (
													<Pressable
														accessibilityRole="button"
														accessibilityLabel="Add tag"
														onPress={() =>
															setIsAddingTag(true)
														}
														className="flex-row items-center gap-1 border border-dashed border-border bg-surface px-2.5 py-1 active:bg-neo-green">
														<Plus
															size={12}
															color="#000000"
															strokeWidth={2.5}
														/>
														<Text className="font-bold text-2xs tracking-widest text-foreground uppercase">
															ADD TAG
														</Text>
													</Pressable>
												)
											)}
										</View>
									</View>
								</View>
							</View>
						</ScrollView>
					</KeyboardAvoidingView>
				</SafeAreaView>

				{closeConfirmOpen ? (
					<View className="absolute inset-0 z-50 justify-end bg-black/50">
						<Pressable
							className="flex-1"
							onPress={() => setCloseConfirmOpen(false)}
						/>
						<View className="border-x-2 border-t-2 border-border bg-background p-5 shadow-neo-lg">
							<View className="mb-4 flex-row items-start gap-3">
								<View className="size-10 items-center justify-center border-2 border-border bg-card shadow-neo-sm">
									<AlertTriangle
										size={20}
										color="#ff2a00"
										strokeWidth={2.5}
									/>
								</View>
								<View className="flex-1 pr-2">
									<Text className="font-ndot-caps text-base tracking-wide text-foreground uppercase">
										{isEditing
											? "DISCARD UNSAVED CHANGES?"
											: "UNSAVED POST DRAFT"}
									</Text>
									<Text className="mt-1 font-mono text-xs leading-relaxed text-muted-foreground">
										{isEditing
											? "Your edits to this post have not been saved yet."
											: "Save your draft to continue later, or discard it permanently."}
									</Text>
								</View>
							</View>

							<View className="gap-2.5">
								{!isEditing ? (
									<NeoButton
										variant="primary"
										size="lg"
										className="w-full"
										onPress={() => void handleKeepDraft()}>
										KEEP DRAFT
									</NeoButton>
								) : null}
								<NeoButton
									variant="destructive"
									size="lg"
									className="w-full"
									onPress={() =>
										void handleDiscardAndClose()
									}>
									{isEditing ? "DISCARD CHANGES" : "DISCARD"}
								</NeoButton>
								<NeoButton
									variant="outline"
									size="lg"
									className="w-full"
									onPress={() => setCloseConfirmOpen(false)}>
									KEEP EDITING
								</NeoButton>
							</View>
						</View>
					</View>
				) : null}
			</View>
		</Modal>
	);
}
