import { useEffect, useRef } from "react";

export type TabReselectKey = "index" | "dispatch" | "messages";

type Listener = () => void;

const listeners = new Map<TabReselectKey, Set<Listener>>();

export function subscribeTabReselect(
	tab: TabReselectKey,
	listener: Listener,
): () => void {
	let set = listeners.get(tab);
	if (!set) {
		set = new Set();
		listeners.set(tab, set);
	}
	set.add(listener);
	return () => {
		set?.delete(listener);
		if (set && set.size === 0) {
			listeners.delete(tab);
		}
	};
}

export function emitTabReselect(tab: TabReselectKey): void {
	const set = listeners.get(tab);
	if (!set) return;
	for (const listener of Array.from(set)) {
		listener();
	}
}

export function useTabReselect(tab: TabReselectKey, handler: Listener): void {
	const handlerRef = useRef(handler);
	useEffect(() => {
		handlerRef.current = handler;
	}, [handler]);

	useEffect(() => {
		return subscribeTabReselect(tab, () => {
			handlerRef.current();
		});
	}, [tab]);
}
