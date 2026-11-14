import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus, Send, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ChatComposerProps {
	onSend: (payload: {
		content?: string;
		localImageUri?: string;
	}) => Promise<void>;
	disabled?: boolean;
}

export function ChatComposer({ onSend, disabled = false }: ChatComposerProps) {
	const insets = useSafeAreaInsets();
	const [text, setText] = useState("");
	const [localImageUri, setLocalImageUri] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const canSend =
		!disabled &&
		!isSubmitting &&
		(text.trim().length > 0 || Boolean(localImageUri));

	const handlePickImage = async () => {
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			allowsEditing: false,
			quality: 0.85,
		});

		if (!result.canceled && result.assets[0]?.uri) {
			setLocalImageUri(result.assets[0].uri);
		}
	};

	const handleSend = async () => {
		if (!canSend) return;
		const content = text.trim() || undefined;
		const imageUri = localImageUri ?? undefined;

		setIsSubmitting(true);
		setText("");
		setLocalImageUri(null);
		try {
			await onSend({ content, localImageUri: imageUri });
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<View
			style={{ paddingBottom: Math.max(insets.bottom, 10) }}
			className="border-t-2 border-border bg-card px-3 pt-2.5">
			{localImageUri ? (
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
							onPress={() => setLocalImageUri(null)}
							className="absolute -top-2 -right-2 size-5 items-center justify-center border border-border bg-destructive">
							<X size={11} color="#ffffff" strokeWidth={2.5} />
						</Pressable>
					</View>
				</View>
			) : null}

			<View className="flex-row items-end gap-2">
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
					onChangeText={setText}
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
