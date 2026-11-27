import { searchMentionUsers } from "@auth/api";
import type { Profile } from "@auth/types";
import { AtSign } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";

import { extractActiveMention, insertMention } from "../utils/mentions";

interface MentionAutocompleteProps {
	text: string;
	cursorIndex?: number;
	onSelectText: (nextText: string) => void;
	className?: string;
}

export function MentionAutocomplete({
	text,
	cursorIndex,
	onSelectText,
	className = "",
}: MentionAutocompleteProps) {
	const [suggestions, setSuggestions] = useState<Profile[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const seqRef = useRef(0);

	const activeMention = extractActiveMention(text, cursorIndex);
	const isActive = activeMention !== null;
	const mentionQuery = activeMention?.query ?? "";

	useEffect(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		if (!isActive) {
			seqRef.current += 1;
			queueMicrotask(() => {
				setSuggestions([]);
				setIsLoading(false);
			});
			return;
		}

		const seq = ++seqRef.current;
		const delay = mentionQuery.length === 0 ? 0 : 120;
		queueMicrotask(() => {
			if (seq === seqRef.current) {
				setIsLoading(true);
			}
		});

		timerRef.current = setTimeout(() => {
			void searchMentionUsers(mentionQuery, 8)
				.then((users) => {
					if (seq !== seqRef.current) return;
					setSuggestions(users);
					setIsLoading(false);
				})
				.catch(() => {
					if (seq === seqRef.current) {
						setSuggestions([]);
						setIsLoading(false);
					}
				});
		}, delay);

		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
		};
	}, [isActive, mentionQuery]);

	if (!isActive || (!isLoading && suggestions.length === 0)) {
		return null;
	}

	return (
		<View
			className={`border-2 border-border bg-card px-2 py-1.5 shadow-neo-xs ${className}`}>
			{isLoading && suggestions.length === 0 ? (
				<View className="flex-row items-center gap-2 py-0.5">
					<ActivityIndicator size="small" color="#000000" />
					<Text className="font-mono text-2xs text-muted-foreground uppercase">
						SEARCHING USERS...
					</Text>
				</View>
			) : (
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					keyboardShouldPersistTaps="always"
					contentContainerStyle={{ gap: 6 }}>
					{suggestions.map((u) => {
						const handle = u.username ?? "";
						return (
							<Pressable
								key={u.id}
								accessibilityRole="button"
								accessibilityLabel={`Mention @${handle}`}
								onPress={() => {
									onSelectText(
										insertMention(
											text,
											handle,
											cursorIndex,
										),
									);
									setSuggestions([]);
								}}
								className="flex-row items-center gap-1 border border-border bg-surface px-2 py-1 active:bg-neo-green">
								<AtSign
									size={10}
									color="#000000"
									strokeWidth={2.5}
								/>
								<Text className="font-bold text-2xs text-foreground">
									{handle}
								</Text>
								{u.display_name &&
								u.display_name.toLowerCase() !==
									handle.toLowerCase() ? (
									<Text className="font-mono text-2xs text-muted-foreground">
										· {u.display_name}
									</Text>
								) : null}
							</Pressable>
						);
					})}
				</ScrollView>
			)}
		</View>
	);
}
