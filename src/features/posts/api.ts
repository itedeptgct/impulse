import {
	getContentTypeFromExtension,
	readUriAsBinary,
} from "@auth/utils/upload-utils";
import { supabase } from "@lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
	Comment,
	CreatePostInput,
	FeedGuildFilter,
	FeedSort,
	PaginatedPosts,
	Post,
	PostAuthor,
	UpdatePostInput,
	VoteType,
} from "./types";

const STORAGE_POSTS_KEY = "impulse_posts_cache_v2";
const STORAGE_COMMENTS_KEY = "impulse_comments_cache_v2";
const STORAGE_VOTES_KEY = "impulse_votes_cache_v2";
const STORAGE_EDITED_POSTS_KEY = "impulse_edited_posts_v1";
const REDDIT_HOT_EPOCH_SECONDS = 1_134_028_003;
const REDDIT_HOT_TIME_SCALE_SECONDS = 45_000;

function getRedditHotScore(
	post: Pick<Post, "upvotes_count" | "downvotes_count" | "created_at">,
): number {
	const score = post.upvotes_count - post.downvotes_count;
	const order = Math.log10(Math.max(Math.abs(score), 1)) * Math.sign(score);
	const createdAtSeconds = new Date(post.created_at).getTime() / 1000;

	return (
		order +
		(createdAtSeconds - REDDIT_HOT_EPOCH_SECONDS) /
			REDDIT_HOT_TIME_SCALE_SECONDS
	);
}

function sortByRedditHotScore(posts: Post[]): Post[] {
	return posts.sort((a, b) => {
		const scoreDifference = getRedditHotScore(b) - getRedditHotScore(a);
		if (scoreDifference !== 0) return scoreDifference;
		return (
			new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
		);
	});
}

async function getEditedPostsMap(): Promise<Record<string, boolean>> {
	try {
		const raw = await AsyncStorage.getItem(STORAGE_EDITED_POSTS_KEY);
		if (raw) {
			return JSON.parse(raw);
		}
	} catch {}
	return {};
}

async function markPostEditedLocal(postId: string): Promise<void> {
	try {
		const map = await getEditedPostsMap();
		map[postId] = true;
		await AsyncStorage.setItem(
			STORAGE_EDITED_POSTS_KEY,
			JSON.stringify(map),
		);
	} catch {}
}

async function getCachedPosts(): Promise<Post[]> {
	try {
		const raw = await AsyncStorage.getItem(STORAGE_POSTS_KEY);
		if (raw) {
			return JSON.parse(raw);
		}
	} catch {}
	return [];
}

async function saveCachedPosts(posts: Post[]): Promise<void> {
	try {
		await AsyncStorage.setItem(STORAGE_POSTS_KEY, JSON.stringify(posts));
	} catch {}
}

async function getCachedComments(): Promise<Record<string, Comment[]>> {
	try {
		const raw = await AsyncStorage.getItem(STORAGE_COMMENTS_KEY);
		if (raw) {
			return JSON.parse(raw);
		}
	} catch {}
	return {};
}

async function saveCachedComments(
	comments: Record<string, Comment[]>,
): Promise<void> {
	try {
		await AsyncStorage.setItem(
			STORAGE_COMMENTS_KEY,
			JSON.stringify(comments),
		);
	} catch {}
}

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
	} catch {}
	return {};
}

async function saveCachedVotes(
	userId: string,
	votes: Record<string, VoteType>,
): Promise<void> {
	try {
		await AsyncStorage.setItem(
			`${STORAGE_VOTES_KEY}_${userId}`,
			JSON.stringify(votes),
		);
	} catch {}
}

import {
	canManagePost,
	computeNextVoteFromRemote,
	filterPostsForUser,
	isAllowedPostMediaAsset,
	isPostEdited,
	isPostRestricted,
	isRemoteMediaUrl,
	normalizePostMedia,
	normalizePostTags,
	resolveMediaUploaderId,
	resolvePostGuild,
	serializePostMediaUrl,
} from "./utils/filter";
import {
	type PostAccessStatus,
	resolvePostAccessState,
} from "./utils/post-access";
import { filterPostsByQuery } from "./utils/search-filter";

export type { PostAccessStatus };
export {
	canManagePost,
	computeNextVoteFromRemote,
	filterPostsByQuery,
	filterPostsForUser,
	isAllowedPostMediaAsset,
	isPostEdited,
	isPostRestricted,
	isRemoteMediaUrl,
	normalizePostMedia,
	normalizePostTags,
	resolveMediaUploaderId,
	resolvePostAccessState,
	resolvePostGuild,
	serializePostMediaUrl,
};

