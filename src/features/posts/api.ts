import { supabase } from "@lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
	Comment,
	CreatePostInput,
	FeedGuildFilter,
	FeedSort,
	Post,
	PostAuthor,
	VoteType,
} from "./types";

const STORAGE_POSTS_KEY = "impulse_posts_cache_v2";
const STORAGE_COMMENTS_KEY = "impulse_comments_cache_v2";
const STORAGE_VOTES_KEY = "impulse_votes_cache_v2";

/**
 * Helper to get local cached posts
 */
async function getCachedPosts(): Promise<Post[]> {
	try {
		const raw = await AsyncStorage.getItem(STORAGE_POSTS_KEY);
		if (raw) {
			return JSON.parse(raw);
		}
	} catch {
		// fallback
	}
	return [];
}

/**
 * Helper to save local cached posts
 */
async function saveCachedPosts(posts: Post[]): Promise<void> {
	try {
		await AsyncStorage.setItem(STORAGE_POSTS_KEY, JSON.stringify(posts));
	} catch {
		// ignored
	}
}

/**
 * Helper to get local comments
 */
async function getCachedComments(): Promise<Record<string, Comment[]>> {
	try {
		const raw = await AsyncStorage.getItem(STORAGE_COMMENTS_KEY);
		if (raw) {
			return JSON.parse(raw);
		}
	} catch {
		// fallback
	}
	return {};
}

/**
 * Helper to save local comments
 */
async function saveCachedComments(
	comments: Record<string, Comment[]>,
): Promise<void> {
	try {
		await AsyncStorage.setItem(
			STORAGE_COMMENTS_KEY,
			JSON.stringify(comments),
		);
	} catch {
		// ignored
	}
}

/**
 * Helper to get user's vote cache
 */
async function getCachedVotes(
	userId: string,
): Promise<Record<string, VoteType>> {
	try {
		const raw = await AsyncStorage.getItem(
			`${STORAGE_VOTES_KEY}_${userId}`,
		);
		if (raw) {
			return JSON.parse(raw);
		}
	} catch {
		// fallback
	}
	return {};
}

/**
 * Helper to save user's vote cache
 */
async function saveCachedVotes(
	userId: string,
	votes: Record<string, VoteType>,
): Promise<void> {
	try {
		await AsyncStorage.setItem(
			`${STORAGE_VOTES_KEY}_${userId}`,
			JSON.stringify(votes),
		);
	} catch {
		// ignored
	}
}

import { filterPostsForUser, isPostRestricted } from "./utils/filter";
import { filterPostsByQuery } from "./utils/search-filter";

export { filterPostsForUser, filterPostsByQuery, isPostRestricted };

/**
 * Fetch posts with audience visibility filtering, sorting, and user vote status.
 */
export async function fetchFeedPosts(
	filter: FeedGuildFilter = "all",
	sort: FeedSort = "new",
	userId?: string,
	userGuild?: string | null,
): Promise<Post[]> {
	let posts: Post[] = [];
	let userVotes: Record<string, VoteType> = {};

	if (userId) {
		userVotes = await getCachedVotes(userId);
	}

	try {
		// 1. Attempt Supabase query
		let query = supabase
			.from("posts")
			.select(
				"*, author:author_id(id, username, display_name, avatar_url, email, role, guild)",
			);

		if (userGuild) {
			query = query.or(
				`visibility.eq.public,and(visibility.eq.house,guild.eq.${userGuild})`,
			);
		} else {
			query = query.eq("visibility", "public");
		}

		if (filter !== "all") {
			query = query.eq("guild", filter);
		}

		if (sort === "new") {
			query = query.order("created_at", { ascending: false });
		} else if (sort === "top") {
			query = query.order("upvotes_count", { ascending: false });
		}

		const { data, error } = await query;
		if (!error && data && data.length > 0) {
			posts = data.map((item: any) => {
				const authorObj = Array.isArray(item.author)
					? item.author[0]
					: item.author;
				return {
					...item,
					author: authorObj || {
						id: item.author_id,
						username: "User",
						display_name: "User",
						role: "user",
					},
					user_vote: userVotes[item.id] ?? 0,
				};
			});
		} else {
			// Fallback to cache if table doesn't exist or is empty
			posts = await getCachedPosts();
		}
	} catch {
		// Network or remote schema error: fallback to local cache
		posts = await getCachedPosts();
	}

	// Filter by audience visibility for cached or returned posts
	posts = filterPostsForUser(posts, userGuild, userId);

	// Attach user votes to cached posts
	posts = posts.map((p) => ({
		...p,
		user_vote: userVotes[p.id] ?? p.user_vote ?? 0,
	}));

	// Apply filter if not all
	if (filter !== "all") {
		posts = posts.filter((p) => p.guild === filter);
	}

	// Apply sorting
	if (sort === "new") {
		posts.sort(
			(a, b) =>
				new Date(b.created_at).getTime() -
				new Date(a.created_at).getTime(),
		);
	} else if (sort === "top") {
		posts.sort(
			(a, b) =>
				b.upvotes_count -
				b.downvotes_count -
				(a.upvotes_count - a.downvotes_count),
		);
	}

	return posts;
}

