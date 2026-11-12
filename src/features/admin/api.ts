import type { IdVerification, UserRole } from "@auth/types";
import { supabase } from "@lib/supabase";

import { fetchFeedPosts, normalizePostTags } from "@/features/posts/api";
import type { Post } from "@/features/posts/types";

import type {
	AdminPostVisibilityFilter,
	AdminStats,
	AdminUserItem,
	AdminVerificationItem,
	VerificationFilter,
} from "./types";

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export async function getDocumentPreviewUrl(filePath: string): Promise<string> {
	if (!filePath) return "";
	if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
		return filePath;
	}

	const now = Date.now();
	const cached = signedUrlCache.get(filePath);
	if (cached && cached.expiresAt > now + 60000) {
		return cached.url;
	}

	try {
		const { data, error } = await supabase.storage
			.from("id-documents")
			.createSignedUrl(filePath, 3600);

		if (!error && data?.signedUrl) {
			signedUrlCache.set(filePath, {
				url: data.signedUrl,
				expiresAt: now + 3600 * 1000,
			});
			return data.signedUrl;
		}
	} catch {}

	const { data: pubData } = supabase.storage
		.from("id-documents")
		.getPublicUrl(filePath);

	return pubData?.publicUrl || "";
}

export async function fetchAdminStats(): Promise<AdminStats> {
	const { count: totalUsersCount, error: usersErr } = await supabase
		.from("profiles")
		.select("*", { count: "exact", head: true });

	if (usersErr) throw usersErr;

	const [pendingRes, approvedRes, rejectedRes, postsRes] = await Promise.all([
		supabase
			.from("id_verifications")
			.select("*", { count: "exact", head: true })
			.eq("status", "pending"),
		supabase
			.from("id_verifications")
			.select("*", { count: "exact", head: true })
			.eq("status", "approved"),
		supabase
			.from("id_verifications")
			.select("*", { count: "exact", head: true })
			.eq("status", "rejected"),
		supabase.from("posts").select("*", { count: "exact", head: true }),
	]);

	return {
		totalUsers: totalUsersCount || 0,
		totalPosts: postsRes.count || 0,
		pendingVerifications: pendingRes.count || 0,
		approvedVerifications: approvedRes.count || 0,
		rejectedVerifications: rejectedRes.count || 0,
	};
}

const VERIFICATION_PROJECTION =
	"id, user_id, document_url, status, rejection_reason, reviewed_by, reviewed_at, created_at, updated_at";
const PROFILE_PROJECTION =
	"id, username, display_name, email, avatar_url, role, guild, created_at, updated_at";

export async function fetchAdminVerifications(
	filter: VerificationFilter = "all",
	search = "",
	limit = 50,
	offset = 0,
): Promise<AdminVerificationItem[]> {
	let query = supabase
		.from("id_verifications")
		.select(VERIFICATION_PROJECTION)
		.order("created_at", { ascending: false });

	if (filter !== "all") {
		query = query.eq("status", filter);
	}

	query = query.range(offset, offset + limit - 1);

	const { data: verifications, error } = await query;
	if (error) throw error;
	if (!verifications || verifications.length === 0) return [];

	const userIds = Array.from(new Set(verifications.map((v) => v.user_id)));
	const { data: profiles, error: profErr } = await supabase
		.from("profiles")
		.select(PROFILE_PROJECTION)
		.in("id", userIds);

	if (profErr) throw profErr;

	const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

	let items: AdminVerificationItem[] = verifications.map((v) => ({
		...v,
		profile: profileMap.get(v.user_id) || null,
		documentSignedUrl: null,
	}));

	if (search.trim()) {
		const s = search.trim().toLowerCase();
		items = items.filter((item) => {
			const uname = item.profile?.username?.toLowerCase() || "";
			const email = item.profile?.email?.toLowerCase() || "";
			const uid = item.user_id.toLowerCase();
			return uname.includes(s) || email.includes(s) || uid.includes(s);
		});
	}

	return items;
}

export async function approveVerification(
	verificationId: string,
	adminId: string,
): Promise<void> {
	const now = new Date().toISOString();
	const { error } = await supabase
		.from("id_verifications")
		.update({
			status: "approved",
			reviewed_by: adminId,
			reviewed_at: now,
			rejection_reason: null,
			updated_at: now,
		})
		.eq("id", verificationId);

	if (error) throw error;
}

export async function rejectVerification(
	verificationId: string,
	adminId: string,
	reason: string,
): Promise<void> {
	const now = new Date().toISOString();
	const { error } = await supabase
		.from("id_verifications")
		.update({
			status: "rejected",
			reviewed_by: adminId,
			reviewed_at: now,
			rejection_reason: reason.trim(),
			updated_at: now,
		})
		.eq("id", verificationId);

	if (error) throw error;
}

export async function fetchAdminUsers(
	search = "",
	roleFilter?: string,
	limit = 50,
	offset = 0,
): Promise<AdminUserItem[]> {
	let query = supabase
		.from("profiles")
		.select(PROFILE_PROJECTION)
		.order("created_at", { ascending: false });

	if (roleFilter && roleFilter !== "all") {
		query = query.eq("role", roleFilter);
	}

	if (search.trim()) {
		const s = search.trim();
		query = query.or(`username.ilike.%${s}%,email.ilike.%${s}%`);
	}

	query = query.range(offset, offset + limit - 1);

	const { data: profiles, error } = await query;
	if (error) throw error;
	if (!profiles || profiles.length === 0) return [];

	const userIds = profiles.map((p) => p.id);
	const { data: verifications } = await supabase
		.from("id_verifications")
		.select(VERIFICATION_PROJECTION)
		.in("user_id", userIds)
		.order("created_at", { ascending: false });

	const verifMap = new Map<string, IdVerification>();
	for (const v of verifications || []) {
		if (!verifMap.has(v.user_id)) {
			verifMap.set(v.user_id, v as IdVerification);
		}
	}

	const items: AdminUserItem[] = profiles.map((p) => ({
		...p,
		verification: verifMap.get(p.id) || null,
	}));

	return items;
}

export async function updateUserRole(
	userId: string,
	newRole: UserRole,
): Promise<void> {
	const { error } = await supabase
		.from("profiles")
		.update({
			role: newRole,
			updated_at: new Date().toISOString(),
		})
		.eq("id", userId);

	if (error) throw error;
}

export async function fetchAdminPosts(
	search = "",
	visibilityFilter: AdminPostVisibilityFilter = "all",
): Promise<Post[]> {
	const feedResult = await fetchFeedPosts(
		"all",
		"new",
		undefined,
		null,
		true,
		100,
	);
	let posts = feedResult.items;

	if (visibilityFilter !== "all") {
		posts = posts.filter((p) => p.visibility === visibilityFilter);
	}

	if (search.trim()) {
		const s = search.trim().toLowerCase();
		const cleanTag = s.replace(/^#+/, "");
		posts = posts.filter((p) => {
			const titleMatch = p.title?.toLowerCase().includes(s);
			const contentMatch = p.content?.toLowerCase().includes(s);
			const authorMatch =
				p.author?.username?.toLowerCase().includes(s) ||
				p.author?.display_name?.toLowerCase().includes(s) ||
				p.author?.email?.toLowerCase().includes(s);
			const guildMatch = p.guild?.toLowerCase().includes(s);
			const tagsMatch = normalizePostTags(p.tags).some((t) =>
				t.toLowerCase().replace(/^#+/, "").includes(cleanTag),
			);
			return (
				titleMatch ||
				contentMatch ||
				authorMatch ||
				guildMatch ||
				tagsMatch
			);
		});
	}

	return posts;
}
