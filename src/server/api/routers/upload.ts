import { TRPCError } from "@trpc/server";

import { MediaStatus, MediaType } from "@/generated/prisma/enums";
import {
  imageUploadCreateInputSchema,
  mediaIdInputSchema,
} from "@/lib/validation/upload";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { db as database } from "@/server/db";
import {
  createImageObjectKey,
  createPendingImageObjectKey,
  createPresignedImagePutUrl,
  deleteYandexStorageObject,
  getYandexStorageBucket,
  isManagedMediaKey,
  isYandexStorageConfigured,
} from "@/server/storage/yandex";

type UploadRouterDb = typeof database;

const ensureProfile = async (db: UploadRouterDb, userId: string) => {
  const profile = await db.profile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Перед загрузкой изображения заполните профиль.",
    });
  }
};

const isMediaReferenced = async (
  db: UploadRouterDb,
  media: { id: string; url: string | null },
) => {
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

export const uploadRouter = createTRPCRouter({
  createImageUpload: protectedProcedure
    .input(imageUploadCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ensureProfile(ctx.db, ctx.session.user.id);

      if (!isYandexStorageConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Хранилище изображений не настроено. Заполните переменные Yandex Object Storage.",
        });
      }

      try {
        const storageBucket = getYandexStorageBucket();
        const media = await ctx.db.media.create({
          data: {
            ownerId: ctx.session.user.id,
            type: MediaType.IMAGE,
            status: MediaStatus.PENDING,
            bucket: storageBucket,
            key: createPendingImageObjectKey(ctx.session.user.id),
            mimeType: input.contentType,
            sizeBytes: input.sizeBytes,
            uploadedAt: null,
          },
          select: {
            id: true,
          },
        });

        const key = createImageObjectKey({
          contentType: input.contentType,
          mediaId: media.id,
          userId: ctx.session.user.id,
        });
        const { bucket, publicUrl, uploadUrl } =
          await createPresignedImagePutUrl({
            contentType: input.contentType,
            key,
          });

        await ctx.db.media.update({
          where: { id: media.id },
          data: {
            bucket,
            key,
            url: publicUrl,
            mimeType: input.contentType,
            sizeBytes: input.sizeBytes,
            status: MediaStatus.PENDING,
            uploadedAt: null,
          },
        });

        return {
          headers: {
            "Content-Type": input.contentType,
          },
          key,
          mediaId: media.id,
          method: "PUT" as const,
          publicUrl,
          uploadUrl,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Не удалось подготовить загрузку изображения.",
          cause: error,
        });
      }
    }),

  confirmImageUpload: protectedProcedure
    .input(mediaIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const media = await ctx.db.media.findFirst({
        where: {
          id: input,
          ownerId: ctx.session.user.id,
          type: MediaType.IMAGE,
        },
        select: {
          id: true,
          url: true,
          mimeType: true,
          sizeBytes: true,
          status: true,
          uploadedAt: true,
        },
      });

      if (!media) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Изображение не найдено.",
        });
      }

      if (media.status === MediaStatus.UPLOADED) {
        return media;
      }

      if (media.status === MediaStatus.FAILED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Эта загрузка уже помечена как неудачная.",
        });
      }

      if (media.status === MediaStatus.DELETED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Это изображение уже удалено.",
        });
      }

      return ctx.db.media.update({
        where: { id: media.id },
        data: {
          status: MediaStatus.UPLOADED,
          uploadedAt: new Date(),
        },
        select: {
          id: true,
          url: true,
          mimeType: true,
          sizeBytes: true,
          status: true,
          uploadedAt: true,
        },
      });
    }),

  markImageUploadFailed: protectedProcedure
    .input(mediaIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const media = await ctx.db.media.findFirst({
        where: {
          id: input,
          ownerId: ctx.session.user.id,
          type: MediaType.IMAGE,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!media) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Изображение не найдено.",
        });
      }

      if (media.status === MediaStatus.UPLOADED) {
        return { success: true };
      }

      if (media.status === MediaStatus.DELETED) {
        return { success: true };
      }

      await ctx.db.media.update({
        where: { id: media.id },
        data: {
          status: MediaStatus.FAILED,
        },
      });

      return { success: true };
    }),

  deleteMyMedia: protectedProcedure
    .input(mediaIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const media = await ctx.db.media.findFirst({
        where: {
          id: input,
          ownerId: ctx.session.user.id,
          type: MediaType.IMAGE,
        },
        select: {
          id: true,
          bucket: true,
          key: true,
          url: true,
          status: true,
        },
      });

      if (!media) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Изображение не найдено.",
        });
      }

      if (media.status === MediaStatus.DELETED) {
        return { success: true };
      }

      if (!isYandexStorageConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Хранилище изображений не настроено. Заполните переменные Yandex Object Storage.",
        });
      }

      if (media.bucket !== getYandexStorageBucket()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Нельзя удалить файл из другого хранилища.",
        });
      }

      if (!isManagedMediaKey(media.key)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Нельзя удалить файл с неподдерживаемым ключом.",
        });
      }

      if (await isMediaReferenced(ctx.db, media)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Файл ещё используется на сайте. Сначала уберите его из публикации или профиля.",
        });
      }

      try {
        await deleteYandexStorageObject({
          bucket: media.bucket,
          key: media.key,
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Не удалось удалить файл из хранилища.",
          cause: error,
        });
      }

      await ctx.db.media.update({
        where: { id: media.id },
        data: {
          status: MediaStatus.DELETED,
          deletedAt: new Date(),
        },
      });

      return { success: true };
    }),
});
