import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { recalculateUserBadges } from "@/server/badges/service";

export const badgeRouter = createTRPCRouter({
  getMine: protectedProcedure.query(({ ctx }) => {
    return ctx.db.userBadge.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      orderBy: {
        awardedAt: "desc",
      },
      select: {
        id: true,
        awardedAt: true,
        reason: true,
        badge: {
          select: {
            code: true,
            name: true,
            description: true,
            category: true,
            iconUrl: true,
            isManual: true,
          },
        },
      },
    });
  }),

  recalculateMine: protectedProcedure.mutation(({ ctx }) => {
    return recalculateUserBadges(ctx.db, ctx.session.user.id);
  }),
});