export async function uploadPostMedia(
	userId: string,
	uri: string,
	index = 0,
): Promise<string> {
	const cleanUri = uri.split("?")[0].split("#")[0];
	const extCandidate = cleanUri.includes(".")
		? cleanUri.split(".").pop()?.toLowerCase()
		: null;
	const extension =
		extCandidate && extCandidate.length <= 5 ? extCandidate : "jpg";
	const fallbackMime = getContentTypeFromExtension(extension);
	const { data: binaryData, contentType } = await readUriAsBinary(
		uri,
		fallbackMime,
	);
	const filePath = `${userId}/${Date.now()}-${index}.${extension}`;

	const { data, error } = await supabase.storage
		.from("post-media")
		.upload(filePath, binaryData, {
			contentType,
			upsert: true,
		});

	if (error) throw error;

	const { data: publicData } = supabase.storage
		.from("post-media")
		.getPublicUrl(data.path);

	return publicData.publicUrl;
}

export async function resolveUploadedMediaUrls(
	userId: string,
	urls: string[],
): Promise<string[]> {
	return Promise.all(
		urls.map((url, index) =>
			isRemoteMediaUrl(url)
				? Promise.resolve(url)
				: uploadPostMedia(userId, url, index),
		),
	);
}

async function fetchUserVotesForPosts(
	userId: string,
	postIds: string[],
): Promise<Record<string, VoteType>> {
	const cached = await getCachedVotes(userId);
	if (!userId || postIds.length === 0) return cached;

	try {
		const { data, error } = await supabase
			.from("post_votes")
			.select("post_id, vote")
			.eq("user_id", userId)
			.in("post_id", postIds);

		if (!error && Array.isArray(data)) {
			const nextVotes: Record<string, VoteType> = { ...cached };
			for (const id of postIds) {
				nextVotes[id] = 0;
			}
			for (const row of data) {
				if (row.post_id && (row.vote === 1 || row.vote === -1)) {
					nextVotes[row.post_id] = row.vote;
				}
			}
			await saveCachedVotes(userId, nextVotes);
			return nextVotes;
		}
	} catch {}

	return cached;
}

const POST_PROJECTION =
	"id, author_id, title, content, visibility, guild, code_snippet, code_language, image_url, tags, post_type, event_date, event_location, upvotes_count, downvotes_count, comments_count, is_edited, created_at, updated_at, author:author_id(id, username, display_name, avatar_url, role, guild)";

const LEGACY_POST_PROJECTION =
	"id, author_id, title, content, visibility, guild, code_snippet, code_language, image_url, tags, upvotes_count, downvotes_count, comments_count, is_edited, created_at, updated_at, author:author_id(id, username, display_name, avatar_url, role, guild)";

