import { useAuthStore } from "@auth/store";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
	AlertCircle,
	Camera,
	Code2,
	Globe,
	Hash,
	Shield,
	X,
} from "lucide-react-native";
import { useState } from "react";
import {
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
import { GuildBadge } from "@/features/guilds/components/GuildBadge";

import { createPost } from "../api";
import type { CreatePostInput, Post, PostVisibility } from "../types";

export interface PostComposerModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onPostCreated: (post: Post) => void;
	onOpenGuildModal?: () => void;
}

const CODE_LANGUAGES = ["typescript", "python", "cpp", "sql", "lua", "rust"];

export function PostComposerModal({
	open,
	onOpenChange,
	onPostCreated,
	onOpenGuildModal,
}: PostComposerModalProps) {
	const user = useAuthStore((state) => state.user);
	const profile = useAuthStore((state) => state.profile);

	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [visibility, setVisibility] = useState<PostVisibility>("public");
	const [showCode, setShowCode] = useState(false);
	const [codeSnippet, setCodeSnippet] = useState("");
	const [codeLanguage, setCodeLanguage] = useState("typescript");
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const [tagInput, setTagInput] = useState("");
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const commitTag = (rawText: string) => {
		const normalized = rawText
			.trim()
			.toLowerCase()
			.replace(/^#+/, "")
			.replace(/[^a-z0-9_-]/g, "");

		if (normalized.length >= 2 && normalized.length <= 24) {
			const formattedTag = `#${normalized}`;
			if (!selectedTags.includes(formattedTag)) {
				setSelectedTags((prev) => [...prev, formattedTag]);
			}
		}
		setTagInput("");
	};

	const handleTagChangeText = (text: string) => {
		if (text.includes(" ") || text.includes(",")) {
			const token = text.replace(/[, ]+/g, "");
			commitTag(token);
		} else {
			setTagInput(text);
		}
	};

	const removeTag = (tagToRemove: string) => {
		setSelectedTags((prev) => prev.filter((t) => t !== tagToRemove));
	};

	const pickImage = async () => {
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			allowsEditing: true,
			quality: 0.8,
		});
		if (!result.canceled) setImageUrl(result.assets[0]?.uri || null);
	};

	const handleSubmit = async () => {
		if (!title.trim() || !content.trim() || !user?.id) return;

		if (visibility === "house" && !profile?.guild) {
			setError(
				"You must choose a house before publishing a House-Only post.",
			);
			return;
		}

		setIsSubmitting(true);
		setError(null);

		const author = {
			id: user.id,
			username:
				profile?.username || user.email?.split("@")[0] || "Student",
			display_name:
				profile?.display_name || profile?.username || "Student",
			avatar_url: profile?.avatar_url || null,
			email: profile?.email || user.email,
			role: profile?.role || "user",
			guild: profile?.guild || null,
		};

		const input: CreatePostInput = {
			title: title.trim(),
			content: content.trim(),
			visibility: visibility,
			guild:
				visibility === "house"
					? profile?.guild
					: profile?.guild || null,
			code_snippet:
				showCode && codeSnippet.trim() ? codeSnippet.trim() : null,
			code_language: showCode && codeSnippet.trim() ? codeLanguage : null,
			image_url: imageUrl,
			tags: selectedTags,
		};

		try {
			const newPost = await createPost(input, author);
			onPostCreated(newPost);
			// Reset form
			setTitle("");
			setContent("");
			setCodeSnippet("");
			setShowCode(false);
			setSelectedTags([]);
			setTagInput("");
			setImageUrl(null);
			setVisibility("public");
			onOpenChange(false);
		} catch (err: unknown) {
			const e = err as Error;
			setError(e.message || "Failed to publish post.");
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
					{/* Modal Top Bar */}
					<View className="flex-row items-center justify-between border-b-2 border-border bg-card px-4 py-3 shadow-neo-sm">
						<NeoButton
							variant="secondary"
							size="sm"
							onPress={() => onOpenChange(false)}>
							CANCEL
						</NeoButton>

						<Text className="font-display text-base tracking-tight text-foreground uppercase">
							NEW TRANSMISSION
						</Text>

						<NeoButton
							variant="primary"
							size="sm"
							loading={isSubmitting}
							disabled={
								isSubmitting ||
								!title.trim() ||
								!content.trim() ||
								(visibility === "house" && !profile?.guild)
							}
							onPress={handleSubmit}>
							PUBLISH
						</NeoButton>
					</View>

					{/* Error Alert */}
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
								{/* Audience Visibility Switch (Public vs House-Only) */}
								<View className="rounded-sm border-2 border-border bg-card p-3 shadow-neo-sm">
									<Text className="mb-2 font-mono text-xs tracking-wider text-muted-foreground uppercase">
										AUDIENCE VISIBILITY
									</Text>
									<View className="flex-row gap-2">
										<Pressable
											onPress={() =>
												setVisibility("public")
											}
											className={`flex-1 flex-row items-center justify-center gap-2 rounded-sm border-2 py-2.5 shadow-neo-sm active:translate-x-px active:translate-y-px ${
												visibility === "public"
													? "border-primary bg-primary"
													: "border-border bg-secondary"
											}`}>
											<Globe
												size={14}
												color={
													visibility === "public"
														? "#0a0a0c"
														: "#91e6b1"
												}
												strokeWidth={2.5}
											/>
											<Text
												className={`font-display text-xs ${
													visibility === "public"
														? "text-black"
														: "text-foreground"
												}`}>
												PUBLIC (ALL)
											</Text>
										</Pressable>

										<Pressable
											onPress={() => {
												if (!profile?.guild) {
													setError(
														"Please join a house in your profile first to create House-Only posts.",
													);
													return;
												}
												setVisibility("house");
											}}
											className={`flex-1 flex-row items-center justify-center gap-2 rounded-sm border-2 py-2.5 shadow-neo-sm active:translate-x-px active:translate-y-px ${
												visibility === "house"
													? "border-primary bg-primary"
													: "border-border bg-secondary"
											}`}>
											<Shield
												size={14}
												color={
													visibility === "house"
														? "#0a0a0c"
														: "#91e6b1"
												}
												strokeWidth={2.5}
											/>
											<Text
												className={`font-display text-xs ${
													visibility === "house"
														? "text-black"
														: "text-foreground"
												}`}>
												HOUSE-ONLY (PRIVATE)
											</Text>
										</Pressable>
									</View>

									{visibility === "house" &&
										profile?.guild && (
											<View className="mt-2.5 flex-row items-center gap-2">
												<Text className="font-mono text-[10px] text-muted-foreground uppercase">
													House Scope:
												</Text>
												<GuildBadge
													guildId={profile.guild}
													size="sm"
												/>
											</View>
										)}

									{!profile?.guild && (
										<View className="mt-2.5 flex-row items-center justify-between rounded-sm border border-amber-500/40 bg-amber-500/10 p-2">
											<Text className="flex-1 font-mono text-[10px] text-amber-300">
												No house joined. House-Only is
												disabled until you choose a
												house.
											</Text>
											{onOpenGuildModal && (
												<Pressable
													onPress={() => {
														onOpenChange(false);
														onOpenGuildModal();
													}}
													className="rounded-sm bg-amber-400 px-2 py-1">
													<Text className="font-display text-[10px] text-black">
														JOIN
													</Text>
												</Pressable>
											)}
										</View>
									)}
								</View>

								{/* Title Input */}
								<View>
									<Text className="mb-1.5 font-mono text-xs tracking-wider text-muted-foreground uppercase">
										Transmission Title
									</Text>
									<TextInput
										value={title}
										onChangeText={setTitle}
										placeholder="e.g. Optimized graph traversal algorithm or UI critique..."
										placeholderTextColor="#6c7284"
										className="rounded-sm border-2 border-border bg-card p-3 font-mono text-sm text-foreground focus:border-primary"
									/>
								</View>

								{/* Content Body */}
								<View>
									<Text className="mb-1.5 font-mono text-xs tracking-wider text-muted-foreground uppercase">
										Content & Description
									</Text>
									<TextInput
										value={content}
										onChangeText={setContent}
										multiline
										numberOfLines={6}
										textAlignVertical="top"
										placeholder="Share your technical breakdown, question, or design rationale..."
										placeholderTextColor="#6c7284"
										className="min-h-36 rounded-sm border-2 border-border bg-card p-3 font-mono text-sm text-foreground focus:border-primary"
									/>
								</View>

								{/* Code Snippet Toggle & Editor */}
								<View>
									<NeoButton
										size="sm"
										variant={
											showCode ? "primary" : "secondary"
										}
										className="self-start"
										startContent={
											<Code2
												size={16}
												color={
													showCode
														? "#0a0a0c"
														: "#91e6b1"
												}
											/>
										}
										onPress={() => setShowCode(!showCode)}>
										{showCode
											? "REMOVE CODE BLOCK"
											: "ATTACH CODE SNIPPET"}
									</NeoButton>

									{showCode && (
										<View className="mt-3 gap-3 rounded-sm border-2 border-border bg-card p-3">
											<View className="flex-row items-center justify-between">
												<Text className="font-mono text-xs text-muted-foreground uppercase">
													Language:
												</Text>
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
																className={`rounded-sm border px-2 py-0.5 ${
																	codeLanguage ===
																	lang
																		? "border-primary bg-primary/20"
																		: "border-border bg-secondary"
																}`}>
																<Text
																	className={`font-mono text-[10px] uppercase ${
																		codeLanguage ===
																		lang
																			? "text-primary"
																			: "text-muted-foreground"
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
												numberOfLines={5}
												textAlignVertical="top"
												placeholder="// Paste code snippet here..."
												placeholderTextColor="#6c7284"
												className="min-h-24 rounded-sm border-2 border-border bg-[#0d0e12] p-3 font-mono text-xs text-primary"
											/>
										</View>
									)}
								</View>

								{/* GitHub-Style Topic Tags Input */}
								<View>
									<View className="mb-1.5 flex-row items-center justify-between">
										<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
											TOPIC TAGS
										</Text>
										<Text className="font-mono text-[10px] text-muted-foreground">
											Press space, comma, or enter to add
										</Text>
									</View>

									{/* Selected Tag Pills */}
									{selectedTags.length > 0 && (
										<View className="fonlylex-wrap mb-2.5 flex-row items-center gap-1.5">
											{selectedTags.map((tag) => (
												<View
													key={tag}
													className="flex-row items-center gap-1.5 rounded-sm border-2 border-primary bg-primary/10 px-2 py-1 shadow-neo-sm">
													<Text className="font-mono text-xs text-primary">
														{tag}
													</Text>
													<Pressable
														onPress={() =>
															removeTag(tag)
														}
														hitSlop={8}
														className="rounded-xs bg-primary/20 p-0.5">
														<X
															size={11}
															color="#91e6b1"
															strokeWidth={2.5}
														/>
													</Pressable>
												</View>
											))}
										</View>
									)}

									{/* Tag Input Field */}
									<View className="flex-row items-center gap-2">
										<View className="flex-1 flex-row items-center rounded-sm border-2 border-border bg-card px-3 py-1.5">
											<Hash
												size={14}
												color="#91e6b1"
												strokeWidth={2.2}
											/>
											<TextInput
												value={tagInput}
												onChangeText={
													handleTagChangeText
												}
												onSubmitEditing={() =>
													commitTag(tagInput)
												}
												placeholder="algorithms, webdev, mobile..."
												placeholderTextColor="#6c7284"
												autoCapitalize="none"
												autoCorrect={false}
												returnKeyType="done"
												className="flex-1 pl-2 font-mono text-xs text-foreground"
											/>
										</View>
										<NeoButton
											size="sm"
											variant="secondary"
											disabled={!tagInput.trim()}
											onPress={() => commitTag(tagInput)}>
											ADD
										</NeoButton>
									</View>
								</View>

								{/* Media Attachment */}
								<View>
									<NeoButton
										size="sm"
										variant={
											imageUrl ? "primary" : "secondary"
										}
										startContent={
											<Camera
												size={15}
												color={
													imageUrl
														? "#0a0a0c"
														: "#91e6b1"
												}
											/>
										}
										onPress={pickImage}>
										{imageUrl
											? "REPLACE MEDIA"
											: "ATTACH MEDIA"}
									</NeoButton>
									{imageUrl && (
										<View className="mt-3 overflow-hidden rounded-sm border-2 border-border bg-black">
											<Pressable
												onPress={() =>
													setImageUrl(null)
												}
												className="absolute top-2 right-2 z-10 rounded-sm bg-black/70 p-1">
												<X size={14} color="#ffffff" />
											</Pressable>
											<ExpoImage
												source={{ uri: imageUrl }}
												style={{
													height: 180,
													width: "100%",
												}}
												contentFit="cover"
											/>
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
