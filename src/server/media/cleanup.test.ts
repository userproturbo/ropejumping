import { describe, expect, it, vi, beforeEach } from "vitest";

import { MediaStatus } from "@/generated/prisma/enums";
import type { db as database } from "@/server/db";

const storageMocks = vi.hoisted(() => ({
  deleteYandexStorageObject: vi.fn(),
  getYandexStorageBucket: vi.fn(() => "current-bucket"),
  isManagedMediaKey: vi.fn(
    (key: string) =>
      key.startsWith("media/images/") || key.startsWith("uploads/"),
  ),
}));

vi.mock("@/server/storage/yandex", () => storageMocks);

const { cleanupUnusedMedia, deleteMediaIfUnreferenced } = await import(
  "@/server/media/cleanup"
);

const now = new Date("2026-05-11T12:00:00.000Z");
const oldDate = new Date("2026-05-10T11:00:00.000Z");

type MediaCandidate = {
  bucket?: string;
  createdAt?: Date;
  id: string;
  key?: string;
  status: MediaStatus;
  url?: string | null;
};

type MediaRow = {
  bucket: string;
  createdAt: Date;
  deletedAt: Date | null;
  id: string;
  key: string;
  status: MediaStatus;
  url: string | null;
};

type CleanupFindManyArgs = {
  where: {
    deletedAt: null;
    OR: Array<{ status: MediaStatus }>;
  };
};

type MediaUpdateArgs = {
  data: {
    deletedAt: Date;
    status: MediaStatus;
  };
  where: {
    id: string;
  };
};

const createMedia = ({
  bucket = "current-bucket",
  createdAt = oldDate,
  id,
  key,
  status,
  url = `https://storage.example.com/${id}.jpg`,
}: MediaCandidate): MediaRow => ({
  bucket,
  createdAt,
  deletedAt: null,
  id,
  key: key ?? `media/images/user/2026/05/${id}/original.jpg`,
  status,
  url,
});

const createDb = ({
  candidates = [],
  media = null,
  referencedBy = {},
}: {
  candidates?: MediaRow[];
  media?: MediaRow | null;
  referencedBy?: Partial<
    Record<
      "event" | "jumpObject" | "post" | "profile" | "team" | "user",
      boolean
    > & {
      eventGalleryImage: boolean;
      objectGalleryImage: boolean;
    }
  >;
}) => {
  const mediaFindUnique = vi.fn().mockResolvedValue(media);
  const mediaFindMany = vi
    .fn<(args: CleanupFindManyArgs) => Promise<MediaRow[]>>()
    .mockResolvedValue(candidates);
  const mediaUpdate = vi
    .fn<(args: MediaUpdateArgs) => Promise<unknown>>()
    .mockResolvedValue({});
  const postFindFirst = vi
    .fn()
    .mockResolvedValue(referencedBy.post ? { id: "post" } : null);
  const db = {
    event: {
      findFirst: vi
        .fn()
        .mockResolvedValue(referencedBy.event ? { id: "event" } : null),
    },
    eventGalleryImage: {
      findFirst: vi
        .fn()
        .mockResolvedValue(
          referencedBy.eventGalleryImage ? { id: "event-gallery" } : null,
        ),
    },
    jumpObject: {
      findFirst: vi
        .fn()
        .mockResolvedValue(referencedBy.jumpObject ? { id: "object" } : null),
    },
    objectGalleryImage: {
      findFirst: vi
        .fn()
        .mockResolvedValue(
          referencedBy.objectGalleryImage ? { id: "object-gallery" } : null,
        ),
    },
    media: {
      findMany: mediaFindMany,
      findUnique: mediaFindUnique,
      update: mediaUpdate,
    },
    post: {
      findFirst: postFindFirst,
    },
    profile: {
      findFirst: vi
        .fn()
        .mockResolvedValue(referencedBy.profile ? { id: "profile" } : null),
    },
    team: {
      findFirst: vi
        .fn()
        .mockResolvedValue(referencedBy.team ? { id: "team" } : null),
    },
    user: {
      findFirst: vi
        .fn()
        .mockResolvedValue(referencedBy.user ? { id: "user" } : null),
    },
  } as unknown as typeof database;

  return { db, mediaFindMany, mediaFindUnique, mediaUpdate, postFindFirst };
};

