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
  getYandexStorageBucket,
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

      await ctx.db.media.update({
        where: { id: media.id },
        data: {
          status: MediaStatus.FAILED,
        },
      });

      return { success: true };
    }),
});
