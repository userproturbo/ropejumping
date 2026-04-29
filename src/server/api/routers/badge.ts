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
      include: {
        badge: true,
      },
    });
  }),

  recalculateMine: protectedProcedure.mutation(({ ctx }) => {
    return recalculateUserBadges(ctx.db, ctx.session.user.id);
  }),
});
