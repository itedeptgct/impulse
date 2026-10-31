import { useAuthStore } from "@auth/store";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
	AlertCircle,
	Camera,
	Code2,
	Hash,
	Lock,
	Send,
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

import { NeoBadge, NeoButton, NeoCard } from "@/components/ui";
import { GuildBadge } from "@/features/guilds/components/GuildBadge";

import { createPost } from "../api";
import type { CreatePostInput, Post } from "../types";

export interface PostComposerModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onPostCreated: (post: Post) => void;
	onOpenGuildModal?: () => void;
}

const COMMON_TAGS = [
	"#algorithms",
	"#webdev",
	"#cybersecurity",
	"#uidesign",
	"#3drender",
	"#campusculture",
	"#hackathons",
	"#careers",
];

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
	const [showCode, setShowCode] = useState(false);
	const [codeSnippet, setCodeSnippet] = useState("");
	const [codeLanguage, setCodeLanguage] = useState("typescript");
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const [customTag, setCustomTag] = useState("");
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const toggleTag = (tag: string) => {
		if (selectedTags.includes(tag)) {
			setSelectedTags(selectedTags.filter((t) => t !== tag));
		} else {
			setSelectedTags([...selectedTags, tag]);
		}
	};

	const addCustomTag = () => {
		const normalizedTag = customTag.trim().replace(/^#*/, "#");
		if (normalizedTag.length > 1 && !selectedTags.includes(normalizedTag)) {
			setSelectedTags([...selectedTags, normalizedTag]);
		}
		setCustomTag("");
	};

	const pickImage = async () => {
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			allowsEditing: true,
			aspect: [16, 9],
			quality: 0.8,
		});
		if (!result.canceled) setImageUrl(result.assets[0]?.uri || null);
	};

	const handleSubmit = async () => {
		if (!title.trim() || !content.trim() || !user?.id) return;

		if (!profile?.guild) {
			setError(
				"You must choose a house before posting. Users can only post to their affiliated house.",
			);
			return;
		}

		setIsSubmitting(true);
		setError(null);

		const author = {
			id: user.id,
			username:
				profile?.username || user.email?.split("@")[0] || "Student",
			email: profile?.email || user.email,
			role: profile?.role || "user",
			guild: profile.guild,
		};

		const input: CreatePostInput = {
			title: title.trim(),
			content: content.trim(),
			guild: profile.guild,
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
			setCustomTag("");
			setImageUrl(null);
			onOpenChange(false);
		} catch (err: unknown) {
			const e = err as Error;
			setError(e.message || "Failed to publish post.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const hasGuild = !!profile?.guild;
	const canPublish =
		hasGuild && !!title.trim() && !!content.trim() && !isSubmitting;

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
							NEW TRANSMISSION
						</Text>

						<NeoButton
							variant="primary"
							size="sm"
							loading={isSubmitting}
							disabled={!canPublish}
							onPress={handleSubmit}
							startContent={
								!isSubmitting ? (
									<Send
										size={14}
										color="#0a0a0c"
										strokeWidth={2.5}
									/>
								) : undefined
							}>
							POST
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
							className="flex-1 px-4"
							contentContainerStyle={{
								flexGrow: 1,
								paddingBottom: 40,
							}}
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled">
							<View className="gap-4 py-4">
								{/* Guild Destination Locked To Affiliated Guild */}
								{hasGuild ? (
									<NeoCard
										variant="default"
										className="rounded-sm border-2 border-border bg-card p-3 shadow-neo-sm">
										<View className="flex-row items-center justify-between">
											<View className="flex-row items-center gap-2">
												<Text className="font-mono text-xs text-muted-foreground uppercase">
													Destination:
												</Text>
												<GuildBadge
													guildId={profile.guild!}
													size="sm"
												/>
											</View>
											<View className="flex-row items-center gap-1 rounded-sm border-2 border-border bg-secondary px-2 py-0.5">
												<Lock
													size={11}
													color="#91e6b1"
												/>
												<Text className="font-mono text-xs text-primary uppercase">
													Affiliated
												</Text>
											</View>
										</View>
									</NeoCard>
								) : (
									<NeoCard className="rounded-sm border-2 border-amber-500/50 bg-amber-500/10 p-4 shadow-neo-sm">
										<View className="flex-row items-center gap-2">
											<AlertCircle
												size={16}
												color="#fbbf24"
											/>
											<Text className="font-mono text-xs text-amber-400 uppercase">
												House Required
											</Text>
										</View>
										<Text className="mt-1 font-mono text-xs text-muted-foreground">
											Students can only post to their
											affiliated house. Choose your house
											in your profile to publish posts.
										</Text>
										{onOpenGuildModal && (
											<NeoButton
												size="sm"
												variant="secondary"
												className="mt-3 self-start"
												onPress={() => {
													onOpenChange(false);
													onOpenGuildModal();
												}}>
												CHOOSE HOUSE
											</NeoButton>
										)}
									</NeoCard>
								)}

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
												strokeWidth={2.5}
											/>
										}
										onPress={() => setShowCode(!showCode)}>
										{showCode
											? "REMOVE CODE SNIPPET"
											: "ATTACH CODE SNIPPET"}
									</NeoButton>

									{showCode && (
										<NeoCard className="mt-3 gap-2 rounded-sm border-2 border-border bg-card p-3 shadow-neo-sm">
											<View className="flex-row flex-wrap items-center gap-1.5 border-b border-border pb-2">
												<Text className="mr-1 font-mono text-xs text-muted-foreground uppercase">
													Language:
												</Text>
												{CODE_LANGUAGES.map((lang) => (
													<Pressable
														key={lang}
														onPress={() =>
															setCodeLanguage(
																lang,
															)
														}>
														<NeoBadge
															variant={
																codeLanguage ===
																lang
																	? "primary"
																	: "outline"
															}
															size="sm">
															{lang}
														</NeoBadge>
													</Pressable>
												))}
											</View>
											<TextInput
												value={codeSnippet}
												onChangeText={setCodeSnippet}
												multiline
												numberOfLines={6}
												textAlignVertical="top"
												placeholder="// Paste your code snippet here..."
												placeholderTextColor="#6c7284"
												className="min-h-32 rounded-sm border-2 border-border bg-[#0d0e12] p-3 font-mono text-xs text-primary"
											/>
										</NeoCard>
									)}
								</View>

								{/* Topic Tags */}
								<View>
									<View className="mb-2 flex-row items-center gap-1">
										<Hash size={14} color="#9aa1b2" />
										<Text className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
											Tags & Topics
										</Text>
									</View>
									<View className="flex-row flex-wrap gap-2">
										{Array.from(
											new Set([
												...COMMON_TAGS,
												...selectedTags,
											]),
										).map((tag) => {
											const isSelected =
												selectedTags.includes(tag);
											return (
												<Pressable
													key={tag}
													onPress={() =>
														toggleTag(tag)
													}>
													<NeoBadge
														variant={
															isSelected
																? "primary"
																: "default"
														}
														size="md">
														{tag}
													</NeoBadge>
												</Pressable>
											);
										})}
									</View>
									<View className="mt-2 flex-row items-center gap-2">
										<TextInput
											value={customTag}
											onChangeText={setCustomTag}
											onSubmitEditing={addCustomTag}
											placeholder="#custom-tag"
											placeholderTextColor="#6c7284"
											className="flex-1 rounded-sm border-2 border-border bg-card px-3 py-2 font-mono text-xs text-foreground"
										/>
										<NeoButton
											size="sm"
											variant="secondary"
											onPress={addCustomTag}>
											ADD TAG
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

						{/* Keyboard Accessory Bar */}
						<View className="flex-row items-center justify-between border-t-2 border-border bg-card px-4 py-2">
							<View className="flex-row items-center gap-2">
								<NeoButton
									size="sm"
									variant={showCode ? "primary" : "secondary"}
									startContent={
										<Code2
											size={14}
											color={
												showCode ? "#0a0a0c" : "#91e6b1"
											}
										/>
									}
									onPress={() => setShowCode(!showCode)}>
									CODE
								</NeoButton>
								<Text className="font-mono text-xs text-muted-foreground">
									{selectedTags.length > 0
										? `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""}`
										: "No tags"}
								</Text>
							</View>

							<Text className="font-mono text-xs text-muted-foreground">
								{content.length} chars
							</Text>
						</View>
					</KeyboardAvoidingView>
				</SafeAreaView>
			</View>
		</Modal>
	);
}
