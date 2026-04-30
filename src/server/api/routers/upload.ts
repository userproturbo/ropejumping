import { TRPCError } from "@trpc/server";

import { MediaType } from "@/generated/prisma/enums";
import { imageUploadCreateInputSchema } from "@/lib/validation/upload";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { db as database } from "@/server/db";
import {
  createImageObjectKey,
  createPresignedImagePutUrl,
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

      const key = createImageObjectKey(ctx.session.user.id, input.contentType);

      try {
        const { bucket, publicUrl, uploadUrl } = await createPresignedImagePutUrl({
          contentType: input.contentType,
          key,
        });

        const media = await ctx.db.media.create({
          data: {
            ownerId: ctx.session.user.id,
            type: MediaType.IMAGE,
            bucket,
            key,
            url: publicUrl,
            mimeType: input.contentType,
            sizeBytes: input.sizeBytes,
          },
          select: {
            id: true,
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
});
