import { MediaStatus, MediaType } from "@/generated/prisma/enums";
import type { db as database } from "@/server/db";
import { isMediaReferenced } from "@/server/media/usage";
import {
  deleteYandexStorageObject,
  getYandexStorageBucket,
  isManagedMediaKey,
} from "@/server/storage/yandex";

export const DEFAULT_STALE_PENDING_HOURS = 24;
export const DEFAULT_STALE_FAILED_HOURS = 24;
export const DEFAULT_STALE_UPLOADED_UNREFERENCED_HOURS = 24;

type CleanupMediaDb = typeof database;

type CleanupMediaCandidate = {
  bucket: string;
  createdAt: Date;
  id: string;
  key: string;
  status: MediaStatus;
  url: string | null;
};

export type CleanupUnusedMediaResult = {
  checked: number;
  deleted: number;
  dryRun: boolean;
  failed: number;
  items: Array<{
    action: "would_delete" | "deleted" | "skipped" | "failed";
    id: string;
    key: string;
    reason?: string;
    status: MediaStatus;
  }>;
  skipped: number;
};

export type DeleteMediaIfUnreferencedResult =
  | { deleted: true }
  | {
      deleted: false;
      reason:
        | "already_deleted"
        | "no_media"
        | "not_found"
        | "referenced"
        | "unmanaged_key"
        | "wrong_bucket";
    };

const subtractHours = (date: Date, hours: number) =>
  new Date(date.getTime() - hours * 60 * 60 * 1000);

export const cleanupUnusedMedia = async ({
  db,
  now = new Date(),
  dryRun = true,
  limit = 50,
}: {
  db: CleanupMediaDb;
  dryRun?: boolean;
  limit?: number;
  now?: Date;
}): Promise<CleanupUnusedMediaResult> => {
  const stalePendingBefore = subtractHours(now, DEFAULT_STALE_PENDING_HOURS);
  const staleFailedBefore = subtractHours(now, DEFAULT_STALE_FAILED_HOURS);
  const staleUploadedBefore = subtractHours(
    now,
    DEFAULT_STALE_UPLOADED_UNREFERENCED_HOURS,
  );
  const configuredBucket = getYandexStorageBucket();
  const candidates = await db.media.findMany({
    where: {
      deletedAt: null,
      type: MediaType.IMAGE,
      OR: [
        {
          status: MediaStatus.PENDING,
          createdAt: { lte: stalePendingBefore },
        },
        {
          status: MediaStatus.FAILED,
          createdAt: { lte: staleFailedBefore },
        },
        {
          status: MediaStatus.UPLOADED,
          createdAt: { lte: staleUploadedBefore },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      bucket: true,
      createdAt: true,
      id: true,
      key: true,
      status: true,
      url: true,
    },
  });

  const result: CleanupUnusedMediaResult = {
    checked: candidates.length,
    deleted: 0,
    dryRun,
    failed: 0,
    items: [],
    skipped: 0,
  };

  const pushItem = ({
    action,
    media,
    reason,
  }: {
    action: CleanupUnusedMediaResult["items"][number]["action"];
    media: CleanupMediaCandidate;
    reason?: string;
  }) => {
    result.items.push({
      action,
      id: media.id,
      key: media.key,
      reason,
      status: media.status,
    });
  };

  for (const media of candidates) {
    if (media.bucket !== configuredBucket) {
      result.skipped += 1;
      pushItem({
        action: "skipped",
        media,
        reason: "bucket_mismatch",
      });
      continue;
    }

    if (!isManagedMediaKey(media.key)) {
      result.skipped += 1;
      pushItem({
        action: "skipped",
        media,
        reason: "unmanaged_key",
      });
      continue;
    }

    if (await isMediaReferenced(db, media)) {
      result.skipped += 1;
      pushItem({
        action: "skipped",
        media,
        reason: "referenced",
      });
      continue;
    }

    if (dryRun) {
      pushItem({
        action: "would_delete",
        media,
      });
      continue;
    }

    try {
      await deleteYandexStorageObject({
        bucket: media.bucket,
        key: media.key,
      });
      await db.media.update({
        where: { id: media.id },
        data: {
          deletedAt: now,
          status: MediaStatus.DELETED,
        },
      });

      result.deleted += 1;
      pushItem({
        action: "deleted",
        media,
      });
    } catch (error) {
      result.failed += 1;
      pushItem({
        action: "failed",
        media,
        reason: error instanceof Error ? error.message : "delete_failed",
      });
    }
  }

  return result;
};

export const deleteMediaIfUnreferenced = async ({
  db,
  mediaId,
}: {
  db: CleanupMediaDb;
  mediaId: string | null | undefined;
}): Promise<DeleteMediaIfUnreferencedResult> => {
  if (!mediaId) {
    return { deleted: false, reason: "no_media" };
  }

  const media = await db.media.findUnique({
    where: { id: mediaId },
    select: {
      bucket: true,
      deletedAt: true,
      id: true,
      key: true,
      status: true,
      url: true,
    },
  });

  if (!media) {
    return { deleted: false, reason: "not_found" };
  }

  if (media.status === MediaStatus.DELETED || media.deletedAt) {
    return { deleted: false, reason: "already_deleted" };
  }

  if (await isMediaReferenced(db, media)) {
    return { deleted: false, reason: "referenced" };
  }

  if (!isManagedMediaKey(media.key)) {
    return { deleted: false, reason: "unmanaged_key" };
  }

  if (media.bucket !== getYandexStorageBucket()) {
    return { deleted: false, reason: "wrong_bucket" };
  }

  await deleteYandexStorageObject({
    bucket: media.bucket,
    key: media.key,
  });
  await db.media.update({
    where: { id: media.id },
    data: {
      deletedAt: new Date(),
      status: MediaStatus.DELETED,
    },
  });

  return { deleted: true };
};
