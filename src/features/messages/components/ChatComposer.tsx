import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Camera, ImagePlus, Reply, Send, X } from "lucide-react-native";
import { useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MentionAutocomplete } from "@/features/posts/components/MentionAutocomplete";
import {
	validateBatchFileSizes,
	validateUploadFileSize,
} from "@/lib/media-validation";
import { toast } from "@/lib/toast";

import { useMessagesStore } from "../store";

export interface SelectedChatImage {
	uri: string;
	width?: number;
	height?: number;
	fileSize?: number | null;
}

export interface ChatReplyTarget {
	id: string;
	senderName: string;
	preview: string;
}

interface ChatComposerProps {
	conversationId?: string;
	onSend: (payload: {
		content?: string;
		localImageUri?: string;
		localImageFileSize?: number | null;
		localImages?: SelectedChatImage[];
		replyToId?: string | null;
	}) => Promise<void>;
	replyingTo?: ChatReplyTarget | null;
	onCancelReply?: () => void;
	onTyping?: () => void;
	isGroup?: boolean;
	disabled?: boolean;
}

export function ChatComposer({
	conversationId,
	onSend,
	replyingTo = null,
	onCancelReply,
	onTyping,
	isGroup = false,
	disabled = false,
}: ChatComposerProps) {
	const insets = useSafeAreaInsets();
	const [localText, setLocalText] = useState("");
	const [textCursor, setTextCursor] = useState<number | undefined>(undefined);
	const storeDraft = useMessagesStore((s) =>
		conversationId ? (s.drafts[conversationId] ?? "") : "",
	);
	const setStoreDraft = useMessagesStore((s) => s.setDraft);
	const clearStoreDraft = useMessagesStore((s) => s.clearDraft);

	const text = conversationId ? storeDraft : localText;
	const setText = (next: string) => {
		if (conversationId) {
			setStoreDraft(conversationId, next);
		} else {
			setLocalText(next);
		}
	};
	const [localImageUri, setLocalImageUri] = useState<string | null>(null);
	const [localImageFileSize, setLocalImageFileSize] = useState<number | null>(
		null,
	);
	const [localImages, setLocalImages] = useState<SelectedChatImage[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const hasImages = isGroup ? localImages.length > 0 : Boolean(localImageUri);
	const canSend =
		!disabled && !isSubmitting && (text.trim().length > 0 || hasImages);

	const handlePickImage = async () => {
		if (isGroup) {
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ["images"],
				allowsMultipleSelection: true,
				allowsEditing: false,
				quality: 0.85,
			});

			if (result.canceled || result.assets.length === 0) return;

			const validation = validateBatchFileSizes(result.assets);
			if (!validation.valid) {
				toast.error(
					validation.error || "File exceeds the 10 MB size limit.",
					"FILE TOO LARGE",
				);
				return;
			}

			const picked: SelectedChatImage[] = result.assets.map((asset) => ({
				uri: asset.uri,
				width: asset.width,
				height: asset.height,
				fileSize: asset.fileSize ?? null,
			}));
			setLocalImages((prev) => [...prev, ...picked]);
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			allowsEditing: false,
			quality: 0.85,
		});

		if (!result.canceled && result.assets[0]?.uri) {
			const asset = result.assets[0];
			const validation = validateUploadFileSize(asset.fileSize);
			if (!validation.valid) {
				toast.error(
					validation.error || "File exceeds the 10 MB size limit.",
					"FILE TOO LARGE",
				);
				return;
			}
			setLocalImageUri(asset.uri);
			setLocalImageFileSize(asset.fileSize ?? null);
		}
	};

	const handleTakePhoto = async () => {
		try {
			const perm = await ImagePicker.requestCameraPermissionsAsync();
			if (!perm.granted) {
				toast.error(
					"Camera permission is required to take a photo.",
					"PERMISSION DENIED",
				);
				return;
			}
			const result = await ImagePicker.launchCameraAsync({
				mediaTypes: ["images"],
				allowsEditing: false,
				quality: 0.85,
			});
			if (result.canceled || !result.assets[0]?.uri) return;
			const asset = result.assets[0];
			const validation = validateUploadFileSize(asset.fileSize);
			if (!validation.valid) {
				toast.error(
					validation.error || "File exceeds the 10 MB size limit.",
					"FILE TOO LARGE",
				);
				return;
			}
			if (isGroup) {
				setLocalImages((prev) => [
					...prev,
					{
						uri: asset.uri,
						width: asset.width,
						height: asset.height,
						fileSize: asset.fileSize ?? null,
					},
				]);
			} else {
				setLocalImageUri(asset.uri);
				setLocalImageFileSize(asset.fileSize ?? null);
			}
		} catch (err: unknown) {
			const e = err as Error;
			toast.error(e?.message || "Unable to open camera.");
		}
	};

	const handleRemoveBatchImage = (indexToRemove: number) => {
		setLocalImages((prev) =>
			prev.filter((_, idx) => idx !== indexToRemove),
		);
	};

	const handleSend = async () => {
		if (!canSend) return;
		const rawText = text;
		const content = rawText.trim() || undefined;
		const imageUri = localImageUri ?? undefined;
		const imageSize = localImageFileSize;
		const batchImages =
			isGroup && localImages.length > 0 ? [...localImages] : undefined;
		const replyToId = replyingTo?.id ?? null;

		setIsSubmitting(true);
		if (conversationId) {
			clearStoreDraft(conversationId);
		} else {
			setLocalText("");
		}
		setLocalImageUri(null);
		setLocalImageFileSize(null);
		setLocalImages([]);
		onCancelReply?.();
		try {
			await onSend({
				content,
				localImageUri: imageUri,
				localImageFileSize: imageSize,
				localImages: batchImages,
				replyToId,
			});
		} catch (err) {
			if (rawText) {
				if (conversationId) {
					setStoreDraft(conversationId, rawText);
				} else {
					setLocalText(rawText);
				}
			}
			throw err;
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<View
			style={{ paddingBottom: Math.max(insets.bottom, 10) }}
			className="border-t-2 border-border bg-card px-3 pt-2.5">
			{replyingTo ? (
				<View className="mb-2 flex-row items-center justify-between border-2 border-border bg-secondary px-2.5 py-1.5">
					<View className="mr-2 min-w-0 flex-1 flex-row items-center gap-2">
						<Reply size={13} color="#000000" strokeWidth={2.5} />
						<View className="min-w-0 flex-1">
							<Text
								numberOfLines={1}
								className="font-bold text-3xs tracking-wider text-foreground uppercase">
								REPLYING TO {replyingTo.senderName}
							</Text>
							<Text
								numberOfLines={1}
								className="font-mono text-2xs text-muted-foreground">
								{replyingTo.preview}
							</Text>
						</View>
					</View>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Cancel reply"
						hitSlop={8}
						onPress={onCancelReply}
						className="border border-border bg-surface p-1">
						<X size={11} color="#000000" strokeWidth={2.5} />
					</Pressable>
				</View>
			) : null}

			{isGroup && localImages.length > 0 ? (
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					className="mb-2"
					contentContainerStyle={{
						gap: 8,
						paddingTop: 6,
						paddingRight: 6,
					}}>
					{localImages.map((img, idx) => (
						<View
							key={`${img.uri}-${idx}`}
							className="relative border-2 border-border bg-secondary">
							<ExpoImage
								source={{ uri: img.uri }}
								style={{ width: 72, height: 72 }}
								contentFit="cover"
							/>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={`Remove attached image ${idx + 1}`}
								onPress={() => handleRemoveBatchImage(idx)}
								className="absolute -top-2 -right-2 size-5 items-center justify-center border border-border bg-destructive">
								<X
									size={11}
									color="#ffffff"
									strokeWidth={2.5}
								/>
							</Pressable>
						</View>
					))}
				</ScrollView>
			) : !isGroup && localImageUri ? (
				<View className="mb-2 flex-row items-center">
					<View className="relative border-2 border-border bg-secondary">
						<ExpoImage
							source={{ uri: localImageUri }}
							style={{ width: 72, height: 72 }}
							contentFit="cover"
						/>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Remove attached image"
							onPress={() => {
								setLocalImageUri(null);
								setLocalImageFileSize(null);
							}}
							className="absolute -top-2 -right-2 size-5 items-center justify-center border border-border bg-destructive">
							<X size={11} color="#ffffff" strokeWidth={2.5} />
						</Pressable>
					</View>
				</View>
			) : null}

			<MentionAutocomplete
				text={text}
				cursorIndex={textCursor}
				onSelectText={(next) => {
					setText(next);
					setTextCursor(undefined);
				}}
				className="mb-2"
			/>

			<View className="flex-row items-end gap-2">
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Take photo"
					onPress={() => void handleTakePhoto()}
					disabled={disabled || isSubmitting}
					className="size-10 items-center justify-center border-2 border-border bg-surface shadow-neo-xs active:translate-x-px active:translate-y-px">
					<Camera size={17} color="#000000" strokeWidth={2.2} />
				</Pressable>

				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Attach image"
					onPress={handlePickImage}
					disabled={disabled || isSubmitting}
					className="size-10 items-center justify-center border-2 border-border bg-surface shadow-neo-xs active:translate-x-px active:translate-y-px">
					<ImagePlus size={18} color="#000000" strokeWidth={2.2} />
				</Pressable>

				<TextInput
					value={text}
					onChangeText={(next) => {
						setTextCursor((prev) =>
							prev !== undefined
								? Math.max(
										0,
										prev + (next.length - text.length),
									)
								: undefined,
						);
						setText(next);
						if (next.trim().length > 0) {
							onTyping?.();
						}
					}}
					onSelectionChange={(e) => {
						const pos = e.nativeEvent.selection.end;
						setTextCursor(pos < text.length ? pos : undefined);
					}}
					placeholder="Type a transmission..."
					placeholderTextColor="rgba(0, 0, 0, 0.4)"
					multiline
					maxLength={2000}
					className="max-h-28 min-h-10 flex-1 border-2 border-border bg-surface px-3 py-2 font-mono text-xs text-foreground"
				/>

				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Send message"
					onPress={handleSend}
					disabled={!canSend}
					className={`size-10 items-center justify-center border-2 border-border shadow-neo-xs active:translate-x-px active:translate-y-px ${
						canSend ? "bg-neo-green" : "bg-secondary opacity-50"
					}`}>
					{isSubmitting ? (
						<ActivityIndicator size="small" color="#000000" />
					) : (
						<Send size={16} color="#000000" strokeWidth={2.5} />
					)}
				</Pressable>
			</View>
		</View>
	);
}