/**
 * Create a new Post.
 */
export async function createPost(
	input: CreatePostInput,
	author: PostAuthor,
): Promise<Post> {
	const newPost: Post = {
		id: `post-${Date.now()}`,
		author_id: author.id,
		author,
		title: input.title.trim(),
		content: input.content.trim(),
		visibility: input.visibility || "public",
		code_snippet: input.code_snippet?.trim() || null,
		code_language: input.code_language || null,
		image_url: input.image_url || null,
		guild: input.guild || author.guild || null,
		tags: input.tags || [],
		upvotes_count: 1, // Author upvotes by default
		downvotes_count: 0,
		comments_count: 0,
		user_vote: 1,
		created_at: new Date().toISOString(),
	};

	try {
		const { data, error } = await supabase
			.from("posts")
			.insert({
				author_id: author.id,
				title: newPost.title,
				content: newPost.content,
				visibility: newPost.visibility,
				code_snippet: newPost.code_snippet,
				code_language: newPost.code_language,
				image_url: newPost.image_url,
				guild: newPost.guild,
				tags: newPost.tags,
				upvotes_count: 1,
				downvotes_count: 0,
			})
			.select("*, author:author_id(*)")
			.single();

		if (!error && data) {
			newPost.id = data.id;
		}
	} catch {
		// Local fallback
	}

	// Persist to local cache
	const cached = await getCachedPosts();
	await saveCachedPosts([newPost, ...cached]);

	// Register author vote
	const userVotes = await getCachedVotes(author.id);
	userVotes[newPost.id] = 1;
	await saveCachedVotes(author.id, userVotes);

	return newPost;
}

/**
 * Fetch a single post by ID with audience visibility check and user vote.
 */
export async function fetchPostById(
	postId: string,
	userId?: string,
	userGuild?: string | null,
): Promise<{ post: Post | null; isRestricted?: boolean }> {
	let post: Post | null = null;
	let userVotes: Record<string, VoteType> = {};

	if (userId) {
		userVotes = await getCachedVotes(userId);
	}

	try {
		const { data, error } = await supabase
			.from("posts")
			.select(
				"*, author:author_id(id, username, display_name, avatar_url, email, role, guild)",
			)
			.eq("id", postId)
			.maybeSingle();

		if (!error && data) {
			const authorObj = Array.isArray(data.author)
				? data.author[0]
				: data.author;
			post = {
				...data,
				author: authorObj || {
					id: data.author_id,
					username: "User",
					display_name: "User",
					role: "user",
				},
				user_vote: userVotes[data.id] ?? 0,
			};
		}
	} catch {
		// Fallback to cache
	}

	if (!post) {
		const cached = await getCachedPosts();
		const found = cached.find((p) => p.id === postId);
		if (found) {
			post = {
				...found,
				user_vote: userVotes[found.id] ?? found.user_vote ?? 0,
			};
		}
	}

	if (!post) {
		return { post: null, isRestricted: false };
	}

	// Audience privacy check: house-only posts are restricted to house members
	let activeUserGuild = userGuild;
	if (!activeUserGuild && userId) {
		try {
			activeUserGuild = await AsyncStorage.getItem(
				`impulse_user_guild_${userId}`,
			);
		} catch {
			// ignore
		}
	}

	if (isPostRestricted(post, userId, activeUserGuild)) {
		return { post: null, isRestricted: true };
	}

	return { post, isRestricted: false };
}

/**
 * Handle Upvote / Downvote toggle logic
 */
