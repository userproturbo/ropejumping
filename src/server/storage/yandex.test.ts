import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??= "postgresql://user:password@localhost:5432/test";

const { createImageObjectKey } = await import("@/server/storage/yandex");

describe("Yandex storage image keys", () => {
  it("creates structured image object keys", () => {
    const key = createImageObjectKey({
      contentType: "image/webp",
      date: new Date("2026-05-11T12:00:00.000Z"),
      mediaId: "media.abc",
      userId: "user.123",
    });

    expect(key).toBe("media/images/user_123/2026/05/media_abc/original.webp");
    expect(key.startsWith("media/images/")).toBe(true);
    expect(key).toContain("/user_123/");
    expect(key).toContain("/2026/05/");
    expect(key).toContain("/media_abc/");
    expect(key).toMatch(/\/original\.webp$/);
  });

  it("does not include the original file name", () => {
    const key = createImageObjectKey({
      contentType: "image/jpeg",
      date: new Date("2026-05-11T12:00:00.000Z"),
      mediaId: "clx0a1b2c0000abcd1234efgh",
      userId: "user_123",
    });

    expect(key).toBe(
      "media/images/user_123/2026/05/clx0a1b2c0000abcd1234efgh/original.jpg",
    );
    expect(key).not.toContain("holiday-photo");
    expect(key).not.toContain("uploads/");
  });
});
