import { TRPCError } from "@trpc/server";

import { teamSlugLookupSchema } from "@/lib/validation/team";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { hasTeamOwnerOrAdminRole } from "@/server/teams/permissions";

export const auditRouter = createTRPCRouter({
  listTeamActivity: protectedProcedure
    .input(teamSlugLookupSchema)
    .query(async ({ ctx, input }) => {
      const team = await ctx.db.team.findUnique({
        where: { slug: input },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });

      if (!team) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Команда не найдена.",
        });
      }

      const canViewAuditLog = await hasTeamOwnerOrAdminRole({
        db: ctx.db,
        teamId: team.id,
        userId: ctx.session.user.id,
      });

      if (!canViewAuditLog) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Журнал действий доступен только владельцу и администраторам.",
        });
      }

      const logs = await ctx.db.auditLog.findMany({
        where: {
          targetType: "TEAM",
          targetId: team.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              image: true,
              profile: {
                select: {
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      return {
        team,
        logs,
      };
    }),
});
