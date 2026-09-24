import type { GuildId } from "@/features/guilds/types";

export type UserRole = "user" | "admin";
export type VerificationStatus = "pending" | "approved" | "rejected";

export interface Profile {
	id: string;
	username: string;
	email: string;
	role: UserRole;
	guild?: GuildId | null;
	created_at: string;
	updated_at: string;
}

export interface IdVerification {
	id: string;
	user_id: string;
	document_url: string;
	status: VerificationStatus;
	rejection_reason: string | null;
	reviewed_by: string | null;
	reviewed_at: string | null;
	created_at: string;
	updated_at: string;
}
