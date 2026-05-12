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

const { cleanupUnusedMedia } = await import("@/server/media/cleanup");

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

type CleanupFindManyArgs = {
  where: {
    deletedAt: null;
    OR: Array<{ status: MediaStatus }>;
  };
};

const createMedia = ({
  bucket = "current-bucket",
  createdAt = oldDate,
  id,
  key,
  status,
  url = `https://storage.example.com/${id}.jpg`,
}: MediaCandidate) => ({
  bucket,
  createdAt,
  id,
  key: key ?? `media/images/user/2026/05/${id}/original.jpg`,
  status,
  url,
});

const createDb = ({
  candidates,
  referencedBy = {},
}: {
  candidates: ReturnType<typeof createMedia>[];
  referencedBy?: Partial<
    Record<
      "event" | "jumpObject" | "post" | "profile" | "team" | "user",
      boolean
    >
  >;
}) => {
  const mediaFindMany = vi
    .fn<
      (args: CleanupFindManyArgs) => Promise<ReturnType<typeof createMedia>[]>
    >()
    .mockResolvedValue(candidates);
  const mediaUpdate = vi.fn().mockResolvedValue({});
  const db = {
    event: {
      findFirst: vi
        .fn()
        .mockResolvedValue(referencedBy.event ? { id: "event" } : null),
    },
    jumpObject: {
      findFirst: vi
        .fn()
        .mockResolvedValue(referencedBy.jumpObject ? { id: "object" } : null),
    },
    media: {
      findMany: mediaFindMany,
      update: mediaUpdate,
    },
    post: {
      findFirst: vi
        .fn()
        .mockResolvedValue(referencedBy.post ? { id: "post" } : null),
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

  return { db, mediaFindMany, mediaUpdate };
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
