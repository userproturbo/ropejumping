import { describe, expect, it } from "vitest";

import {
  commentCreateInputSchema,
  postCreateInputSchema,
  postPinInputSchema,
  postPublicListInputSchema,
  postUpdateInputSchema,
  postViewInputSchema,
} from "@/lib/validation/post";

const cuid = "clx0a1b2c0000abcd1234efgh";

describe("post validation", () => {
  it("trims create post content", () => {
    const result = postCreateInputSchema.parse({
      content: "  hello feed  ",
      imageUrl: "",
      teamId: "",
      eventId: "",
      objectId: "",
    });

    expect(result.content).toBe("hello feed");
  });

  it("rejects empty and overlong post content", () => {
    expect(postCreateInputSchema.safeParse({ content: "   " }).success).toBe(
      false,
    );
    expect(
      postCreateInputSchema.safeParse({ content: "a".repeat(2001) }).success,
    ).toBe(false);
  });

  it("normalizes empty optional image URL to null", () => {
    const result = postCreateInputSchema.parse({
      content: "post",
      imageUrl: "",
    });

    expect(result.imageUrl).toBeNull();
  });

  it("requires post id for updates", () => {
    expect(
      postUpdateInputSchema.safeParse({
        postId: cuid,
        content: "updated",
        imageUrl: "",
      }).success,
    ).toBe(true);
    expect(
      postUpdateInputSchema.safeParse({
        content: "updated",
        imageUrl: "",
      }).success,
    ).toBe(false);
  });

  it("trims comment content and rejects empty comments", () => {
    expect(
      commentCreateInputSchema.parse({
        postId: cuid,
        content: "  comment  ",
      }).content,
    ).toBe("comment");
    expect(
      commentCreateInputSchema.safeParse({
        postId: cuid,
        content: "   ",
      }).success,
    ).toBe(false);
  });

  it("ignores invalid feed filter slugs", () => {
    const result = postPublicListInputSchema.parse({
      team: "bad slug",
      event: "event-slug",
      object: "@object",
    });

    expect(result.team).toBeUndefined();
    expect(result.event).toBe("event-slug");
    expect(result.object).toBeUndefined();
  });

  it("validates post pin input", () => {
    expect(
      postPinInputSchema.safeParse({
        postId: cuid,
        targetType: "TEAM",
        targetId: cuid,
      }).success,
    ).toBe(true);
    expect(
      postPinInputSchema.safeParse({
        postId: cuid,
        targetType: "GLOBAL",
        targetId: cuid,
      }).success,
    ).toBe(false);
  });

  it("accepts valid post view input", () => {
    const result = postViewInputSchema.parse({
      postId: cuid,
      anonymousViewerId: "anonymous-viewer-123",
    });

    expect(result.postId).toBe(cuid);
    expect(result.anonymousViewerId).toBe("anonymous-viewer-123");
  });

  it("rejects invalid post view post id", () => {
    expect(
      postViewInputSchema.safeParse({
        postId: "bad-id",
        anonymousViewerId: "anonymous-viewer-123",
      }).success,
    ).toBe(false);
  });

  it("rejects too short anonymous viewer ids", () => {
    expect(
      postViewInputSchema.safeParse({
        postId: cuid,
        anonymousViewerId: "short",
      }).success,
    ).toBe(false);
  });

  it("rejects too long anonymous viewer ids", () => {
    expect(
      postViewInputSchema.safeParse({
        postId: cuid,
        anonymousViewerId: "a".repeat(121),
      }).success,
    ).toBe(false);
  });
});
