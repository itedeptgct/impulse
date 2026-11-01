import type { GuildId } from "@/features/guilds/types";

export type VoteType = 1 | -1 | 0;
export type PostVisibility = "public" | "house";

export interface PostAuthor {
	id: string;
	username: string;
	display_name?: string | null;
	avatar_url?: string | null;
	email?: string;
	role?: string;
	guild?: GuildId | null;
}

export interface Post {
	id: string;
	author_id: string;
	author: PostAuthor;
	title: string;
	content: string;
	visibility: PostVisibility;
	code_snippet?: string | null;
	code_language?: string | null;
	image_url?: string | null;
	guild?: GuildId | null;
	tags: string[];
	upvotes_count: number;
	downvotes_count: number;
	comments_count: number;
	user_vote?: VoteType;
	created_at: string;
	updated_at?: string;
}

export interface Comment {
	id: string;
	post_id: string;
	author_id: string;
	author: PostAuthor;
	content: string;
	parent_id?: string | null;
	reply_to_username?: string | null;
	created_at: string;
}

export type FeedSort = "new" | "top";
export type FeedGuildFilter = "all" | GuildId;

export interface CreatePostInput {
	title: string;
	content: string;
	visibility?: PostVisibility;
	guild?: GuildId | null;
	code_snippet?: string | null;
	code_language?: string | null;
	image_url?: string | null;
	tags?: string[];
}
