import { create } from "zustand";

import { formatLastSeen, isUserOnline } from "./utils/presence-format";

interface PresenceStoreState {
	onlineUserIds: Set<string>;
	viewerShowActiveStatus: boolean;
	setOnlineUserIds: (ids: Set<string>) => void;
	setViewerShowActiveStatus: (enabled: boolean) => void;
	isUserOnline: (
		targetUserId: string | undefined | null,
		targetShowActiveStatus?: boolean,
	) => boolean;
	getLastSeenText: (
		lastSeenAt: string | null | undefined,
		targetShowActiveStatus?: boolean,
	) => string | null;
	resetPresence: () => void;
}

export const usePresenceStore = create<PresenceStoreState>((set, get) => ({
	onlineUserIds: new Set<string>(),
	viewerShowActiveStatus: true,

	setOnlineUserIds: (ids) => set({ onlineUserIds: ids }),

	setViewerShowActiveStatus: (enabled) =>
		set({ viewerShowActiveStatus: enabled }),

	isUserOnline: (targetUserId, targetShowActiveStatus = true) => {
		const { onlineUserIds, viewerShowActiveStatus } = get();
		return isUserOnline(
			targetUserId,
			onlineUserIds,
			viewerShowActiveStatus,
			targetShowActiveStatus,
		);
	},

	getLastSeenText: (lastSeenAt, targetShowActiveStatus = true) => {
		const { viewerShowActiveStatus } = get();
		return formatLastSeen(
			lastSeenAt,
			viewerShowActiveStatus,
			targetShowActiveStatus,
		);
	},

	resetPresence: () =>
		set({
			onlineUserIds: new Set<string>(),
			viewerShowActiveStatus: true,
		}),
}));
