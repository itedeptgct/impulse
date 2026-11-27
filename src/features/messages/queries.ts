import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { fetchConversations } from "./api";
import { useMessagesStore } from "./store";
import type { DirectConversationSummary } from "./types";

export const conversationKeys = {
	all: ["conversations"] as const,
	list: (userId?: string) => ["conversations", userId ?? "anon"] as const,
};

export function useConversationsQuery(userId?: string) {
	const setConversations = useMessagesStore((s) => s.setConversations);

	const query = useQuery<DirectConversationSummary[], Error>({
		queryKey: conversationKeys.list(userId),
		enabled: Boolean(userId),
		queryFn: () => fetchConversations(userId!),
	});

	useEffect(() => {
		if (query.data) {
			setConversations(query.data);
		}
	}, [query.data, setConversations]);

	return query;
}
