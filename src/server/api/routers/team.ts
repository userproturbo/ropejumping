import { TRPCError } from "@trpc/server";

import { TeamRole, TeamStatus } from "@/generated/prisma/enums";
import {
  teamCreateInputSchema,
  teamSlugLookupSchema,
  teamUpdateInputSchema,
} from "@/lib/validation/team";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import type { db as database } from "@/server/db";
import { publicEventStatuses } from "@/server/events/statuses";
import { hasTeamOwnerOrAdminRole } from "@/server/teams/permissions";

const publicTeamStatuses = [TeamStatus.REGULAR, TeamStatus.VERIFIED];

const isUniqueConstraintError = (error: unknown) =>
  error instanceof Error && error.message.includes("Unique constraint failed");

type TeamRouterDb = typeof database;

const getManageableTeam = async ({
  db,
  slug,
  userId,
}: {
  db: TeamRouterDb;
  slug: string;
  userId: string;
}) => {
  const team = await db.team.findUnique({
    where: { slug },
    select: {
      id: true,
    },
  });

  if (!team) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Команда не найдена.",
    });
  }

  const canManage = await hasTeamOwnerOrAdminRole({
    db,
    teamId: team.id,
    userId,
  });

  if (!canManage) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "У вас нет прав на управление этой командой.",
    });
  }

  return team;
};

export const teamRouter = createTRPCRouter({
  listPublic: publicProcedure.query(({ ctx }) => {
    return ctx.db.team.findMany({
      where: {
        status: {
          in: publicTeamStatuses,
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        region: true,
        logoUrl: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            members: true,
          },
        },
      },
    });
  }),

  getMine: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.teamMember.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        team: true,
      },
    });

    return memberships.map(({ role, team }) => ({
      ...team,
      currentUserRole: role,
    }));
  }),

  getBySlug: publicProcedure
    .input(teamSlugLookupSchema)
    .query(({ ctx, input }) => {
      return ctx.db.team.findFirst({
        where: {
          slug: input,
          status: {
            in: publicTeamStatuses,
          },
        },
        include: {
          events: {
            where: {
              status: {
                in: publicEventStatuses,
              },
            },
            orderBy: {
              startsAt: "asc",
            },
            select: {
              id: true,
              title: true,
              slug: true,
              startsAt: true,
              endsAt: true,
              status: true,
              region: true,
              capacity: true,
            },
          },
          members: {
            orderBy: {
              createdAt: "asc",
            },
            select: {
              id: true,
              role: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  profile: {
                    select: {
                      username: true,
                      displayName: true,
                      avatarUrl: true,
                      city: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }),

  create: protectedProcedure
    .input(teamCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.profile.findUnique({
        where: { userId: ctx.session.user.id },
        select: { id: true },
      });

      if (!profile) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Перед созданием команды заполните профиль.",
        });
      }

      const existingTeam = await ctx.db.team.findUnique({
        where: { slug: input.slug },
        select: { id: true },
      });

      if (existingTeam) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Такой slug команды уже занят.",
        });
      }

      try {
        return await ctx.db.$transaction(async (tx) => {
          const team = await tx.team.create({
            data: input,
          });

          await tx.teamMember.create({
            data: {
              teamId: team.id,
              userId: ctx.session.user.id,
              role: TeamRole.OWNER,
            },
          });

          return team;
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Такой slug команды уже занят.",
          });
        }

        throw error;
      }
    }),

  update: protectedProcedure
    .input(teamUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const team = await getManageableTeam({
        db: ctx.db,
        slug: input.slug,
        userId: ctx.session.user.id,
      });

      return ctx.db.team.update({
        where: { id: team.id },
        data: {
          name: input.name,
          description: input.description,
          region: input.region,
          logoUrl: input.logoUrl,
        },
      });
    }),

  getForSettings: protectedProcedure
    .input(teamSlugLookupSchema)
    .query(async ({ ctx, input }) => {
      const team = await getManageableTeam({
        db: ctx.db,
        slug: input,
        userId: ctx.session.user.id,
      });

      return ctx.db.team.findUnique({
        where: { id: team.id },
      });
    }),
});
