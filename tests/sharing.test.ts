import { describe, expect, it } from "bun:test";
import { generatePostSharePayload } from "@/features/posts/utils/share";

describe("Post Sharing Utilities", () => {
  it("generates correct impulse://post deep link payload", () => {
    const payload = generatePostSharePayload({
      id: "abc-123",
      title: "Algorithmic Complexity Notes",
      author: { username: "student42" },
    });

    expect(payload.url).toBe("impulse://post/abc-123");
    expect(payload.message).toContain("impulse://post/abc-123");
    expect(payload.message).toContain("Algorithmic Complexity Notes");
    expect(payload.message).toContain("@student42");
  });

  it("handles posts without author username gracefully", () => {
    const payload = generatePostSharePayload({
      id: "xyz-789",
      title: "Campus Announcement",
    });

    expect(payload.url).toBe("impulse://post/xyz-789");
    expect(payload.message).toContain("impulse://post/xyz-789");
    expect(payload.message).toContain("Campus Announcement");
  });
});
