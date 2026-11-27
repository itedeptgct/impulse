import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import { supabase } from "@/lib/supabase";

import type { Post } from "./types";
import { normalizePostTags } from "./utils/filter";

const BOOKMARKS_KEY_PREFIX = "impulse_bookmarks_v1:";

function isMissingBookmarksTableError(err: unknown): boolean {
	const e = err as { code?: string; message?: string } | null;
	if (!e) return false;
	return (
		e.code === "42P01" ||
		e.code === "PGRST205" ||
		Boolean(e.message?.includes("post_bookmarks"))
	);
}

interface BookmarksState {
	loadedUserId: string | null;
	bookmarkedIds: Record<string, boolean>;
	savedPosts: Post[];
	isLoading: boolean;
	loadBookmarks: (userId: string) => Promise<void>;
	toggleBookmark: (userId: string, post: Post) => Promise<boolean>;
	removeBookmarkLocally: (postId: string) => void;
	reset: () => void;
}

async function persistLocalBookmarks(userId: string, posts: Post[]) {
	try {
		await AsyncStorage.setItem(
			`${BOOKMARKS_KEY_PREFIX}${userId}`,
			JSON.stringify(posts),
		);
	} catch {
		// Ignore local storage errors
	}
}

async function readLocalBookmarks(userId: string): Promise<Post[]> {
	try {
		const raw = await AsyncStorage.getItem(
			`${BOOKMARKS_KEY_PREFIX}${userId}`,
		);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as Post[]) : [];
	} catch {
		return [];
	}
}

function toIdMap(posts: Post[]): Record<string, boolean> {
	const map: Record<string, boolean> = {};
	for (const p of posts) {
		map[p.id] = true;
	}
	return map;
}

export const useBookmarksStore = create<BookmarksState>((set, get) => ({
	loadedUserId: null,
	bookmarkedIds: {},
	savedPosts: [],
	isLoading: false,

	loadBookmarks: async (userId) => {
		if (!userId) return;
		set({ isLoading: true });
		try {
			const localPosts = await readLocalBookmarks(userId);
			if (localPosts.length > 0 && get().savedPosts.length === 0) {
				set({
					loadedUserId: userId,
					savedPosts: localPosts,
					bookmarkedIds: toIdMap(localPosts),
				});
			}

			const { data, error } = await supabase
				.from("post_bookmarks")
				.select(
					`
					post_id,
					created_at,
					post:post_id (
						id,
						author_id,
						title,
						content,
						visibility,
						guild,
						code_snippet,
						code_language,
						image_url,
						tags,
						post_type,
						event_date,
						event_location,
						upvotes_count,
						downvotes_count,
						comments_count,
						is_edited,
						created_at,
						updated_at,
						author:author_id (
							id,
							username,
							display_name,
							avatar_url,
							role,
							guild
						)
					)
				`,
				)
				.eq("user_id", userId)
				.order("created_at", { ascending: false });

			if (error) {
				if (!isMissingBookmarksTableError(error)) {
					throw error;
				}
				set({
					loadedUserId: userId,
					savedPosts: localPosts,
					bookmarkedIds: toIdMap(localPosts),
				});
				return;
			}

			const remotePosts: Post[] = (data || [])
				.map((row: any) => {
					const rawPost = Array.isArray(row.post)
						? row.post[0]
						: row.post;
					if (!rawPost?.id) return null;
					const rawAuthor = Array.isArray(rawPost.author)
						? rawPost.author[0]
						: rawPost.author;
					return {
						...rawPost,
						tags: normalizePostTags(rawPost.tags),
						author: rawAuthor || {
							id: rawPost.author_id,
							username: "User",
							display_name: "User",
							role: "user",
						},
					} as Post;
				})
				.filter((p): p is Post => Boolean(p));

			set({
				loadedUserId: userId,
				savedPosts: remotePosts,
				bookmarkedIds: toIdMap(remotePosts),
			});
			await persistLocalBookmarks(userId, remotePosts);
		} catch {
			// Keep existing state on transient errors
		} finally {
			set({ isLoading: false });
		}
	},

	toggleBookmark: async (userId, post) => {
		const state = get();
		const currentlySaved = Boolean(state.bookmarkedIds[post.id]);
		const nextSaved = !currentlySaved;

		const nextPosts = nextSaved
			? [post, ...state.savedPosts.filter((p) => p.id !== post.id)]
			: state.savedPosts.filter((p) => p.id !== post.id);

		set({
			loadedUserId: userId,
			savedPosts: nextPosts,
			bookmarkedIds: toIdMap(nextPosts),
		});
		await persistLocalBookmarks(userId, nextPosts);

		try {
			if (nextSaved) {
				const { error } = await supabase
					.from("post_bookmarks")
					.upsert({ user_id: userId, post_id: post.id });
				if (error && !isMissingBookmarksTableError(error)) {
					throw error;
				}
			} else {
				const { error } = await supabase
					.from("post_bookmarks")
					.delete()
					.eq("user_id", userId)
					.eq("post_id", post.id);
				if (error && !isMissingBookmarksTableError(error)) {
					throw error;
				}
			}
		} catch {
			// Local state & AsyncStorage already persisted
		}

		return nextSaved;
	},

	removeBookmarkLocally: (postId) => {
		set((state) => {
			if (!state.bookmarkedIds[postId]) return state;
			const nextPosts = state.savedPosts.filter((p) => p.id !== postId);
			return {
				savedPosts: nextPosts,
				bookmarkedIds: toIdMap(nextPosts),
			};
		});
	},

	reset: () => {
		set({
			loadedUserId: null,
			bookmarkedIds: {},
			savedPosts: [],
			isLoading: false,
		});
	},
}));