describe("cleanupUnusedMedia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMocks.getYandexStorageBucket.mockReturnValue("current-bucket");
    storageMocks.isManagedMediaKey.mockImplementation(
      (key: string) =>
        key.startsWith("media/images/") || key.startsWith("uploads/"),
    );
  });

  it("does not delete objects during dry run", async () => {
    const { db } = createDb({
      candidates: [createMedia({ id: "pending", status: MediaStatus.PENDING })],
    });

    const result = await cleanupUnusedMedia({ db, now });

    expect(result).toMatchObject({
      checked: 1,
      deleted: 0,
      dryRun: true,
      failed: 0,
      skipped: 0,
    });
    expect(result.items[0]).toMatchObject({
      action: "would_delete",
      id: "pending",
      status: MediaStatus.PENDING,
    });
    expect(storageMocks.deleteYandexStorageObject).not.toHaveBeenCalled();
  });

  it("includes stale PENDING media in cleanup", async () => {
    const { db } = createDb({
      candidates: [createMedia({ id: "pending", status: MediaStatus.PENDING })],
    });

    const result = await cleanupUnusedMedia({ db, now });

    expect(result.items).toEqual([
      expect.objectContaining({
        action: "would_delete",
        id: "pending",
        status: MediaStatus.PENDING,
      }),
    ]);
  });

  it("includes stale FAILED media in cleanup", async () => {
    const { db } = createDb({
      candidates: [createMedia({ id: "failed", status: MediaStatus.FAILED })],
    });

    const result = await cleanupUnusedMedia({ db, now });

    expect(result.items).toEqual([
      expect.objectContaining({
        action: "would_delete",
        id: "failed",
        status: MediaStatus.FAILED,
      }),
    ]);
  });

  it("includes unreferenced stale UPLOADED media in cleanup", async () => {
    const { db } = createDb({
      candidates: [
        createMedia({ id: "uploaded", status: MediaStatus.UPLOADED }),
      ],
    });

    const result = await cleanupUnusedMedia({ db, now });

    expect(result.items).toEqual([
      expect.objectContaining({
        action: "would_delete",
        id: "uploaded",
        status: MediaStatus.UPLOADED,
      }),
    ]);
  });

  it("skips UPLOADED media referenced by app entities", async () => {
    const { db } = createDb({
      candidates: [
        createMedia({ id: "referenced", status: MediaStatus.UPLOADED }),
      ],
      referencedBy: { profile: true },
    });

    const result = await cleanupUnusedMedia({ db, now });

    expect(result).toMatchObject({
      checked: 1,
      skipped: 1,
    });
    expect(result.items[0]).toMatchObject({
      action: "skipped",
      id: "referenced",
      reason: "referenced",
    });
  });

  it("does not select DELETED media as candidates", async () => {
    const { db, mediaFindMany } = createDb({ candidates: [] });

    await cleanupUnusedMedia({ db, now });

    const findManyArgs = mediaFindMany.mock.calls[0]?.[0];
    expect(findManyArgs?.where.deletedAt).toBeNull();
    expect(findManyArgs?.where.OR.map((where) => where.status)).not.toContain(
      MediaStatus.DELETED,
    );
  });

  it("skips media from another bucket", async () => {
    const { db } = createDb({
      candidates: [
        createMedia({
          bucket: "other-bucket",
          id: "other-bucket",
          status: MediaStatus.PENDING,
        }),
      ],
    });

    const result = await cleanupUnusedMedia({ db, now });

    expect(result.items[0]).toMatchObject({
      action: "skipped",
      id: "other-bucket",
      reason: "bucket_mismatch",
    });
    expect(storageMocks.deleteYandexStorageObject).not.toHaveBeenCalled();
  });

  it("skips unmanaged keys", async () => {
    const { db } = createDb({
      candidates: [
        createMedia({
          id: "unmanaged",
          key: "other/path.jpg",
          status: MediaStatus.PENDING,
        }),
      ],
    });

    const result = await cleanupUnusedMedia({ db, now });

    expect(result.items[0]).toMatchObject({
      action: "skipped",
      id: "unmanaged",
      reason: "unmanaged_key",
    });
    expect(storageMocks.deleteYandexStorageObject).not.toHaveBeenCalled();
  });

  it("continues cleanup when deleting one object fails", async () => {
    storageMocks.deleteYandexStorageObject
      .mockRejectedValueOnce(new Error("storage down"))
      .mockResolvedValueOnce(undefined);
    const { db } = createDb({
      candidates: [
        createMedia({ id: "fails", status: MediaStatus.FAILED }),
        createMedia({ id: "deletes", status: MediaStatus.FAILED }),
      ],
    });

    const result = await cleanupUnusedMedia({ db, dryRun: false, now });

    expect(result).toMatchObject({
      checked: 2,
      deleted: 1,
      failed: 1,
    });
    expect(result.items).toEqual([
      expect.objectContaining({
        action: "failed",
        id: "fails",
        reason: "storage down",
      }),
      expect.objectContaining({
        action: "deleted",
        id: "deletes",
      }),
    ]);
  });

  it("soft deletes media after successful storage deletion", async () => {
    storageMocks.deleteYandexStorageObject.mockResolvedValue(undefined);
    const { db, mediaUpdate } = createDb({
      candidates: [createMedia({ id: "deleted", status: MediaStatus.FAILED })],
    });

    const result = await cleanupUnusedMedia({ db, dryRun: false, now });

    expect(result).toMatchObject({
      deleted: 1,
      failed: 0,
    });
    expect(mediaUpdate).toHaveBeenCalledWith({
      where: { id: "deleted" },
      data: {
        deletedAt: now,
        status: MediaStatus.DELETED,
      },
    });
  });
});