export async function votePost(
	postId: string,
	userId: string,
	targetVote: 1 | -1,
): Promise<{
	upvotes_count: number;
	downvotes_count: number;
	user_vote: VoteType;
}> {
	const userVotes = await getCachedVotes(userId);
	const currentVote: VoteType = userVotes[postId] ?? 0;

	let newVote: VoteType = 0;
	if (currentVote === targetVote) {
		// Clicking same vote neutralizes
		newVote = 0;
	} else {
		newVote = targetVote;
	}

	userVotes[postId] = newVote;
	await saveCachedVotes(userId, userVotes);

	// Update local post
	const posts = await getCachedPosts();
	const post = posts.find((p) => p.id === postId);

	let upCount = post ? post.upvotes_count : 0;
	let downCount = post ? post.downvotes_count : 0;

	// Reverse previous vote
	if (currentVote === 1) upCount = Math.max(0, upCount - 1);
	if (currentVote === -1) downCount = Math.max(0, downCount - 1);

	// Apply new vote
	if (newVote === 1) upCount += 1;
	if (newVote === -1) downCount += 1;

	if (post) {
		post.upvotes_count = upCount;
		post.downvotes_count = downCount;
		post.user_vote = newVote;
		await saveCachedPosts(posts);
	}

	// Try remote sync
	try {
		await supabase
			.from("posts")
			.update({
				upvotes_count: upCount,
				downvotes_count: downCount,
			})
			.eq("id", postId);
	} catch {
		// Handled gracefully
	}

	return {
		upvotes_count: upCount,
		downvotes_count: downCount,
		user_vote: newVote,
	};
}

/**
 * Fetch comments for a post.
 */
export async function fetchPostComments(postId: string): Promise<Comment[]> {
	try {
		const { data, error } = await supabase
			.from("comments")
			.select("*, author:author_id(id, username, display_name, guild)")
			.eq("post_id", postId)
			.order("created_at", { ascending: true });

		if (!error && data && data.length > 0) {
			return data.map((item: any) => {
				const authorObj = Array.isArray(item.author)
					? item.author[0]
					: item.author;
				return {
					...item,
					author: authorObj || {
						id: item.author_id,
						username: "User",
						display_name: "User",
						guild: null,
					},
				};
			});
		}
	} catch {
		// Local fallback
	}

	const cached = await getCachedComments();
	return cached[postId] || [];
}

/**
 * Add a comment or reply to a post.
 */
export async function addPostComment(
	postId: string,
	author: PostAuthor,
	content: string,
	parentId?: string | null,
	replyToUsername?: string | null,
): Promise<Comment> {
	const newComment: Comment = {
		id: `comment-${Date.now()}`,
		post_id: postId,
		author_id: author.id,
		author,
		content: content.trim(),
		parent_id: parentId || null,
		reply_to_username: replyToUsername || null,
		created_at: new Date().toISOString(),
	};

	try {
		const insertPayload: Record<string, any> = {
			post_id: postId,
			author_id: author.id,
			content: newComment.content,
		};
		if (parentId) {
			insertPayload.parent_id = parentId;
		}
		if (replyToUsername) {
			insertPayload.reply_to_username = replyToUsername;
		}

		const { data, error } = await supabase
			.from("comments")
			.insert(insertPayload)
			.select()
			.single();

		if (!error && data) {
			newComment.id = data.id;
		}
	} catch {
		// Local fallback
	}

	// Update cached comments
	const allComments = await getCachedComments();
	const list = allComments[postId] || [];
	allComments[postId] = [...list, newComment];
	await saveCachedComments(allComments);

	// Update cached post comment count
	const posts = await getCachedPosts();
	const post = posts.find((p) => p.id === postId);
	if (post) {
		post.comments_count += 1;
		await saveCachedPosts(posts);
	}

	return newComment;
}

/**
 * Fetch all posts published by a specific user.
 * If viewing as the author, includes all of their transmissions (both public and house-only).
 * If viewing as another user, respects house audience boundaries.
 */
