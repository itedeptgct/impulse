import type { InfiniteData } from "@tanstack/react-query";

import type { PaginatedPosts, Post } from "../types";

export function flattenUniquePosts(
	pages: PaginatedPosts[] | undefined,
): Post[] {
	if (!pages || pages.length === 0) return [];
	const seen = new Set<string>();
	const result: Post[] = [];
	for (const page of pages) {
		for (const post of page.items) {
			if (!seen.has(post.id)) {
				seen.add(post.id);
				result.push(post);
			}
		}
	}
	return result;
}

export function patchPostInInfinitePages(
	data: InfiniteData<PaginatedPosts> | undefined,
	postId: string,
	patch: Partial<Post>,
): InfiniteData<PaginatedPosts> | undefined {
	if (!data) return data;
	let changed = false;
	const pages = data.pages.map((page) => {
		let pageChanged = false;
		const items = page.items.map((p) => {
			if (p.id !== postId) return p;
			pageChanged = true;
			changed = true;
			return { ...p, ...patch };
		});
		return pageChanged ? { ...page, items } : page;
	});
	return changed ? { ...data, pages } : data;
}

export function replacePostInInfinitePages(
	data: InfiniteData<PaginatedPosts> | undefined,
	updated: Post,
): InfiniteData<PaginatedPosts> | undefined {
	if (!data) return data;
	let changed = false;
	const pages = data.pages.map((page) => {
		let pageChanged = false;
		const items = page.items.map((p) => {
			if (p.id !== updated.id) return p;
			pageChanged = true;
			changed = true;
			return updated;
		});
		return pageChanged ? { ...page, items } : page;
	});
	return changed ? { ...data, pages } : data;
}

export function removePostFromInfinitePages(
	data: InfiniteData<PaginatedPosts> | undefined,
	postId: string,
): InfiniteData<PaginatedPosts> | undefined {
	if (!data) return data;
	let changed = false;
	const pages = data.pages.map((page) => {
		const filtered = page.items.filter((p) => p.id !== postId);
		if (filtered.length !== page.items.length) {
			changed = true;
			return { ...page, items: filtered };
		}
		return page;
	});
	return changed ? { ...data, pages } : data;
}
