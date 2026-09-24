import type { IdVerification, UserRole } from "@auth/types";
import { supabase } from "@lib/supabase";

import type {
	AdminStats,
	AdminUserItem,
	AdminVerificationItem,
	VerificationFilter,
} from "./types";

/**
 * Get signed or public URL to securely view uploaded student ID document.
 */
export async function getDocumentPreviewUrl(filePath: string): Promise<string> {
	if (!filePath) return "";
	if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
		return filePath;
	}

	try {
		// Attempt signed URL for private storage bucket
		const { data, error } = await supabase.storage
			.from("id-documents")
			.createSignedUrl(filePath, 3600); // 1 hour access

		if (!error && data?.signedUrl) {
			return data.signedUrl;
		}
	} catch {
		// fallback to public URL
	}

	const { data: pubData } = supabase.storage
		.from("id-documents")
		.getPublicUrl(filePath);

	return pubData?.publicUrl || "";
}

/**
 * Fetch top-level metrics for admin dashboard.
 */
export async function fetchAdminStats(): Promise<AdminStats> {
	// Query profiles count
	const { count: totalUsersCount, error: usersErr } = await supabase
		.from("profiles")
		.select("*", { count: "exact", head: true });

	if (usersErr) throw usersErr;

	// Query verifications counts
	const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
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
	]);

	return {
		totalUsers: totalUsersCount || 0,
		pendingVerifications: pendingRes.count || 0,
		approvedVerifications: approvedRes.count || 0,
		rejectedVerifications: rejectedRes.count || 0,
	};
}

/**
 * Fetch verifications list with profiles and document URLs.
 */
export async function fetchAdminVerifications(
	filter: VerificationFilter = "all",
	search = "",
): Promise<AdminVerificationItem[]> {
	let query = supabase
		.from("id_verifications")
		.select("*")
		.order("created_at", { ascending: false });

	if (filter !== "all") {
		query = query.eq("status", filter);
	}

	const { data: verifications, error } = await query;
	if (error) throw error;
	if (!verifications || verifications.length === 0) return [];

	// Fetch associated profiles
	const userIds = Array.from(new Set(verifications.map((v) => v.user_id)));
	const { data: profiles, error: profErr } = await supabase
		.from("profiles")
		.select("*")
		.in("id", userIds);

	if (profErr) throw profErr;

	const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

	// Assemble items
	const items: AdminVerificationItem[] = await Promise.all(
		verifications.map(async (v) => {
			const prof = profileMap.get(v.user_id) || null;
			let previewUrl = "";
			try {
				previewUrl = await getDocumentPreviewUrl(v.document_url);
			} catch {
				previewUrl = "";
			}
			return {
				...v,
				profile: prof,
				documentSignedUrl: previewUrl,
			};
		}),
	);

	// Filter by search query if supplied (matches username, email, or user_id)
	if (search.trim()) {
		const s = search.trim().toLowerCase();
		return items.filter((item) => {
			const uname = item.profile?.username?.toLowerCase() || "";
			const email = item.profile?.email?.toLowerCase() || "";
			const uid = item.user_id.toLowerCase();
			return uname.includes(s) || email.includes(s) || uid.includes(s);
		});
	}

	return items;
}

/**
 * Approve student ID verification.
 */
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

/**
 * Reject student ID verification with reason.
 */
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

/**
 * Fetch all registered users for admin directory.
 */
export async function fetchAdminUsers(
	search = "",
	roleFilter?: string,
): Promise<AdminUserItem[]> {
	let query = supabase
		.from("profiles")
		.select("*")
		.order("created_at", { ascending: false });

	if (roleFilter && roleFilter !== "all") {
		query = query.eq("role", roleFilter);
	}

	const { data: profiles, error } = await query;
	if (error) throw error;
	if (!profiles || profiles.length === 0) return [];

	// Fetch latest verification for each user
	const userIds = profiles.map((p) => p.id);
	const { data: verifications } = await supabase
		.from("id_verifications")
		.select("*")
		.in("user_id", userIds)
		.order("created_at", { ascending: false });

	const verifMap = new Map<string, IdVerification>();
	for (const v of verifications || []) {
		if (!verifMap.has(v.user_id)) {
			verifMap.set(v.user_id, v);
		}
	}

	const items: AdminUserItem[] = profiles.map((p) => ({
		...p,
		verification: verifMap.get(p.id) || null,
	}));

	if (search.trim()) {
		const s = search.trim().toLowerCase();
		return items.filter((item) => {
			const uname = item.username?.toLowerCase() || "";
			const email = item.email?.toLowerCase() || "";
			return uname.includes(s) || email.includes(s);
		});
	}

	return items;
}

/**
 * Update user role (promote to admin or demote to user).
 */
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