export async function fetchFeedPosts(
	filter: FeedGuildFilter = "all",
	sort: FeedSort = "new",
	userId?: string,
	userGuild?: string | null,
	isAdmin?: boolean,
	limit = 20,
	offset = 0,
): Promise<PaginatedPosts> {
	let rawPosts: Post[] = [];
	let hasMore = false;
	let isCachedFallback = false;
	let userVotes: Record<string, VoteType> = {};
	const editedMap = await getEditedPostsMap();

	if (userId) {
		userVotes = await getCachedVotes(userId);
	}

	try {
		let query = supabase.from("posts").select(POST_PROJECTION);

		if (!isAdmin) {
			if (filter === "all") {
				query = query.eq("visibility", "public");
			} else {
				query = query.eq("visibility", "house").eq("guild", filter);
			}
		} else {
			if (filter !== "all") {
				query = query.eq("guild", filter);
			}
		}

		if (sort === "new") {
			query = query.order("created_at", { ascending: false });
		} else if (sort === "top") {
			query = query
				.order("upvotes_count", { ascending: false })
				.order("created_at", { ascending: false });
		}

		if (sort !== "hot") {
			query = query.range(offset, offset + limit);
		}

		let { data, error } = await query;

		// Fallback to legacy projection if remote DB lacks post_type column before migration
		if (
			error &&
			(error.code === "42703" || error.message?.includes("post_type"))
		) {
			let legacyQuery = supabase
				.from("posts")
				.select(LEGACY_POST_PROJECTION);
			if (!isAdmin) {
				if (filter === "all") {
					legacyQuery = legacyQuery.eq("visibility", "public");
				} else {
					legacyQuery = legacyQuery
						.eq("visibility", "house")
						.eq("guild", filter);
				}
			} else {
				if (filter !== "all") {
					legacyQuery = legacyQuery.eq("guild", filter);
				}
			}

			if (sort === "new") {
				legacyQuery = legacyQuery.order("created_at", {
					ascending: false,
				});
			} else if (sort === "top") {
				legacyQuery = legacyQuery
					.order("upvotes_count", { ascending: false })
					.order("created_at", { ascending: false });
			}

			if (sort === "hot") {
				legacyQuery = legacyQuery.limit(100);
			} else {
				legacyQuery = legacyQuery.range(offset, offset + limit);
			}

			const retry = await legacyQuery;
			data = retry.data as any;
			error = retry.error;
		}

		if (!error && data && data.length > 0) {
			const mappedPosts = data.map((item: any) => {
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
			if (sort === "hot") {
				const rankedPosts = sortByRedditHotScore(mappedPosts);
				hasMore = rankedPosts.length > offset + limit;
				rawPosts = rankedPosts.slice(offset, offset + limit);
			} else {
				hasMore = mappedPosts.length > limit;
				rawPosts = mappedPosts.slice(0, limit);
			}
		} else if (error) {
			isCachedFallback = true;
		}
	} catch {
		isCachedFallback = true;
	}

	if (isCachedFallback) {
		const cached = await getCachedPosts();
		let filteredCached = filterPostsForUser(
			cached,
			userGuild,
			userId,
			isAdmin,
		);
		if (!isAdmin) {
			if (filter === "all") {
				filteredCached = filteredCached.filter(
					(p) => p.visibility === "public",
				);
			} else {
				filteredCached = filteredCached.filter(
					(p) => p.visibility === "house" && p.guild === filter,
				);
			}
		} else if (filter !== "all") {
			filteredCached = filteredCached.filter((p) => p.guild === filter);
		}

		if (sort === "new") {
			filteredCached.sort(
				(a, b) =>
					new Date(b.created_at).getTime() -
					new Date(a.created_at).getTime(),
			);
		} else if (sort === "top") {
			filteredCached.sort(
				(a, b) =>
					b.upvotes_count -
					b.downvotes_count -
					(a.upvotes_count - a.downvotes_count),
			);
		} else if (sort === "hot") {
			sortByRedditHotScore(filteredCached);
		}

		hasMore = filteredCached.length > offset + limit;
		rawPosts = filteredCached.slice(offset, offset + limit);
	}

	let posts = filterPostsForUser(rawPosts, userGuild, userId, isAdmin);

	if (userId && posts.length > 0) {
		userVotes = await fetchUserVotesForPosts(
			userId,
			posts.map((p) => p.id),
		);
	}

	posts = posts.map((p) => {
		const mediaUrls = normalizePostMedia(p);
		return {
			...p,
			image_urls: mediaUrls,
			image_url: mediaUrls[0] || p.image_url || null,
			is_edited: Boolean(p.is_edited || editedMap[p.id]),
			user_vote: userVotes[p.id] ?? p.user_vote ?? 0,
		};
	});

	if (sort === "top") {
		posts.sort(
			(a, b) =>
				b.upvotes_count -
				b.downvotes_count -
				(a.upvotes_count - a.downvotes_count),
		);
	} else if (sort === "hot") {
		sortByRedditHotScore(posts);
	}

	if (offset === 0 && !isCachedFallback && posts.length > 0) {
		void saveCachedPosts(posts);
	}

	return {
		items: posts,
		hasMore,
		nextOffset: hasMore ? offset + limit : null,
	};
}

export async function createPost(
	input: CreatePostInput,
	author: PostAuthor,
): Promise<Post> {
	const nowIso = new Date().toISOString();
	const rawMediaUrls = normalizePostMedia({
		image_url: input.image_url,
		image_urls: input.image_urls,
	});
	const mediaUrls = await resolveUploadedMediaUrls(author.id, rawMediaUrls);
	const serializedImageUrl = serializePostMediaUrl(
		mediaUrls,
		mediaUrls[0] || null,
	);
	const newPost: Post = {
		id: `post-${Date.now()}`,
		author_id: author.id,
		author,
		title: input.title.trim(),
		content: input.content.trim(),
		visibility: input.visibility || "public",
		code_snippet: input.code_snippet?.trim() || null,
		code_language: input.code_language || null,
		image_url: serializedImageUrl,
		image_urls: mediaUrls,
		guild: input.guild !== undefined ? input.guild : author.guild || null,
		tags: input.tags || [],
		post_type: input.post_type || "post",
		event_date: input.event_date || null,
		event_location: input.event_location || null,
		upvotes_count: 1,
		downvotes_count: 0,
		comments_count: 0,
		user_vote: 1,
		created_at: nowIso,
		updated_at: nowIso,
	};

	const insertPayload: Record<string, unknown> = {
		author_id: author.id,
		title: newPost.title,
		content: newPost.content,
		visibility: newPost.visibility,
		code_snippet: newPost.code_snippet,
		code_language: newPost.code_language,
		image_url: serializedImageUrl,
		guild: newPost.guild,
		tags: newPost.tags,
		post_type: newPost.post_type || "post",
		event_date: newPost.event_date || null,
		event_location: newPost.event_location || null,
		upvotes_count: 1,
		downvotes_count: 0,
	};

	let insertResult = await supabase
		.from("posts")
		.insert(insertPayload)
		.select("*, author:author_id(*)")
		.single();

	if (insertResult.error) {
		// If remote database does not yet have post_type / event columns, fallback gracefully
		const basePayload = { ...insertPayload };
		delete basePayload.post_type;
		delete basePayload.event_date;
		delete basePayload.event_location;

		const retryResult = await supabase
			.from("posts")
			.insert(basePayload)
			.select("*, author:author_id(*)")
			.single();

		if (retryResult.error) {
			throw insertResult.error;
		}
		insertResult = retryResult;
	}

	const data = insertResult.data;

	if (data) {
		newPost.id = data.id;
		newPost.created_at = data.created_at || nowIso;
		newPost.updated_at = data.updated_at || data.created_at || nowIso;
	}

	const { error: voteError } = await supabase.from("post_votes").upsert(
		{
			user_id: author.id,
			post_id: newPost.id,
			vote: 1,
		},
		{ onConflict: "user_id,post_id" },
	);
	if (voteError) throw voteError;

	const cached = await getCachedPosts();
	await saveCachedPosts([newPost, ...cached]);

	const userVotes = await getCachedVotes(author.id);
	userVotes[newPost.id] = 1;
	await saveCachedVotes(author.id, userVotes);

	return newPost;
}

export async function updatePost(
	postId: string,
	input: UpdatePostInput,
): Promise<Post> {
	const nowIso = new Date().toISOString();
	const cached = await getCachedPosts();
	const existing = cached.find((p) => p.id === postId);

	const updatePayload: Record<string, any> = {
		updated_at: nowIso,
	};

	if (input.title !== undefined) {
		updatePayload.title = input.title.trim();
	}
	if (input.content !== undefined) {
		updatePayload.content = input.content.trim();
	}
	if (input.visibility !== undefined) {
		updatePayload.visibility = input.visibility;
	}
	if (input.guild !== undefined) {
		updatePayload.guild = input.guild;
	}
	if (input.code_snippet !== undefined) {
		updatePayload.code_snippet = input.code_snippet?.trim() || null;
	}
	if (input.code_language !== undefined) {
		updatePayload.code_language = input.code_language || null;
	}

	let uploadedMediaUrls: string[] | undefined;
	if (input.image_urls !== undefined || input.image_url !== undefined) {
		const rawMediaUrls = normalizePostMedia({
			image_url: input.image_url,
			image_urls: input.image_urls,
		});
		const { data: authData } = await supabase.auth.getUser();
		const uploaderId = resolveMediaUploaderId(
			authData?.user?.id,
			existing?.author_id,
		);
		uploadedMediaUrls = await resolveUploadedMediaUrls(
			uploaderId,
			rawMediaUrls,
		);
		updatePayload.image_url = serializePostMediaUrl(
			uploadedMediaUrls,
			uploadedMediaUrls[0] || null,
		);
	}
	if (input.tags !== undefined) {
		updatePayload.tags = normalizePostTags(input.tags);
	}

	let { data, error } = await supabase
		.from("posts")
		.update({ ...updatePayload, is_edited: true })
		.eq("id", postId)
		.select(
			"*, author:author_id(id, username, display_name, avatar_url, role, guild)",
		)
		.maybeSingle();

	if (error) {
		const fallbackRes = await supabase
			.from("posts")
			.update(updatePayload)
			.eq("id", postId)
			.select(
				"*, author:author_id(id, username, display_name, avatar_url, role, guild)",
			)
			.maybeSingle();
		data = fallbackRes.data;
		error = fallbackRes.error;
	}

	if (error) throw error;

	let updatedRemote: Post | null = null;
	if (data) {
		const authorObj = Array.isArray(data.author)
			? data.author[0]
			: data.author;
		updatedRemote = {
			...data,
			is_edited: true,
			tags: normalizePostTags(data.tags),
			author: authorObj ||
				existing?.author || {
					id: data.author_id,
					username: "User",
					display_name: "User",
					role: "user",
				},
			user_vote: existing?.user_vote ?? 0,
		};
	}

	await markPostEditedLocal(postId);

	const baseMerged: Post = updatedRemote || {
		...(existing || {
			id: postId,
			author_id: "",
			author: {
				id: "",
				username: "User",
				display_name: "User",
				role: "user",
			},
			title: "",
			content: "",
			visibility: "public",
			tags: [],
			upvotes_count: 0,
			downvotes_count: 0,
			comments_count: 0,
			created_at: new Date(Date.now() - 5000).toISOString(),
		}),
		...updatePayload,
		is_edited: true,
	};
	const mergedMediaUrls =
		uploadedMediaUrls !== undefined
			? uploadedMediaUrls
			: normalizePostMedia(baseMerged);
	const mergedPost: Post = {
		...baseMerged,
		image_urls: mergedMediaUrls,
	};

	const nextCached = existing
		? cached.map((p) => (p.id === postId ? mergedPost : p))
		: [mergedPost, ...cached];
	await saveCachedPosts(nextCached);

	return mergedPost;
}

export async function deletePost(postId: string): Promise<void> {
	const { error } = await supabase.from("posts").delete().eq("id", postId);
	if (error) throw error;

	const cached = await getCachedPosts();
	await saveCachedPosts(cached.filter((p) => p.id !== postId));

	const allComments = await getCachedComments();
	if (allComments[postId]) {
		delete allComments[postId];
		await saveCachedComments(allComments);
	}
}

export async function fetchPostById(
	postId: string,
	userId?: string,
	userGuild?: string | null,
	isAdmin?: boolean,
): Promise<{
	post: Post | null;
	isRestricted?: boolean;
	accessStatus: PostAccessStatus;
}> {
	let post: Post | null = null;
	let userVotes: Record<string, VoteType> = {};
	const editedMap = await getEditedPostsMap();

	if (userId) {
		userVotes = await getCachedVotes(userId);
	}

	let networkError: unknown = null;
	let queryReturnedNull = false;

	try {
		const { data, error } = await supabase
			.from("posts")
			.select(
				"*, author:author_id(id, username, display_name, avatar_url, role, guild)",
			)
			.eq("id", postId)
			.maybeSingle();

		if (error) {
			networkError = error;
		} else if (data) {
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
		} else {
			queryReturnedNull = true;
		}
	} catch (err) {
		networkError = err;
	}

	// When Supabase returns null (and no network error), call get_post_access_status RPC
	if (!networkError && queryReturnedNull) {
		try {
			const { data: rpcStatus, error: rpcError } = await supabase.rpc(
				"get_post_access_status",
				{ p_post_id: postId },
			);

			if (rpcError) {
				networkError = rpcError;
			} else {
				const rawStatus =
					(rpcStatus as PostAccessStatus) || "not_found";
				const accessStatus = resolvePostAccessState(
					rawStatus,
					Boolean(userId),
				);

				if (accessStatus === "not_found") {
					const cached = await getCachedPosts();
					const filtered = cached.filter((p) => p.id !== postId);
					if (filtered.length !== cached.length) {
						await saveCachedPosts(filtered);
					}
					return {
						post: null,
						isRestricted: false,
						accessStatus: "not_found",
					};
				}

				if (
					accessStatus === "restricted" ||
					accessStatus === "unauthenticated"
				) {
					return {
						post: null,
						isRestricted: true,
						accessStatus,
					};
				}

				return {
					post: null,
					isRestricted: false,
					accessStatus,
				};
			}
		} catch (rpcErr) {
			networkError = rpcErr;
		}
	}

	// Only fall back to AsyncStorage cache if the network call itself threw an error (and still enforce isPostRestricted)
	if (networkError) {
		const cached = await getCachedPosts();
		const found = cached.find((p) => p.id === postId);
		if (found) {
			let activeUserGuild = userGuild;
			if (!activeUserGuild && userId) {
				try {
					activeUserGuild = await AsyncStorage.getItem(
						`impulse_user_guild_${userId}`,
					);
				} catch {}
			}

			if (isPostRestricted(found, userId, activeUserGuild, isAdmin)) {
				return {
					post: null,
					isRestricted: true,
					accessStatus: userId ? "restricted" : "unauthenticated",
				};
			}

			const postMediaUrls = normalizePostMedia(found);
			const resolvedPost: Post = {
				...found,
				image_urls: postMediaUrls,
				is_edited: Boolean(found.is_edited || editedMap[found.id]),
				user_vote: userVotes[found.id] ?? found.user_vote ?? 0,
			};

			return {
				post: resolvedPost,
				isRestricted: false,
				accessStatus: "accessible",
			};
		}

		throw networkError;
	}

	if (!post) {
		return { post: null, isRestricted: false, accessStatus: "not_found" };
	}

	let activeUserGuild = userGuild;
	if (!activeUserGuild && userId) {
		try {
			activeUserGuild = await AsyncStorage.getItem(
				`impulse_user_guild_${userId}`,
			);
		} catch {}
	}

	if (isPostRestricted(post, userId, activeUserGuild, isAdmin)) {
		return {
			post: null,
			isRestricted: true,
			accessStatus: userId ? "restricted" : "unauthenticated",
		};
	}

	if (userId) {
		userVotes = await fetchUserVotesForPosts(userId, [post.id]);
	}

	const postMediaUrls = normalizePostMedia(post);
	post = {
		...post,
		image_urls: postMediaUrls,
		is_edited: Boolean(post.is_edited || editedMap[post.id]),
		user_vote: userVotes[post.id] ?? post.user_vote ?? 0,
	};

	return { post, isRestricted: false, accessStatus: "accessible" };
}

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
	const { data: existingVoteRow, error: selectError } = await supabase
		.from("post_votes")
		.select("vote")
		.eq("user_id", userId)
		.eq("post_id", postId)
		.maybeSingle();

	if (selectError) throw selectError;

	const { currentVote, newVote } = computeNextVoteFromRemote(
		existingVoteRow?.vote,
		targetVote,
	);

	if (newVote === 0) {
		const { error: deleteError } = await supabase
			.from("post_votes")
			.delete()
			.eq("user_id", userId)
			.eq("post_id", postId);
		if (deleteError) throw deleteError;
	} else {
		const { error: upsertError } = await supabase.from("post_votes").upsert(
			{
				user_id: userId,
				post_id: postId,
				vote: newVote,
			},
			{ onConflict: "user_id,post_id" },
		);
		if (upsertError) throw upsertError;
	}

	const posts = await getCachedPosts();
	const post = posts.find((p) => p.id === postId);

	let upCount = post ? post.upvotes_count : 0;
	let downCount = post ? post.downvotes_count : 0;

	if (currentVote === 1) upCount = Math.max(0, upCount - 1);
	if (currentVote === -1) downCount = Math.max(0, downCount - 1);

	if (newVote === 1) upCount += 1;
	if (newVote === -1) downCount += 1;

	const { data: remoteCounts } = await supabase
		.from("posts")
		.select("upvotes_count, downvotes_count")
		.eq("id", postId)
		.maybeSingle();

	if (remoteCounts) {
		if (typeof remoteCounts.upvotes_count === "number") {
			upCount = remoteCounts.upvotes_count;
		}
		if (typeof remoteCounts.downvotes_count === "number") {
			downCount = remoteCounts.downvotes_count;
		}
	}

	userVotes[postId] = newVote;
	await saveCachedVotes(userId, userVotes);

	if (post) {
		post.upvotes_count = upCount;
		post.downvotes_count = downCount;
		post.user_vote = newVote;
		await saveCachedPosts(posts);
	}

	return {
		upvotes_count: upCount,
		downvotes_count: downCount,
		user_vote: newVote,
	};
}

export async function fetchPostComments(postId: string): Promise<Comment[]> {
	try {
		const { data, error } = await supabase
			.from("comments")
			.select(
				"id, post_id, author_id, content, parent_id, reply_to_username, is_deleted, updated_at, created_at, author:author_id(id, username, display_name, avatar_url, guild)",
			)
			.eq("post_id", postId)
			.order("created_at", { ascending: true });

		if (!error && data && data.length > 0) {
			return data.map((item: any) => {
				const authorObj = Array.isArray(item.author)
					? item.author[0]
					: item.author;
				return {
					...item,
					is_deleted: Boolean(item.is_deleted),
					updated_at: item.updated_at || null,
					author: authorObj || {
						id: item.author_id,
						username: "User",
						display_name: "User",
						avatar_url: null,
						guild: null,
					},
				};
			});
		}
	} catch {}

	const cached = await getCachedComments();
	return cached[postId] || [];
}

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
		is_deleted: false,
		updated_at: null,
	};

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

	if (error) throw error;

	if (data) {
		newComment.id = data.id;
		newComment.created_at = data.created_at || newComment.created_at;
	}

	const allComments = await getCachedComments();
	const list = allComments[postId] || [];
	allComments[postId] = [...list, newComment];
	await saveCachedComments(allComments);

	const posts = await getCachedPosts();
	const post = posts.find((p) => p.id === postId);
	if (post) {
		post.comments_count += 1;
		await saveCachedPosts(posts);
	}

	return newComment;
}

