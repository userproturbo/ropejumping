import { TRPCError } from "@trpc/server";

import { notificationIdInputSchema } from "@/lib/validation/notification";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const notificationRouter = createTRPCRouter({
  listMine: protectedProcedure.query(({ ctx }) => {
    return ctx.db.notification.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        href: true,
        readAt: true,
        createdAt: true,
      },
    });
  }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.db.notification.count({
      where: {
        userId: ctx.session.user.id,
        readAt: null,
      },
    });

    return { count };
  }),

  markRead: protectedProcedure
    .input(notificationIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const notification = await ctx.db.notification.findFirst({
        where: {
          id: input.notificationId,
          userId: ctx.session.user.id,
        },
        select: {
          id: true,
        },
      });

      if (!notification) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Уведомление не найдено.",
        });
      }

      return ctx.db.notification.update({
        where: {
          id: notification.id,
        },
        data: {
          readAt: new Date(),
        },
      });
    }),

  markAllRead: protectedProcedure.mutation(({ ctx }) => {
    return ctx.db.notification.updateMany({
      where: {
        userId: ctx.session.user.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }),
});
