// tests/permissions.test.ts
import { describe, expect, it } from "bun:test";
import { canManagePost, canCreateDispatch, canSwitchGuild } from "@/features/auth/permissions";

describe("Permission Utilities", () => {
  it("allows authors to manage their own posts regardless of role", () => {
    expect(canManagePost({ author_id: "u1", guild: "octagram" }, "u1", "user", "octagram")).toBe(true);
  });

  it("allows admin to manage any post", () => {
    expect(canManagePost({ author_id: "u2", guild: "octagram" }, "u1", "admin", "blue_jays")).toBe(true);
  });

  it("allows mod to manage any post across houses", () => {
    expect(canManagePost({ author_id: "u2", guild: "octagram" }, "u1", "mod", "blue_jays")).toBe(true);
  });

  it("allows house_mod to manage posts only within their house", () => {
    expect(canManagePost({ author_id: "u2", guild: "octagram" }, "u1", "house_mod", "octagram")).toBe(true);
    expect(canManagePost({ author_id: "u2", guild: "chameleon" }, "u1", "house_mod", "octagram")).toBe(false);
    expect(canManagePost({ author_id: "u2", guild: null }, "u1", "house_mod", "octagram")).toBe(false);
  });

  it("denies regular users from managing other users' posts", () => {
    expect(canManagePost({ author_id: "u2", guild: "octagram" }, "u1", "user", "octagram")).toBe(false);
  });

  it("gates dispatch creation correctly", () => {
    expect(canCreateDispatch("user", "octagram", "octagram")).toBe(false);
    expect(canCreateDispatch("house_mod", "octagram", "octagram")).toBe(true);
    expect(canCreateDispatch("house_mod", "octagram", "chameleon")).toBe(false);
    expect(canCreateDispatch("house_mod", "octagram", null)).toBe(false); // Global dispatch denied to house_mod
    expect(canCreateDispatch("mod", "octagram", null)).toBe(true); // Global dispatch allowed to mod
    expect(canCreateDispatch("admin", null, null)).toBe(true); // Global dispatch allowed to admin
  });

  it("prevents house mods from switching guilds", () => {
    expect(canSwitchGuild("user")).toBe(true);
    expect(canSwitchGuild("mod")).toBe(true);
    expect(canSwitchGuild("admin")).toBe(true);
    expect(canSwitchGuild("house_mod")).toBe(false);
  });
});
