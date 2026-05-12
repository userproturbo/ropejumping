import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

import { MediaStatus, MediaType } from "@/generated/prisma/enums";
import type { db as database } from "@/server/db";
import {
  isMediaReferenced,
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

const createReferenceDb = ({
  profileResult = null,
  userResult = null,
}: {
  profileResult?: { id: string } | null;
  userResult?: { id: string } | null;
} = {}) => {
  const profileFindFirst = vi.fn().mockResolvedValue(profileResult);
  const userFindFirst = vi.fn().mockResolvedValue(userResult);
  const db = {
    event: { findFirst: vi.fn().mockResolvedValue(null) },
    jumpObject: { findFirst: vi.fn().mockResolvedValue(null) },
    post: { findFirst: vi.fn().mockResolvedValue(null) },
    profile: { findFirst: profileFindFirst },
    team: { findFirst: vi.fn().mockResolvedValue(null) },
    user: { findFirst: userFindFirst },
  } as unknown as typeof database;

  return { db, profileFindFirst, userFindFirst };
};

describe("media usage resolution", () => {
  it("detects media references by media id", async () => {
    const { db, profileFindFirst } = createReferenceDb({
      profileResult: { id: "profile" },
    });

    await expect(
      isMediaReferenced(db, {
        id: existingMediaId,
        url: null,
      }),
    ).resolves.toBe(true);
    expect(profileFindFirst).toHaveBeenCalledWith({
      where: { avatarMediaId: existingMediaId },
      select: { id: true },
    });
  });

  it("detects media references by legacy URL fields", async () => {
    const { db, userFindFirst } = createReferenceDb({
      userResult: { id: "user" },
    });

    await expect(
      isMediaReferenced(db, {
        id: existingMediaId,
        url: imageUrl,
      }),
    ).resolves.toBe(true);
    expect(userFindFirst).toHaveBeenCalledWith({
      where: { image: imageUrl },
      select: { id: true },
    });
  });

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
