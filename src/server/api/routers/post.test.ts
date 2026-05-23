import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.DATABASE_URL ??= "postgresql://user:password@localhost:5432/test";
});

import {
  getReadablePostWhere,
  publicPostWhere,
  publicReadablePostWhere,
} from "@/server/api/routers/post";

vi.mock("@/server/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  db: {},
}));

vi.mock("server-only", () => ({}));

const postId = "clx0a1b2c0000abcd1234efgh";

describe("post visibility filters", () => {
  it("limits the global feed filter to posts shown in the feed", () => {
    expect(publicPostWhere).toMatchObject({
      hiddenAt: null,
      showInFeed: true,
    });
  });

  it("does not require showInFeed for publicly readable direct/profile posts", () => {
    expect(publicReadablePostWhere).toMatchObject({
      hiddenAt: null,
    });
    expect(publicReadablePostWhere).not.toHaveProperty("showInFeed");
  });

  it("allows direct post pages to read profile-only public posts", () => {
    expect(getReadablePostWhere({ postId })).toEqual({
      id: postId,
      ...publicReadablePostWhere,
    });
  });
});