describe("deleteMediaIfUnreferenced", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMocks.getYandexStorageBucket.mockReturnValue("current-bucket");
    storageMocks.isManagedMediaKey.mockImplementation(
      (key: string) =>
        key.startsWith("media/images/") || key.startsWith("uploads/"),
    );
    storageMocks.deleteYandexStorageObject.mockResolvedValue(undefined);
  });

  it("returns no_media for null media id", async () => {
    const { db, mediaFindUnique } = createDb({});

    await expect(
      deleteMediaIfUnreferenced({ db, mediaId: null }),
    ).resolves.toEqual({
      deleted: false,
      reason: "no_media",
    });
    expect(mediaFindUnique).not.toHaveBeenCalled();
  });

  it("returns not_found for missing media", async () => {
    const { db } = createDb({});

    await expect(
      deleteMediaIfUnreferenced({ db, mediaId: "missing" }),
    ).resolves.toEqual({
      deleted: false,
      reason: "not_found",
    });
  });

  it("returns already_deleted for deleted media", async () => {
    const { db } = createDb({
      media: {
        ...createMedia({ id: "deleted", status: MediaStatus.DELETED }),
        deletedAt: now,
      },
    });

    await expect(
      deleteMediaIfUnreferenced({ db, mediaId: "deleted" }),
    ).resolves.toEqual({
      deleted: false,
      reason: "already_deleted",
    });
    expect(storageMocks.deleteYandexStorageObject).not.toHaveBeenCalled();
  });

  it("skips referenced media", async () => {
    const { db } = createDb({
      media: createMedia({ id: "referenced", status: MediaStatus.UPLOADED }),
      referencedBy: { profile: true },
    });

    await expect(
      deleteMediaIfUnreferenced({ db, mediaId: "referenced" }),
    ).resolves.toEqual({
      deleted: false,
      reason: "referenced",
    });
    expect(storageMocks.deleteYandexStorageObject).not.toHaveBeenCalled();
  });

  it("skips media referenced by an event gallery image", async () => {
    const { db } = createDb({
      media: createMedia({
        id: "event-gallery",
        status: MediaStatus.UPLOADED,
      }),
      referencedBy: { eventGalleryImage: true },
    });

    await expect(
      deleteMediaIfUnreferenced({ db, mediaId: "event-gallery" }),
    ).resolves.toEqual({
      deleted: false,
      reason: "referenced",
    });
    expect(storageMocks.deleteYandexStorageObject).not.toHaveBeenCalled();
  });

  it("skips media referenced by an object gallery image", async () => {
    const { db } = createDb({
      media: createMedia({
        id: "object-gallery",
        status: MediaStatus.UPLOADED,
      }),
      referencedBy: { objectGalleryImage: true },
    });

    await expect(
      deleteMediaIfUnreferenced({ db, mediaId: "object-gallery" }),
    ).resolves.toEqual({
      deleted: false,
      reason: "referenced",
    });
    expect(storageMocks.deleteYandexStorageObject).not.toHaveBeenCalled();
  });

  it("skips unmanaged keys", async () => {
    const { db } = createDb({
      media: createMedia({
        id: "unmanaged",
        key: "other/path.jpg",
        status: MediaStatus.UPLOADED,
      }),
    });

    await expect(
      deleteMediaIfUnreferenced({ db, mediaId: "unmanaged" }),
    ).resolves.toEqual({
      deleted: false,
      reason: "unmanaged_key",
    });
    expect(storageMocks.deleteYandexStorageObject).not.toHaveBeenCalled();
  });

  it("skips media from a different bucket", async () => {
    const { db } = createDb({
      media: createMedia({
        bucket: "old-bucket",
        id: "wrong-bucket",
        status: MediaStatus.UPLOADED,
      }),
    });

    await expect(
      deleteMediaIfUnreferenced({ db, mediaId: "wrong-bucket" }),
    ).resolves.toEqual({
      deleted: false,
      reason: "wrong_bucket",
    });
    expect(storageMocks.deleteYandexStorageObject).not.toHaveBeenCalled();
  });

  it("deletes unreferenced managed media and marks it deleted", async () => {
    const media = createMedia({ id: "unused", status: MediaStatus.UPLOADED });
    const { db, mediaUpdate } = createDb({ media });

    await expect(
      deleteMediaIfUnreferenced({ db, mediaId: media.id }),
    ).resolves.toEqual({ deleted: true });
    expect(storageMocks.deleteYandexStorageObject).toHaveBeenCalledWith({
      bucket: media.bucket,
      key: media.key,
    });
    expect(mediaUpdate).toHaveBeenCalledWith({
      where: { id: media.id },
      data: {
        deletedAt: mediaUpdate.mock.calls[0]?.[0].data.deletedAt,
        status: MediaStatus.DELETED,
      },
    });
    expect(mediaUpdate.mock.calls[0]?.[0].data.deletedAt).toBeInstanceOf(Date);
  });

  it("deletes gallery media after the gallery relation is removed", async () => {
    const media = createMedia({
      id: "removed-gallery-image",
      status: MediaStatus.UPLOADED,
    });
    const { db } = createDb({ media });

    await expect(
      deleteMediaIfUnreferenced({ db, mediaId: media.id }),
    ).resolves.toEqual({ deleted: true });
  });

  it("does not let hidden post image references block deletion", async () => {
    const media = createMedia({
      id: "hidden-post",
      status: MediaStatus.UPLOADED,
    });
    const { db, postFindFirst } = createDb({ media });

    await expect(
      deleteMediaIfUnreferenced({ db, mediaId: media.id }),
    ).resolves.toEqual({ deleted: true });
    expect(postFindFirst).toHaveBeenCalledWith({
      where: {
        hiddenAt: null,
        OR: [{ imageMediaId: media.id }, { imageUrl: media.url }],
      },
      select: { id: true },
    });
  });

  it("keeps visible post image references", async () => {
    const media = createMedia({
      id: "visible-post",
      status: MediaStatus.UPLOADED,
    });
    const { db } = createDb({
      media,
      referencedBy: { post: true },
    });

    await expect(
      deleteMediaIfUnreferenced({ db, mediaId: media.id }),
    ).resolves.toEqual({
      deleted: false,
      reason: "referenced",
    });
  });
});
