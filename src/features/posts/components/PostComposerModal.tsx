import { useAuthStore } from "@auth/store";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
	AlertCircle,
	Check,
	Code2,
	CornerDownLeft,
	Globe,
	Image as ImageIcon,
	Plus,
	Shield,
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
	useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
	const { width, height } = useWindowDimensions();
	const isDesktop = Platform.OS === "web" && width >= 1024;
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

	const isEditingOtherUser = Boolean(
		currentEditPost && user?.id && currentEditPost.author_id !== user.id,
	);
	const effectiveGuild = resolvePostGuild(
		currentEditPost?.guild,
		currentEditPost?.author?.guild,
		profile?.guild,
		isEditingOtherUser,
	);

	useEffect(() => {
		if (!isOpen) return;
		queueMicrotask(() => {
			setError(null);
			setTagInput("");
			setIsAddingTag(false);

			if (currentEditPost) {
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
				}
				setSelectedTags(normalizePostTags(currentEditPost.tags));
				const media = normalizePostMedia(currentEditPost);
				setMediaUrls(media);
				if (media.length > 0 && !hasCode) {
					setActiveTray("media");
				}
			} else {
				setTitle("");
				setContent("");
				setVisibility("public");
				setActiveTray(initialTray);
				setCodeSnippet("");
				setCodeLanguage("TS");
				setSelectedTags([]);
				setMediaUrls([]);
			}
		});
	}, [isOpen, currentEditPost, initialTray]);

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
				onPostCreated?.(newPost);
				onCreated?.(newPost);
			}
			handleClose();
		} catch (err: unknown) {
			setError(
				(err as Error).message ||
					"Failed to publish post across network.",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const attachedCount =
		(activeTray === "code" && codeSnippet.trim() ? 1 : 0) +
		mediaUrls.length;

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
			title: "MEDIA",
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
	];

	return (
		<Modal
			visible={isOpen}
			animationType={isDesktop ? "fade" : "slide"}
			transparent={isDesktop}
			presentationStyle={isDesktop ? "overFullScreen" : "fullScreen"}
			statusBarTranslucent={true}
			onRequestClose={handleClose}>
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
									maxWidth: 1120,
									height: Math.min(height * 0.92, 900),
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
					<View
						className={`flex-row items-center justify-between border-b-2 border-border bg-background px-4 shadow-neo-header ${
							isDesktop ? "py-2.5" : "py-3"
						}`}>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Cancel"
							onPress={handleClose}
							className="border-2 border-border bg-surface px-3 py-1.5 shadow-neo-sm active:translate-x-px active:translate-y-px">
							<Text className="font-bold text-xs text-foreground uppercase">
								[ CANCEL ]
							</Text>
						</Pressable>

						<View pointerEvents="none" className="items-center">
							<Text className="font-display text-lg tracking-wider text-foreground uppercase">
								{isEditing ? "EDIT POST" : "CREATE POST"}
							</Text>
						</View>

						<Pressable
							accessibilityRole="button"
							accessibilityLabel={
								isEditing ? "Save post" : "Publish post"
							}
							onPress={handleSubmit}
							disabled={
								isSubmitting ||
								!title.trim() ||
								!content.trim() ||
								title.length > 120 ||
								content.length > 5000
							}
							className={`flex-row items-center gap-1.5 border-2 border-border bg-primary px-4 py-1.5 shadow-neo-sm ${
								isSubmitting ||
								!title.trim() ||
								!content.trim() ||
								title.length > 120 ||
								content.length > 5000
									? "opacity-50"
									: "active:translate-x-px active:translate-y-px"
							}`}>
							{isSubmitting ? (
								<ActivityIndicator size={14} color="#FFFFFF" />
							) : (
								<>
									<Text className="font-bold text-xs tracking-wider text-primary-foreground uppercase">
										{isEditing ? "SAVE" : "PUBLISH"}
									</Text>
									<CornerDownLeft
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
								paddingBottom: isDesktop ? 16 : 40,
							}}>
							{error && (
								<View className="mb-4 flex-row items-center gap-2 border-2 border-destructive bg-destructive-subtle p-3">
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

							<View
								className={
									isDesktop ? "flex-1 flex-row gap-5" : ""
								}>
								<View
									className={
										isDesktop ? "min-w-0 flex-[1.7]" : ""
									}>
									<View
										className={isDesktop ? "mb-3" : "mb-5"}>
										<View className="mb-2 flex-row items-center justify-between">
											<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
												TARGET AUDIENCE
											</Text>
										</View>

										<View className="flex-row gap-2">
											<Pressable
												onPress={() =>
													setVisibility("public")
												}
												className={`flex-1 border-2 border-border p-2.5 shadow-neo-sm ${
													visibility === "public"
														? "bg-neo-green shadow-neo-sm"
														: "bg-surface "
												}`}>
												<View className="flex-row items-center justify-center gap-1.5">
													<Globe
														size={13}
														color="#000000"
														strokeWidth={2.5}
													/>
													<Text className="font-bold text-[13px] text-foreground uppercase">
														PUBLIC
													</Text>
												</View>
											</Pressable>

											<Pressable
												onPress={() =>
													setVisibility("house")
												}
												className={`flex-1 border-2 border-border p-2.5 shadow-neo-sm ${
													visibility === "house"
														? "bg-neo-green"
														: "bg-surface"
												}`}>
												<View className="flex-row items-center justify-center gap-1.5">
													<Shield
														size={13}
														color="#000000"
														strokeWidth={2.5}
													/>
													<Text className="font-bold text-[13px] text-foreground uppercase">
														HOUSE-ONLY
													</Text>
												</View>
											</Pressable>
										</View>
									</View>

									<View
										className={isDesktop ? "mb-3" : "mb-5"}>
										<View className="mb-1.5 flex-row items-center justify-between">
											<Text className="font-bold text-xs tracking-wider text-foreground uppercase">
												HEADLINE / TITLE *
											</Text>
											<Text className="font-mono text-2xs text-foreground/60 uppercase">
												{title.length}/120
											</Text>
										</View>
										<TextInput
											value={title}
											onChangeText={setTitle}
											maxLength={120}
											placeholder="ENTER POST TITLE..."
											placeholderTextColor="#888888"
											className="border-2 border-border bg-surface px-3 py-2.5 font-display text-lg text-foreground uppercase shadow-neo-sm"
										/>
									</View>

									<View
										className={`${
											isDesktop ? "mb-3 flex-1" : "mb-5"
										}`}>
										<View className="mb-1.5 flex-row items-center justify-between">
											<Text className="font-bold text-[10px] tracking-wider text-foreground uppercase">
												POST CONTENT *
											</Text>
											<Text className="font-mono text-2xs text-foreground/60 uppercase">
												{content.length}/5000
											</Text>
										</View>

										<View
											className={`flex-row border-2 border-border bg-surface shadow-neo-sm ${
												isDesktop
													? "min-h-44 flex-1"
													: "min-h-36"
											}`}>
											<TextInput
												value={content}
												onChangeText={setContent}
												maxLength={5000}
												multiline
												textAlignVertical="top"
												placeholder="Write your post content here..."
												placeholderTextColor="#888888"
												className="flex-1 p-2 font-mono text-xs leading-5 text-foreground"
											/>
										</View>
									</View>
									<View
										className={isDesktop ? "mb-0" : "mb-5"}>
										<View className="mb-1.5 flex-row items-center justify-between">
											<Text className="font-bold text-[10px] tracking-wider text-foreground uppercase">
												TAGS (MAX OF 5 TAGS)
											</Text>
											<Text className="font-mono text-2xs text-foreground/60 uppercase">
												{selectedTags.length}/5
											</Text>
										</View>

										<View className="flex-row flex-wrap items-center gap-1.5 border-2 border-border bg-surface p-2.5 shadow-neo-sm">
											{selectedTags.map((tag) => (
												<Pressable
													key={tag}
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
													className="flex-row items-center gap-1 border border-border bg-secondary px-2 py-1">
													<Text className="font-bold text-[10px] text-foreground uppercase">
														{tag} ▯
													</Text>
													<X
														size={10}
														color="#000000"
														strokeWidth={2.5}
													/>
												</Pressable>
											))}

											{isAddingTag ? (
												<View className="flex-row items-center border border-border bg-surface px-2 py-0.5">
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
														className="min-w-20 font-bold text-[10px] uppercase"
													/>
													<Pressable
														onPress={() =>
															commitTag(tagInput)
														}>
														<Check
															size={12}
															color="#000000"
															strokeWidth={3}
														/>
													</Pressable>
												</View>
											) : (
												selectedTags.length < 5 && (
													<Pressable
														onPress={() =>
															setIsAddingTag(true)
														}
														className="flex-row items-center gap-1 border border-dashed border-border px-2 py-1 active:bg-primary/10">
														<Plus
															size={11}
															color="#000000"
															strokeWidth={2.5}
														/>
														<Text className="font-bold text-[10px] text-foreground uppercase">
															ADD TAG
														</Text>
													</Pressable>
												)
											)}
										</View>
									</View>
								</View>

								<View
									className={
										isDesktop
											? "min-w-0 flex-1 border-2 border-border bg-card p-3 shadow-neo-sm"
											: "mb-5"
									}>
									<View className="mb-1.5 flex-row items-center justify-between">
										<Text className="font-bold text-[10px] tracking-wider text-foreground uppercase">
											ATTACHMENTS (CODE SNIPPET, MEDIA)
										</Text>
										<View className="border border-border bg-neo-green px-1.5 py-0.5">
											<Text className="font-bold text-2xs text-foreground uppercase">
												[{attachedCount} ATTACHED]
											</Text>
										</View>
									</View>

									<View
										className={`mb-3 flex-row flex-wrap gap-2 ${
											isDesktop ? "mt-2" : ""
										}`}>
										{traySlots.map((slot) => {
											const Icon = slot.icon;
											return (
												<Pressable
													key={slot.key}
													onPress={slot.onPress}
													className={`min-w-[46%] flex-1 flex-row items-center gap-2 border-2 border-border p-2.5 ${
														slot.active
															? "bg-primary shadow-neo-sm"
															: "bg-surface"
													}`}>
													<Icon
														size={16}
														color={slot.iconColor}
														strokeWidth={2.5}
													/>
													<View>
														<Text
															className={`font-bold text-[10px] uppercase ${
																slot.active
																	? "text-primary-foreground"
																	: "text-foreground"
															}`}>
															{slot.title}
														</Text>
														<Text
															className={`font-mono text-3xs uppercase ${
																slot.active
																	? slot.subClass
																	: "text-foreground/60"
															}`}>
															{slot.sub}
														</Text>
													</View>
												</Pressable>
											);
										})}
									</View>

									{activeTray === "code" && (
										<View
											className={`mb-2 border-2 border-border bg-primary p-3 ${
												isDesktop ? "flex-1" : ""
											}`}>
											<View className="mb-2 flex-row items-center justify-between">
												<View className="flex-row gap-1">
													{CODE_LANGUAGES.map(
														(lang) => (
															<Pressable
																key={lang}
																onPress={() =>
																	setCodeLanguage(
																		lang,
																	)
																}
																className={`border px-1.5 py-0.5 ${
																	codeLanguage ===
																	lang
																		? "border-white bg-surface"
																		: "border-white/40 bg-transparent"
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
											</View>
											<TextInput
												value={codeSnippet}
												onChangeText={setCodeSnippet}
												multiline
												placeholder="hola mundo!"
												placeholderTextColor="#444444"
												className={`border border-white/20 p-2 font-code text-xs text-neo-green ${
													isDesktop
														? "min-h-44 flex-1"
														: "min-h-24"
												}`}
											/>
										</View>
									)}

									{mediaUrls.length > 0 && (
										<View
											className={`mb-2 flex-row flex-wrap gap-2 border-2 border-border bg-surface p-2 ${
												isDesktop ? "flex-1" : ""
											}`}>
											{mediaUrls.map((uri, idx) => (
												<View
													key={uri}
													className={`relative border border-border ${
														isDesktop
															? "size-20"
															: "size-16"
													}`}>
													<ExpoImage
														source={{ uri }}
														style={{
															width: "100%",
															height: "100%",
														}}
														contentFit="cover"
													/>
													<Pressable
														onPress={() =>
															setMediaUrls(
																mediaUrls.filter(
																	(_, i) =>
																		i !==
																		idx,
																),
															)
														}
														className="absolute -top-1 -right-1 bg-primary p-0.5">
														<X
															size={10}
															color="#FFFFFF"
														/>
													</Pressable>
												</View>
											))}
										</View>
									)}
									{activeTray !== "code" &&
										mediaUrls.length === 0 && (
											<View
												className={`items-center justify-center border-2 border-dashed border-border/50 bg-background p-6 ${
													isDesktop
														? "flex-1"
														: "mt-2"
												}`}>
												<ImageIcon
													size={24}
													color="#000000"
													strokeWidth={1.8}
												/>
												<Text className="mt-2 text-center font-mono text-xs text-muted-foreground uppercase">
													Choose code or media to
													attach
												</Text>
											</View>
										)}
								</View>
							</View>
						</ScrollView>
					</KeyboardAvoidingView>
				</SafeAreaView>
			</View>
		</Modal>
	);
}