export async function editComment(
	commentId: string,
	content: string,
): Promise<Comment> {
	const trimmed = content.trim();
	if (!trimmed) {
		throw new Error("Comment cannot be empty");
	}

	const updatedAt = new Date().toISOString();

	const { data, error } = await supabase
		.from("comments")
		.update({
			content: trimmed,
			updated_at: updatedAt,
		})
		.eq("id", commentId)
		.select(
			"id, post_id, author_id, content, parent_id, reply_to_username, is_deleted, updated_at, created_at, author:author_id(id, username, display_name, avatar_url, guild)",
		)
		.single();

	if (error) throw error;

	const authorObj = Array.isArray((data as any)?.author)
		? (data as any).author[0]
		: (data as any)?.author;

	const updatedComment: Comment = {
		...(data as any),
		is_deleted: Boolean((data as any)?.is_deleted),
		updated_at: (data as any)?.updated_at || updatedAt,
		author: authorObj || {
			id: (data as any).author_id,
			username: "User",
			display_name: "User",
			avatar_url: null,
			guild: null,
		},
	};

	const allComments = await getCachedComments();
	const postId = updatedComment.post_id;
	if (allComments[postId]) {
		allComments[postId] = allComments[postId].map((c) =>
			c.id === commentId ? { ...c, ...updatedComment } : c,
		);
		await saveCachedComments(allComments);
	}

	return updatedComment;
}

