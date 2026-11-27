import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info";

export interface ToastItem {
	id: string;
	variant: ToastVariant;
	message: string;
	title?: string;
	durationMs: number;
}

interface ToastState {
	toasts: ToastItem[];
	show: (
		variant: ToastVariant,
		message: string,
		options?: { title?: string; durationMs?: number },
	) => string;
	dismiss: (id: string) => void;
	clear: () => void;
}

const MAX_VISIBLE_TOASTS = 3;
const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
	success: 3000,
	info: 3000,
	error: 4000,
};

let seq = 0;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function clearToastTimer(id: string) {
	const timer = timers.get(id);
	if (timer) {
		clearTimeout(timer);
		timers.delete(id);
	}
}

export const useToastStore = create<ToastState>((set, get) => ({
	toasts: [],

	show: (variant, message, options) => {
		const id = `toast-${Date.now()}-${++seq}`;
		const durationMs = options?.durationMs ?? DEFAULT_DURATIONS[variant];
		const item: ToastItem = {
			id,
			variant,
			message,
			title: options?.title,
			durationMs,
		};

		set((state) => {
			const next = [item, ...state.toasts];
			const evicted = next.slice(MAX_VISIBLE_TOASTS);
			for (const old of evicted) {
				clearToastTimer(old.id);
			}
			return { toasts: next.slice(0, MAX_VISIBLE_TOASTS) };
		});

		if (durationMs > 0) {
			const timer = setTimeout(() => {
				timers.delete(id);
				get().dismiss(id);
			}, durationMs);
			timers.set(id, timer);
		}

		return id;
	},

	dismiss: (id) => {
		clearToastTimer(id);
		set((state) => {
			if (!state.toasts.some((t) => t.id === id)) {
				return state;
			}
			return { toasts: state.toasts.filter((t) => t.id !== id) };
		});
	},

	clear: () => {
		for (const timer of timers.values()) {
			clearTimeout(timer);
		}
		timers.clear();
		set({ toasts: [] });
	},
}));

export const toast = {
	success: (message: string, title?: string) =>
		useToastStore.getState().show("success", message, { title }),
	error: (message: string, title?: string) =>
		useToastStore.getState().show("error", message, { title }),
	info: (message: string, title?: string) =>
		useToastStore.getState().show("info", message, { title }),
	dismiss: (id: string) => useToastStore.getState().dismiss(id),
	clear: () => useToastStore.getState().clear(),
};
