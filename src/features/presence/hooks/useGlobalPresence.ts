import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { useAuthStore } from "@/features/auth/store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

import { usePresenceStore } from "../store";
import type { PresenceStatePayload } from "../types";

const HEARTBEAT_THROTTLE_MS = 5 * 60 * 1000;

export function useGlobalPresence() {
	const userId = useAuthStore((s) => s.user?.id);
	const showActiveStatus = useAuthStore(
		(s) => s.profile?.show_active_status ?? true,
	);

	const setOnlineUserIds = usePresenceStore((s) => s.setOnlineUserIds);
	const setViewerShowActiveStatus = usePresenceStore(
		(s) => s.setViewerShowActiveStatus,
	);
	const resetPresence = usePresenceStore((s) => s.resetPresence);

	const channelRef = useRef<RealtimeChannel | null>(null);
	const lastHeartbeatRef = useRef<number>(0);

	useEffect(() => {
		setViewerShowActiveStatus(showActiveStatus);
	}, [showActiveStatus, setViewerShowActiveStatus]);

	useEffect(() => {
		if (!isSupabaseConfigured || !userId) {
			resetPresence();
			return;
		}

		const updateLastSeen = async (force = false) => {
			if (!showActiveStatus) return;
			const now = Date.now();
			if (
				!force &&
				now - lastHeartbeatRef.current < HEARTBEAT_THROTTLE_MS
			) {
				return;
			}
			lastHeartbeatRef.current = now;
			await supabase
				.from("profiles")
				.update({ last_seen_at: new Date(now).toISOString() })
				.eq("id", userId);
		};

		const syncChannelPresence = (channel: RealtimeChannel) => {
			const state = channel.presenceState<PresenceStatePayload>();
			const nextIds = new Set<string>();
			for (const entries of Object.values(state)) {
				for (const entry of entries) {
					if (entry.user_id) {
						nextIds.add(entry.user_id);
					}
				}
			}
			setOnlineUserIds(nextIds);
		};

		const trackIfActive = async (
			channel: RealtimeChannel,
			appState: AppStateStatus = AppState.currentState,
		) => {
			if (appState === "active" && showActiveStatus) {
				await channel.track({
					user_id: userId,
					online_at: new Date().toISOString(),
				});
				void updateLastSeen(false);
			} else {
				await channel.untrack();
			}
		};

		const channel = supabase.channel("presence:global", {
			config: { presence: { key: userId } },
		});
		channelRef.current = channel;

		channel
			.on("presence", { event: "sync" }, () => {
				syncChannelPresence(channel);
			})
			.on("presence", { event: "join" }, () => {
				syncChannelPresence(channel);
			})
			.on("presence", { event: "leave" }, () => {
				syncChannelPresence(channel);
			})
			.subscribe((status) => {
				if (status === "SUBSCRIBED") {
					void trackIfActive(channel);
				}
			});

		const appStateSub = AppState.addEventListener("change", (nextState) => {
			if (channelRef.current) {
				void trackIfActive(channelRef.current, nextState);
			}
		});

		return () => {
			appStateSub.remove();
			void channel.untrack();
			void supabase.removeChannel(channel);
			channelRef.current = null;
		};
	}, [userId, showActiveStatus, setOnlineUserIds, resetPresence]);
}
