// Setup memory localStorage polyfill for test environment
if (typeof globalThis.window === "undefined") {
	const storage = new Map<string, string>();
	(globalThis as any).window = {
		localStorage: {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => storage.set(key, value),
			removeItem: (key: string) => storage.delete(key),
			clear: () => storage.clear(),
		},
	};
}

import { addPostComment, fetchPostComments } from "../api";
import type { PostAuthor } from "../types";

export async function testCommentReplies() {
	const author: PostAuthor = {
		id: "test-user-1",
		username: "alex",
		guild: null,
	};
	const rootComment = await addPostComment(
		"test-post",
		author,
		"Root comment",
	);
	if (!rootComment.id) throw new Error("Root comment failed to create");

	const replyAuthor: PostAuthor = {
		id: "test-user-2",
		username: "sarah",
		guild: null,
	};
	const replyComment = await addPostComment(
		"test-post",
		replyAuthor,
		"Replying to root",
		rootComment.id,
		"alex",
	);

	if (replyComment.parent_id !== rootComment.id) {
		throw new Error(
			`Expected parent_id ${rootComment.id}, got ${replyComment.parent_id}`,
		);
	}
	if (replyComment.reply_to_username !== "alex") {
		throw new Error(
			`Expected reply_to_username 'alex', got ${replyComment.reply_to_username}`,
		);
	}

	const allComments = await fetchPostComments("test-post");
	const foundReply = allComments.find((c) => c.id === replyComment.id);
	if (!foundReply || foundReply.parent_id !== rootComment.id) {
		throw new Error("Reply not properly persisted in comment cache");
	}

	console.log("Comment replies test passed!");
}
