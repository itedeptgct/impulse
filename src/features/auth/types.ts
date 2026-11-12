import type { GuildId } from "@/features/guilds/types";

export type UserRole = "user" | "house_mod" | "mod" | "admin";
export type VerificationStatus = "pending" | "approved" | "rejected";
export type Course = "BSIT" | "BSCS";
export type YearLevel = 1 | 2 | 3 | 4;

export interface Profile {
	id: string;
	username: string;
	display_name: string;
	email: string;
	role: UserRole;
	guild?: GuildId | null;
	course?: Course | null;
	year_level?: YearLevel | null;
	bio?: string | null;
	avatar_url?: string | null;
	major?: string | null;
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
