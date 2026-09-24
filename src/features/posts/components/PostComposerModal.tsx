import { useAuthStore } from "@auth/store";
import { AlertCircle, Code2, Hash, Lock, Send, X } from "lucide-react-native";
import { Button, Dialog, Text } from "panelui-native";
import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";

import { GuildBadge } from "@/features/guilds/components/GuildBadge";

import { createPost } from "../api";
import type { CreatePostInput, Post } from "../types";

interface PostComposerModalProps {
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
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const toggleTag = (tag: string) => {
		if (selectedTags.includes(tag)) {
			setSelectedTags(selectedTags.filter((t) => t !== tag));
		} else {
			setSelectedTags([...selectedTags, tag]);
		}
	};

	const handleSubmit = async () => {
		if (!title.trim() || !content.trim() || !user?.id) return;

		if (!profile?.guild) {
			setError(
				"You must choose a faction guild before posting. Users can only post to their affiliated guild.",
			);
			return;
		}

		setIsSubmitting(true);
		setError(null);

		const author = {
			id: user.id,
			username: profile?.username || user.email?.split("@")[0] || "Student",
			email: profile?.email || user.email,
			role: profile?.role || "user",
			guild: profile.guild,
		};

		const input: CreatePostInput = {
			title: title.trim(),
			content: content.trim(),
			guild: profile.guild,
			code_snippet: showCode && codeSnippet.trim() ? codeSnippet.trim() : null,
			code_language: showCode && codeSnippet.trim() ? codeLanguage : null,
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
			onOpenChange(false);
		} catch (err: unknown) {
			const e = err as Error;
			setError(e.message || "Failed to publish post.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const hasGuild = !!profile?.guild;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<Dialog.Content className="mx-4 max-h-[90vh] max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
				{/* Dialog Title */}
				<View className="mb-4 flex-row items-center justify-between">
					<View>
						<Dialog.Title weight="bold" className="text-xl text-foreground">
							Create Student Post
						</Dialog.Title>
						<Dialog.Description className="mt-0.5 text-xs text-muted-foreground">
							Publish an update, question, design, or code snippet to your
							affiliated faction guild.
						</Dialog.Description>
					</View>
					<Pressable
						onPress={() => onOpenChange(false)}
						className="h-8 w-8 items-center justify-center rounded-full hover:bg-muted/50 active:scale-[0.96]">
						<X size={16} className="text-muted-foreground" />
					</Pressable>
				</View>
				{error && (
					<View className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3">
						<Text className="text-xs text-destructive">{error}</Text>
					</View>
				)}
				<ScrollView
					showsVerticalScrollIndicator={false}
					className="-mx-1 max-h-[60vh] px-1">
					<View className="gap-4 py-1">
						{/* Guild Destination Locked To Affiliated Guild */}
						{hasGuild ? (
							<View className="rounded-xl border border-border bg-muted/20 p-3">
								<View className="flex-row items-center justify-between">
									<View className="flex-row items-center gap-2">
										<Text
											weight="medium"
											className="text-xs text-muted-foreground">
											Posting to your guild:
										</Text>
										<GuildBadge guildId={profile.guild!} size="sm" />
									</View>
									<View className="flex-row items-center gap-1 rounded-full border border-border/80 bg-background/80 px-2 py-0.5">
										<Lock size={10} className="text-muted-foreground" />
										<Text className="font-medium text-[10px] text-muted-foreground">
											Affiliated Only
										</Text>
									</View>
								</View>
							</View>
						) : (
							<View className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
								<View className="flex-row items-center gap-2">
									<AlertCircle size={16} className="text-amber-400" />
									<Text weight="bold" className="text-xs text-amber-400">
										Faction Guild Required
									</Text>
								</View>
								<Text className="mt-1 text-xs text-muted-foreground">
									Students can only post to their affiliated faction guild.
									Choose your guild track first to publish posts.
								</Text>
								{onOpenGuildModal && (
									<Button
										size="sm"
										variant="outline"
										className="mt-3 self-start active:scale-[0.96]"
										onPress={() => {
											onOpenChange(false);
											onOpenGuildModal();
										}}>
										Choose Faction Guild
									</Button>
								)}
							</View>
						)}
						{/* Title Input */}
						<View>
							<Text
								weight="medium"
								className="mb-1.5 text-xs text-muted-foreground">
								Post Headline / Title
							</Text>
							<TextInput
								value={title}
								onChangeText={setTitle}
								placeholder="e.g. Optimized graph traversal algorithm or UI critique..."
								placeholderTextColor="#64748b"
								className="rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-primary"
							/>
						</View>
						{/* Content Body */}
						<View>
							<Text
								weight="medium"
								className="mb-1.5 text-xs text-muted-foreground">
								Content & Description
							</Text>
							<TextInput
								value={content}
								onChangeText={setContent}
								multiline
								numberOfLines={4}
								textAlignVertical="top"
								placeholder="Share your thoughts, breakdown of the bug, or architectural rationale..."
								placeholderTextColor="#64748b"
								className="min-h-25 rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-primary"
							/>
						</View>
						{/* Code Snippet Toggle */}
						<View>
							<Pressable
								onPress={() => setShowCode(!showCode)}
								className="flex-row items-center gap-2 self-start rounded-lg border border-border/80 bg-muted/40 px-3 py-1.5 active:scale-[0.96]">
								<Code2 size={14} className="text-primary" />
								<Text weight="medium" className="text-xs text-foreground">
									{showCode ? "Remove Code Snippet" : "Attach Code Snippet"}
								</Text>
							</Pressable>
							{showCode && (
								<View className="mt-3 gap-2 rounded-xl border border-border bg-background/80 p-3">
									<View className="flex-row flex-wrap items-center gap-1.5 pb-2">
										<Text className="mr-1 text-[11px] text-muted-foreground">
											Language:
										</Text>
										{CODE_LANGUAGES.map((lang) => (
											<Pressable
												key={lang}
												onPress={() => setCodeLanguage(lang)}
												className={`rounded-md px-2 py-0.5 ${
													codeLanguage === lang
														? "border border-primary/40 bg-primary/20 text-primary"
														: "bg-muted/50 text-muted-foreground hover:bg-muted"
												}`}>
												<Text
													weight={codeLanguage === lang ? "bold" : "normal"}
													className={`font-mono text-[10px] ${
														codeLanguage === lang
															? "text-primary"
															: "text-muted-foreground"
													}`}>
													{lang}
												</Text>
											</Pressable>
										))}
									</View>
									<TextInput
										value={codeSnippet}
										onChangeText={setCodeSnippet}
										multiline
										numberOfLines={5}
										textAlignVertical="top"
										placeholder="// Paste your code snippet here..."
										placeholderTextColor="#64748b"
										className="min-h-27.5 rounded-lg border border-border/60 bg-muted/20 p-2.5 font-mono text-xs text-foreground"
									/>
								</View>
							)}
						</View>
						{/* Topic Tags */}
						<View>
							<View className="mb-1.5 flex-row items-center gap-1">
								<Hash size={13} className="text-muted-foreground" />
								<Text weight="medium" className="text-xs text-muted-foreground">
									Tags & Topics
								</Text>
							</View>
							<View className="flex-row flex-wrap gap-1.5">
								{COMMON_TAGS.map((tag) => {
									const isSelected = selectedTags.includes(tag);
									return (
										<Pressable
											key={tag}
											onPress={() => toggleTag(tag)}
											className={`rounded-lg border px-2.5 py-1 transition-all active:scale-[0.96] ${
												isSelected
													? "border-primary bg-primary/20 text-primary"
													: "border-border/60 bg-muted/30 hover:bg-muted/60"
											}`}>
											<Text
												weight={isSelected ? "bold" : "normal"}
												className={`text-[10px] ${
													isSelected ? "text-primary" : "text-muted-foreground"
												}`}>
												{tag}
											</Text>
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
						disabled={
							!hasGuild || !title.trim() || !content.trim() || isSubmitting
						}
						className="flex-1 transition-transform active:scale-[0.96] sm:flex-initial"
						startContent={
							<Send size={15} className="text-primary-foreground" />
						}
						onPress={handleSubmit}>
						Publish Post
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	);
}
