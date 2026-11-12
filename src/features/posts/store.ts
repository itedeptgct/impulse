import { create } from "zustand";

export type ComposerTray = "code" | "media";

interface ComposerStore {
	isOpen: boolean;
	initialTray: ComposerTray | null;
	openComposer: (initialTray?: ComposerTray) => void;
	closeComposer: () => void;
	toggleComposer: () => void;
}

export const useComposerStore = create<ComposerStore>((set) => ({
	isOpen: false,
	initialTray: null,
	openComposer: (initialTray) =>
		set({ isOpen: true, initialTray: initialTray ?? null }),
	closeComposer: () => set({ isOpen: false, initialTray: null }),
	toggleComposer: () => set((state) => ({ isOpen: !state.isOpen })),
}));
