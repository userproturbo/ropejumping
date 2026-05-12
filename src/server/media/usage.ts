import { TRPCError } from "@trpc/server";

import { MediaStatus, MediaType } from "@/generated/prisma/enums";
import type { db as database } from "@/server/db";

type MediaUsageDb = typeof database;

type ImageMediaInput = {
  mediaId: string | null | undefined;
  url: string | null | undefined;
};

type ResolvedImageMedia = {
  mediaId: string | null;
  url: string | null;
};

export const isMediaReferenced = async (
  db: MediaUsageDb,
  media: { id: string; url: string | null },
): Promise<boolean> => {
  if (!media.url) {
    const [profile, team, event, object, post] = await Promise.all([
      db.profile.findFirst({
        where: { avatarMediaId: media.id },
        select: { id: true },
      }),
      db.team.findFirst({
        where: { logoMediaId: media.id },
        select: { id: true },
      }),
      db.event.findFirst({
        where: { coverMediaId: media.id },
        select: { id: true },
      }),
      db.jumpObject.findFirst({
        where: { coverMediaId: media.id },
        select: { id: true },
      }),
      db.post.findFirst({
        where: { imageMediaId: media.id },
        select: { id: true },
      }),
    ]);

    return [profile, team, event, object, post].some(Boolean);
  }

  const [user, profile, team, event, object, post] = await Promise.all([
    db.user.findFirst({ where: { image: media.url }, select: { id: true } }),
    db.profile.findFirst({
      where: {
        OR: [{ avatarMediaId: media.id }, { avatarUrl: media.url }],
      },
      select: { id: true },
    }),
    db.team.findFirst({
      where: {
        OR: [{ logoMediaId: media.id }, { logoUrl: media.url }],
      },
      select: { id: true },
    }),
    db.event.findFirst({
      where: {
        OR: [{ coverMediaId: media.id }, { coverImageUrl: media.url }],
      },
      select: { id: true },
    }),
    db.jumpObject.findFirst({
      where: {
        OR: [{ coverMediaId: media.id }, { coverImageUrl: media.url }],
      },
      select: { id: true },
    }),
    db.post.findFirst({
      where: {
        OR: [{ imageMediaId: media.id }, { imageUrl: media.url }],
      },
      select: { id: true },
    }),
  ]);

  return [user, profile, team, event, object, post].some(Boolean);
};

export const validateOwnedUploadedImageMedia = async ({
  db,
  mediaId,
  url,
  userId,
}: {
  db: MediaUsageDb;
  mediaId: string | null | undefined;
  url: string | null | undefined;
  userId: string;
}): Promise<ResolvedImageMedia> => {
  if (!mediaId && !url) {
    return { mediaId: null, url: null };
  }

  if (!mediaId) {
    return { mediaId: null, url: url ?? null };
  }

  const media = await db.media.findFirst({
    where: {
      deletedAt: null,
      id: mediaId,
      ownerId: userId,
      status: MediaStatus.UPLOADED,
      type: MediaType.IMAGE,
    },
    select: {
      id: true,
      url: true,
    },
  });

  if (!media?.url) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Изображение не найдено или недоступно.",
    });
  }

  if (url && url !== media.url) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Ссылка на изображение не совпадает с загруженным файлом.",
    });
  }

  return { mediaId: media.id, url: media.url };
};

export const resolveImageMediaForCreate = async ({
  db,
  input,
  userId,
}: {
  db: MediaUsageDb;
  input: ImageMediaInput;
  userId: string;
}) => {
  const image = await validateOwnedUploadedImageMedia({
    db,
    mediaId: input.mediaId,
    url: input.url,
    userId,
  });

  if (image.url && !image.mediaId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Загрузите изображение через форму загрузки.",
    });
  }

  return image;
};

export const resolveImageMediaForUpdate = async ({
  db,
  existingUrl,
  existingMediaId,
  input,
  userId,
}: {
  db: MediaUsageDb;
  existingMediaId?: string | null | undefined;
  existingUrl: string | null | undefined;
  input: ImageMediaInput;
  userId: string;
}) => {
  const inputMediaId = input.mediaId ?? null;
  const inputUrl = input.url ?? null;
  const currentMediaId = existingMediaId ?? null;
  const currentUrl = existingUrl ?? null;

  if (!inputMediaId && !inputUrl) {
    return { mediaId: null, url: null };
  }

  if (inputMediaId === currentMediaId && inputUrl === currentUrl) {
    return { mediaId: currentMediaId, url: currentUrl };
  }

  if (!inputMediaId && inputUrl === currentUrl) {
    return { mediaId: currentMediaId, url: currentUrl };
  }

  const image = await validateOwnedUploadedImageMedia({
    db,
    mediaId: inputMediaId,
    url: inputUrl,
    userId,
  });

  if (image.mediaId) {
    return image;
  }

  if (!image.url) {
    return { mediaId: null, url: null };
  }

  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Загрузите изображение через форму загрузки.",
  });
};
