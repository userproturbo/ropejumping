import { TRPCError } from "@trpc/server";

import { ObjectVisibility } from "@/generated/prisma/enums";
import {
  objectImpressionCreateInputSchema,
  objectImpressionDeleteInputSchema,
  objectImpressionUpdateInputSchema,
} from "@/lib/validation/object-impression";
import { assertObjectImpressionCreateLimit } from "@/server/anti-spam/rate-limit";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { db as database } from "@/server/db";

type ObjectImpressionRouterDb = typeof database;

const isUniqueConstraintError = (error: unknown) =>
  error instanceof Error && error.message.includes("Unique constraint failed");

const ensureProfile = async (db: ObjectImpressionRouterDb, userId: string) => {
  const profile = await db.profile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Перед публикацией заполните профиль.",
    });
  }
};

export const objectImpressionRouter = createTRPCRouter({
  create: protectedProcedure
    .input(objectImpressionCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ensureProfile(ctx.db, ctx.session.user.id);
      await assertObjectImpressionCreateLimit(ctx.db, ctx.session.user.id);

      const object = await ctx.db.jumpObject.findFirst({
        where: {
          id: input.objectId,
          visibility: ObjectVisibility.PUBLIC,
        },
        select: {
          id: true,
        },
      });

      if (!object) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Объект не найден.",
        });
      }

      const existingImpression = await ctx.db.objectImpression.findFirst({
        where: {
          objectId: input.objectId,
          authorId: ctx.session.user.id,
        },
        select: {
          id: true,
          hiddenAt: true,
        },
      });

      if (existingImpression?.hiddenAt === null) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Вы уже оставили впечатление об этом объекте. Его можно отредактировать.",
        });
      }

      if (existingImpression) {
        return await ctx.db.objectImpression.update({
          where: {
            id: existingImpression.id,
          },
          data: {
            body: input.body,
            hiddenAt: null,
            editedAt: null,
          },
        });
      }

      try {
        return await ctx.db.objectImpression.create({
          data: {
            objectId: input.objectId,
            authorId: ctx.session.user.id,
            body: input.body,
          },
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Вы уже оставили впечатление об этом объекте. Его можно отредактировать.",
          });
        }

        throw error;
      }
    }),

  update: protectedProcedure
    .input(objectImpressionUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const impression = await ctx.db.objectImpression.findFirst({
        where: {
          id: input.impressionId,
          hiddenAt: null,
        },
        select: {
          id: true,
          authorId: true,
        },
      });

      if (!impression) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Впечатление не найдено.",
        });
      }

      if (impression.authorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Можно редактировать только своё впечатление.",
        });
      }

      return ctx.db.objectImpression.update({
        where: {
          id: impression.id,
        },
        data: {
          body: input.body,
          editedAt: new Date(),
        },
      });
    }),

  deleteMine: protectedProcedure
    .input(objectImpressionDeleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const impression = await ctx.db.objectImpression.findFirst({
        where: {
          id: input.impressionId,
          hiddenAt: null,
        },
        select: {
          id: true,
          authorId: true,
        },
      });

      if (!impression) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Впечатление не найдено.",
        });
      }

      if (impression.authorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Можно удалить только своё впечатление.",
        });
      }

      await ctx.db.objectImpression.update({
        where: {
          id: impression.id,
        },
        data: {
          hiddenAt: new Date(),
        },
      });

      return { success: true };
    }),
});
