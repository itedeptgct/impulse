import { describe, expect, it } from "bun:test";
import { getAllBadges, getHighestBadge } from "@/features/auth/utils/badges";

describe("Badge Hierarchy", () => {
	it("returns ADMIN as highest badge when user is admin", () => {
		const badge = getHighestBadge({
			role: "admin",
			isVerified: true,
			guild: "octagram",
		});
		expect(badge?.id).toBe("admin");
		expect(badge?.label).toBe("ADMIN");
	});

	it("returns MOD as highest badge when user is mod", () => {
		const badge = getHighestBadge({
			role: "mod",
			isVerified: true,
			guild: "octagram",
		});
		expect(badge?.id).toBe("mod");
		expect(badge?.label).toBe("MOD");
	});

	it("returns HOUSE MOD as highest badge for house_mod", () => {
		const badge = getHighestBadge({
			role: "house_mod",
			isVerified: true,
			guild: "chameleon",
		});
		expect(badge?.id).toBe("house_mod");
		expect(badge?.label).toBe("HOUSE MOD");
	});

	it("returns VERIFIED over house member for verified regular student", () => {
		const badge = getHighestBadge({
			role: "user",
			isVerified: true,
			guild: "blue_jays",
		});
		expect(badge?.id).toBe("verified");
		expect(badge?.label).toBe("VERIFIED");
	});

	it("returns HOUSE MEMBER when unverified student has a house", () => {
		const badge = getHighestBadge({
			role: "user",
			isVerified: false,
			guild: "octagram",
		});
		expect(badge?.id).toBe("house_member");
		expect(badge?.label).toBe("OCTAGRAM");
	});

	it("returns all applicable badges in descending rank order", () => {
		const badges = getAllBadges({
			role: "house_mod",
			isVerified: true,
			guild: "octagram",
		});
		expect(badges.map((b) => b.id)).toEqual([
			"house_mod",
			"verified",
			"house_member",
		]);
	});

	it("returns null when user has no applicable badge", () => {
		const badge = getHighestBadge({
			role: "user",
			isVerified: false,
			guild: null,
		});
		expect(badge).toBeNull();
		expect(
			getAllBadges({ role: "user", isVerified: false, guild: null }),
		).toEqual([]);
	});

	it("returns all badges for admin correctly", () => {
		const badges = getAllBadges({
			role: "admin",
			isVerified: true,
			guild: "octagram",
		});
		expect(badges.map((b) => b.id)).toEqual([
			"admin",
			"verified",
			"house_member",
		]);
	});
});