export async function deleteComment(
	commentId: string,
): Promise<{ mode: "hard" | "soft" }> {
	const { data: replies, error: replyError } = await supabase
		.from("comments")
		.select("id")
		.eq("parent_id", commentId)
		.limit(1);

	if (replyError) throw replyError;

	const hasReplies = Boolean(replies && replies.length > 0);
	const mode: "hard" | "soft" = hasReplies ? "soft" : "hard";

	if (hasReplies) {
		const { error: updateError } = await supabase
			.from("comments")
			.update({
				is_deleted: true,
				content: "",
				updated_at: new Date().toISOString(),
			})
			.eq("id", commentId);

		if (updateError) throw updateError;
	} else {
		const { error: deleteError } = await supabase
			.from("comments")
			.delete()
			.eq("id", commentId);

		if (deleteError) throw deleteError;
	}

	const allComments = await getCachedComments();
	let targetPostId: string | null = null;

	for (const [pId, list] of Object.entries(allComments)) {
		const found = list.find((c) => c.id === commentId);
		if (found) {
			targetPostId = pId;
			if (hasReplies) {
				allComments[pId] = list.map((c) =>
					c.id === commentId
						? {
								...c,
								is_deleted: true,
								content: "",
								updated_at: new Date().toISOString(),
							}
						: c,
				);
			} else {
				allComments[pId] = list.filter((c) => c.id !== commentId);
			}
			break;
		}
	}
	await saveCachedComments(allComments);

	if (targetPostId) {
		const posts = await getCachedPosts();
		const post = posts.find((p) => p.id === targetPostId);
		if (post) {
			post.comments_count = Math.max(0, post.comments_count - 1);
			await saveCachedPosts(posts);
		}
	}

	return { mode };
}