export async function fetchUserPosts(
	authorId: string,
	viewerId?: string,
	viewerGuild?: string | null,
): Promise<Post[]> {
	let posts: Post[] = [];
	let userVotes: Record<string, VoteType> = {};

	const activeViewerId = viewerId ?? authorId;
	if (activeViewerId) {
		userVotes = await getCachedVotes(activeViewerId);
	}

	let activeViewerGuild = viewerGuild;
	if (!activeViewerGuild && viewerId) {
		try {
			activeViewerGuild = await AsyncStorage.getItem(
				`impulse_user_guild_${viewerId}`,
			);
		} catch {
			// ignore
		}
	}

	const isViewingSelf = Boolean(viewerId && viewerId === authorId);

	try {
		let query = supabase
			.from("posts")
			.select(
				"*, author:author_id(id, username, display_name, avatar_url, email, role, guild)",
			)
			.eq("author_id", authorId);

		if (isViewingSelf) {
			// Author has full clearance to all their own transmissions (public and house)
		} else if (activeViewerGuild) {
			const normGuild = activeViewerGuild.replace("_", "-");
			query = query.or(
				`visibility.eq.public,and(visibility.eq.house,or(guild.eq.${activeViewerGuild},guild.eq.${normGuild}))`,
			);
		} else {
			query = query.eq("visibility", "public");
		}

		query = query.order("created_at", { ascending: false });

		const { data, error } = await query;
		if (!error && data && data.length > 0) {
			const remotePosts = data.map((item: any) => {
				const authorObj = Array.isArray(item.author)
					? item.author[0]
					: item.author;
				return {
					...item,
					author: authorObj || {
						id: item.author_id,
						username: "User",
						display_name: "User",
						role: "user",
					},
					user_vote: userVotes[item.id] ?? 0,
				};
			});
			const cached = await getCachedPosts();
			const cachedUserPosts = cached.filter(
				(p) => p.author_id === authorId,
			);
			const seenIds = new Set(remotePosts.map((p: Post) => p.id));
			const missingLocals = cachedUserPosts.filter(
				(p) => !seenIds.has(p.id),
			);
			posts = [...remotePosts, ...missingLocals];
		} else {
			// Fallback to cache if table doesn't exist, has network error, or returns empty
			const cached = await getCachedPosts();
			posts = cached.filter((p) => p.author_id === authorId);
		}
	} catch {
		// Network or remote schema error: fallback to local cache
		const cached = await getCachedPosts();
		posts = cached.filter((p) => p.author_id === authorId);
	}

	// Filter by audience visibility for cached or returned posts
	if (isViewingSelf) {
		posts = posts.filter((p) => p.author_id === authorId);
	} else {
		posts = posts.filter(
			(p) => !isPostRestricted(p, viewerId, activeViewerGuild),
		);
	}

	// Attach user votes to posts
	posts = posts.map((p) => ({
		...p,
		user_vote: userVotes[p.id] ?? p.user_vote ?? 0,
	}));

	// Sort chronologically (newest first)
	posts.sort(
		(a, b) =>
			new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
	);

	return posts;
}

/**
 * Search posts by query string (matching title, content, or tags),
 * strictly observing house audience boundaries.
 */
export async function searchPosts(
	query: string,
	userId?: string,
	userGuild?: string | null,
): Promise<Post[]> {
	const trimmed = query.trim();
	if (!trimmed) return [];

	let posts: Post[] = [];
	let userVotes: Record<string, VoteType> = {};

	if (userId) {
		userVotes = await getCachedVotes(userId);
	}

	try {
		let supabaseQuery = supabase
			.from("posts")
			.select(
				"*, author:author_id(id, username, display_name, avatar_url, email, role, guild)",
			)
			.or(`title.ilike.%${trimmed}%,content.ilike.%${trimmed}%`);

		if (userGuild) {
			supabaseQuery = supabaseQuery.or(
				`visibility.eq.public,and(visibility.eq.house,guild.eq.${userGuild})`,
			);
		} else {
			supabaseQuery = supabaseQuery.eq("visibility", "public");
		}

		const { data, error } = await supabaseQuery.limit(30);
		if (!error && data) {
			posts = data.map((item: any) => {
				const authorObj = Array.isArray(item.author)
					? item.author[0]
					: item.author;
				return {
					...item,
					author: authorObj || {
						id: item.author_id,
						username: "User",
						display_name: "User",
						role: "user",
					},
					user_vote: userVotes[item.id] ?? 0,
				};
			});
		} else {
			const cached = await getCachedPosts();
			posts = filterPostsByQuery(cached, trimmed, userGuild);
		}
	} catch {
		const cached = await getCachedPosts();
		posts = filterPostsByQuery(cached, trimmed, userGuild);
	}

	return filterPostsByQuery(posts, trimmed, userGuild).map((p) => ({
		...p,
		user_vote: userVotes[p.id] ?? p.user_vote ?? 0,
	}));
}
