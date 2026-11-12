import type { Comment } from "../types";

export const MAX_VISUAL_DEPTH = 4;

export interface CommentTreeNode {
	comment: Comment;
	replies: CommentTreeNode[];
	depth: number;
}

function createsCycle(
	commentId: string,
	parentId: string | null | undefined,
	parentById: Map<string, string | null | undefined>,
): boolean {
	const visited = new Set<string>([commentId]);
	let current = parentId;
	while (current) {
		if (visited.has(current)) return true;
		visited.add(current);
		current = parentById.get(current);
	}
	return false;
}

export function buildCommentTree(comments: Comment[]): CommentTreeNode[] {
	const nodeMap = new Map<string, CommentTreeNode>();
	const parentById = new Map<string, string | null | undefined>();

	for (const comment of comments) {
		nodeMap.set(comment.id, {
			comment,
			replies: [],
			depth: 0,
		});
		parentById.set(comment.id, comment.parent_id);
	}

	const roots: CommentTreeNode[] = [];

	for (const comment of comments) {
		const node = nodeMap.get(comment.id);
		if (!node) continue;

		const parentId = comment.parent_id;
		const parentNode = parentId ? nodeMap.get(parentId) : undefined;

		if (
			parentNode &&
			parentId &&
			!createsCycle(comment.id, parentId, parentById)
		) {
			parentNode.replies.push(node);
		} else {
			roots.push(node);
		}
	}

	const assignDepth = (nodes: CommentTreeNode[], depth: number) => {
		for (const node of nodes) {
			node.depth = depth;
			if (node.replies.length > 0) {
				assignDepth(node.replies, depth + 1);
			}
		}
	};

	assignDepth(roots, 0);
	return roots;
}

export function countSubtreeReplies(node: CommentTreeNode): number {
	let count = node.replies.length;
	for (const child of node.replies) {
		count += countSubtreeReplies(child);
	}
	return count;
}
