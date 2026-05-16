import { TRPCError } from "@trpc/server";

import { ObjectVisibility } from "@/generated/prisma/enums";
import { objectLikeInputSchema } from "@/lib/validation/object-like";
import { assertObjectLikeCreateLimit } from "@/server/anti-spam/rate-limit";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const isUniqueConstraintError = (error: unknown) =>
  error instanceof Error && error.message.includes("Unique constraint failed");

export const objectLikeRouter = createTRPCRouter({
  toggleObjectLike: protectedProcedure
    .input(objectLikeInputSchema)
    .mutation(async ({ ctx, input }) => {
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

      const existingLike = await ctx.db.objectLike.findUnique({
        where: {
          userId_objectId: {
            objectId: input.objectId,
            userId: ctx.session.user.id,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingLike) {
        await ctx.db.objectLike.delete({
          where: {
            id: existingLike.id,
          },
        });

        return { liked: false };
      }

      await assertObjectLikeCreateLimit(ctx.db, ctx.session.user.id);

      try {
        await ctx.db.objectLike.create({
          data: {
            objectId: input.objectId,
            userId: ctx.session.user.id,
          },
        });
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
      }

      return { liked: true };
    }),
});
