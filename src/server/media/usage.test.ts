import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

import { MediaStatus, MediaType } from "@/generated/prisma/enums";
import type { db as database } from "@/server/db";
import {
  resolveImageMediaForCreate,
  resolveImageMediaForUpdate,
} from "@/server/media/usage";

const currentUserId = "clx0a1b2c0000abcd1234efgh";
const existingMediaId = "clx0a1b2c0000abcd1234efgi";
const newMediaId = "clx0a1b2c0000abcd1234efgj";
const imageUrl = "https://storage.example.com/image.jpg";

const createDb = (findFirst = vi.fn()) =>
  ({
    media: {
      findFirst,
    },
  }) as unknown as typeof database;

describe("media usage resolution", () => {
  it("allows keeping an unchanged existing media relation without ownership validation", async () => {
    const findFirst = vi.fn();
    const db = createDb(findFirst);

    await expect(
      resolveImageMediaForUpdate({
        db,
        existingMediaId,
        existingUrl: imageUrl,
        input: {
          mediaId: existingMediaId,
          url: imageUrl,
        },
        userId: currentUserId,
      }),
    ).resolves.toEqual({
      mediaId: existingMediaId,
      url: imageUrl,
    });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("rejects a new media id not owned by current user", async () => {
    const db = createDb(vi.fn().mockResolvedValue(null));

    await expect(
      resolveImageMediaForUpdate({
        db,
        existingMediaId,
        existingUrl: imageUrl,
        input: {
          mediaId: newMediaId,
          url: "https://storage.example.com/new-image.jpg",
        },
        userId: currentUserId,
      }),
    ).rejects.toBeInstanceOf(TRPCError);
  });

  it("allows clearing an image", async () => {
    const findFirst = vi.fn();
    const db = createDb(findFirst);

    await expect(
      resolveImageMediaForUpdate({
        db,
        existingMediaId,
        existingUrl: imageUrl,
        input: {
          mediaId: null,
          url: null,
        },
        userId: currentUserId,
      }),
    ).resolves.toEqual({
      mediaId: null,
      url: null,
    });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("allows unchanged old URL-only images", async () => {
    const findFirst = vi.fn();
    const db = createDb(findFirst);

    await expect(
      resolveImageMediaForUpdate({
        db,
        existingMediaId: null,
        existingUrl: imageUrl,
        input: {
          mediaId: null,
          url: imageUrl,
        },
        userId: currentUserId,
      }),
    ).resolves.toEqual({
      mediaId: null,
      url: imageUrl,
    });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("validates a new uploaded media id for updates", async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: newMediaId,
      url: "https://storage.example.com/new-image.jpg",
    });
    const db = createDb(findFirst);

    await expect(
      resolveImageMediaForUpdate({
        db,
        existingMediaId,
        existingUrl: imageUrl,
        input: {
          mediaId: newMediaId,
          url: "https://storage.example.com/new-image.jpg",
        },
        userId: currentUserId,
      }),
    ).resolves.toEqual({
      mediaId: newMediaId,
      url: "https://storage.example.com/new-image.jpg",
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        id: newMediaId,
        ownerId: currentUserId,
        status: MediaStatus.UPLOADED,
        type: MediaType.IMAGE,
      },
      select: {
        id: true,
        url: true,
      },
    });
  });

  it("rejects create input with a URL and no media id", async () => {
    const findFirst = vi.fn();
    const db = createDb(findFirst);

    await expect(
      resolveImageMediaForCreate({
        db,
        input: {
          mediaId: null,
          url: imageUrl,
        },
        userId: currentUserId,
      }),
    ).rejects.toMatchObject({
      message: "Загрузите изображение через форму загрузки.",
    });
    expect(findFirst).not.toHaveBeenCalled();
  });
});
