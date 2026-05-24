import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??= "postgresql://user:password@localhost:5432/test";

const { createImageObjectKey, isManagedMediaKey } =
  await import("@/server/storage/yandex");

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

  it("accepts managed structured image keys", () => {
    expect(
      isManagedMediaKey(
        "media/images/user_123/2026/05/clx0a1b2c0000abcd1234efgh/original.jpg",
      ),
    ).toBe(true);
  });

  it("accepts legacy upload keys", () => {
    expect(isManagedMediaKey("uploads/user_123/2026/05/random.jpg")).toBe(true);
  });

  it("rejects parent directory keys", () => {
    expect(isManagedMediaKey("../secret")).toBe(false);
    expect(isManagedMediaKey("uploads/../secret")).toBe(false);
  });

  it("rejects unmanaged paths", () => {
    expect(isManagedMediaKey("other/path")).toBe(false);
  });

  it("rejects empty keys", () => {
    expect(isManagedMediaKey("")).toBe(false);
  });
});

describe("Yandex storage radio keys", () => {
  it("creates structured radio audio object keys", async () => {
    const { createRadioAudioObjectKey } = await import(
      "@/server/storage/yandex"
    );

    const key = createRadioAudioObjectKey({
      contentType: "audio/mpeg",
      date: new Date("2026-05-24T12:00:00.000Z"),
      fileName: " bridge mix!.mp3 ",
    });

    expect(key).toMatch(
      /^radio\/audio\/2026\/05\/_bridge_mix_-[a-f0-9]{32}\.mp3$/,
    );
  });

  it("creates structured radio cover object keys", async () => {
    const { createRadioCoverObjectKey } = await import(
      "@/server/storage/yandex"
    );

    const key = createRadioCoverObjectKey({
      contentType: "image/webp",
      date: new Date("2026-05-24T12:00:00.000Z"),
      fileName: "cover.webp",
    });

    expect(key).toMatch(
      /^radio\/covers\/2026\/05\/cover-[a-f0-9]{32}\.webp$/,
    );
  });
});