export async function fetchUserPosts(
	authorId: string,
	viewerId?: string,
	viewerGuild?: string | null,
	isAdmin?: boolean,
	limit = 20,
	offset = 0,
): Promise<PaginatedPosts> {
	let rawPosts: Post[] = [];
	let hasMore = false;
	let isCachedFallback = false;
	let userVotes: Record<string, VoteType> = {};
	const editedMap = await getEditedPostsMap();

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
		} catch {}
	}

	const isViewingSelf = Boolean(viewerId && viewerId === authorId);

	try {
		let query = supabase
			.from("posts")
			.select(POST_PROJECTION)
			.eq("author_id", authorId);

		if (isViewingSelf || isAdmin) {
		} else if (activeViewerGuild) {
			const normGuild = activeViewerGuild.replace("_", "-");
			query = query.or(
				`visibility.eq.public,and(visibility.eq.house,or(guild.eq.${activeViewerGuild},guild.eq.${normGuild}))`,
			);
		} else {
			query = query.eq("visibility", "public");
		}

		query = query.order("created_at", { ascending: false });
		query = query.range(offset, offset + limit);

		let { data, error } = await query;

		// Fallback to legacy projection if remote DB lacks post_type column before migration
		if (
			error &&
			(error.code === "42703" || error.message?.includes("post_type"))
		) {
			let legacyQuery = supabase
				.from("posts")
				.select(LEGACY_POST_PROJECTION)
				.eq("author_id", authorId);

			if (!isAdmin) {
				if (activeViewerGuild) {
					const normGuild = activeViewerGuild.replace("_", "-");
					legacyQuery = legacyQuery.or(
						`visibility.eq.public,and(visibility.eq.house,or(guild.eq.${activeViewerGuild},guild.eq.${normGuild}))`,
					);
				} else {
					legacyQuery = legacyQuery.eq("visibility", "public");
				}
			}

			legacyQuery = legacyQuery.order("created_at", { ascending: false });
			legacyQuery = legacyQuery.range(offset, offset + limit);

			const retry = await legacyQuery;
			data = retry.data as any;
			error = retry.error;
		}

		if (!error && data && data.length > 0) {
			hasMore = data.length > limit;
			const sliced = hasMore ? data.slice(0, limit) : data;
			const remotePosts = sliced.map((item: any) => {
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
			if (offset === 0) {
				const cached = await getCachedPosts();
				const cachedUserPosts = cached.filter(
					(p) => p.author_id === authorId,
				);
				const seenIds = new Set(remotePosts.map((p: Post) => p.id));
				const missingLocals = cachedUserPosts.filter(
					(p) => !seenIds.has(p.id),
				);
				rawPosts = [...remotePosts, ...missingLocals].slice(0, limit);
			} else {
				rawPosts = remotePosts;
			}
		} else if (error) {
			isCachedFallback = true;
		}
	} catch {
		isCachedFallback = true;
	}

	if (isCachedFallback) {
		const cached = await getCachedPosts();
		let cachedPosts = cached.filter((p) => p.author_id === authorId);
		if (isViewingSelf || isAdmin) {
		} else {
			cachedPosts = cachedPosts.filter(
				(p) =>
					!isPostRestricted(p, viewerId, activeViewerGuild, isAdmin),
			);
		}
		cachedPosts.sort(
			(a, b) =>
				new Date(b.created_at).getTime() -
				new Date(a.created_at).getTime(),
		);
		hasMore = cachedPosts.length > offset + limit;
		rawPosts = cachedPosts.slice(offset, offset + limit);
	}

	let posts = rawPosts;
	if (isViewingSelf || isAdmin) {
		posts = posts.filter((p) => p.author_id === authorId);
	} else {
		posts = posts.filter(
			(p) => !isPostRestricted(p, viewerId, activeViewerGuild, isAdmin),
		);
	}

	if (activeViewerId && posts.length > 0) {
		userVotes = await fetchUserVotesForPosts(
			activeViewerId,
			posts.map((p) => p.id),
		);
	}

	posts = posts.map((p) => {
		const mediaUrls = normalizePostMedia(p);
		return {
			...p,
			image_urls: mediaUrls,
			image_url: mediaUrls[0] || p.image_url || null,
			is_edited: Boolean(p.is_edited || editedMap[p.id]),
			user_vote: userVotes[p.id] ?? p.user_vote ?? 0,
		};
	});

	posts.sort(
		(a, b) =>
			new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
	);

	return {
		items: posts,
		hasMore,
		nextOffset: hasMore ? offset + limit : null,
	};
}

export async function searchPosts(
	query: string,
	userId?: string,
	userGuild?: string | null,
	isAdmin?: boolean,
): Promise<Post[]> {
	const trimmed = query.trim();
	if (!trimmed) return [];

	let posts: Post[] = [];
	let userVotes: Record<string, VoteType> = {};
	const editedMap = await getEditedPostsMap();

	if (userId) {
		userVotes = await getCachedVotes(userId);
	}

	try {
		let supabaseQuery = supabase
			.from("posts")
			.select(POST_PROJECTION)
			.or(`title.ilike.%${trimmed}%,content.ilike.%${trimmed}%`);

		if (isAdmin) {
		} else if (userGuild) {
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
			posts = filterPostsByQuery(
				cached,
				trimmed,
				userGuild,
				userId,
				isAdmin,
			);
		}
	} catch {
		const cached = await getCachedPosts();
		posts = filterPostsByQuery(cached, trimmed, userGuild, userId, isAdmin);
	}

	const filtered = filterPostsByQuery(
		posts,
		trimmed,
		userGuild,
		userId,
		isAdmin,
	);
	if (userId && filtered.length > 0) {
		userVotes = await fetchUserVotesForPosts(
			userId,
			filtered.map((p) => p.id),
		);
	}

	return filtered.map((p) => ({
		...p,
		image_urls: normalizePostMedia(p),
		is_edited: Boolean(p.is_edited || editedMap[p.id]),
		user_vote: userVotes[p.id] ?? p.user_vote ?? 0,
	}));
}
