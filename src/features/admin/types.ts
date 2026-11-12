import type { IdVerification, Profile } from "@auth/types";

export type VerificationFilter = "all" | "pending" | "approved" | "rejected";
export type AdminPostVisibilityFilter = "all" | "public" | "house";

export interface AdminVerificationItem extends IdVerification {
	profile?: Profile | null;
	documentSignedUrl?: string | null;
}

export interface AdminStats {
	totalUsers: number;
	totalPosts?: number;
	pendingVerifications: number;
	approvedVerifications: number;
	rejectedVerifications: number;
}

export interface AdminUserItem extends Profile {
	verification?: IdVerification | null;
}

export interface VerificationReviewPayload {
	verificationId: string;
	adminId: string;
	status: "approved" | "rejected";
	rejectionReason?: string;
}
