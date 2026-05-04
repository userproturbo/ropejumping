import { TRPCError } from "@trpc/server";

import {
  TeamJoinRequestStatus,
  TeamRole,
  TeamStatus,
} from "@/generated/prisma/enums";
import {
  teamJoinRequestActionInputSchema,
  teamJoinRequestCreateInputSchema,
  teamJoinRequestTeamSlugInputSchema,
} from "@/lib/validation/team-join-request";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { db as database } from "@/server/db";
import { hasTeamOwnerOrAdminRole } from "@/server/teams/permissions";

const publicTeamStatuses = [TeamStatus.REGULAR, TeamStatus.VERIFIED];

const isUniqueConstraintError = (error: unknown) =>
  error instanceof Error && error.message.includes("Unique constraint failed");

type TeamJoinRequestRouterDb = typeof database;

const getTeamForManagement = async ({
  db,
  slug,
  userId,
}: {
  db: TeamJoinRequestRouterDb;
  slug: string;
  userId: string;
}) => {
  const team = await db.team.findUnique({
    where: { slug },
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

  const canManage = await hasTeamOwnerOrAdminRole({
    db,
    teamId: team.id,
    userId,
  });

  if (!canManage) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "У вас нет прав на управление заявками этой команды.",
    });
  }

  return team;
};

const getRequestForManagement = async ({
  db,
  requestId,
  userId,
}: {
  db: TeamJoinRequestRouterDb;
  requestId: string;
  userId: string;
}) => {
  const request = await db.teamJoinRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      teamId: true,
      userId: true,
      status: true,
    },
  });

  if (!request) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Заявка не найдена.",
    });
  }

  const canManage = await hasTeamOwnerOrAdminRole({
    db,
    teamId: request.teamId,
    userId,
  });

  if (!canManage) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "У вас нет прав на управление заявками этой команды.",
    });
  }

  if (request.status !== TeamJoinRequestStatus.PENDING) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Заявка уже рассмотрена.",
    });
  }

  return request;
};

export const teamJoinRequestRouter = createTRPCRouter({
  getMineForTeam: protectedProcedure
    .input(teamJoinRequestTeamSlugInputSchema)
    .query(async ({ ctx, input }) => {
      const team = await ctx.db.team.findFirst({
        where: {
          slug: input,
          status: {
            in: publicTeamStatuses,
          },
        },
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

      const [profile, membership, pendingJoinRequest] = await Promise.all([
        ctx.db.profile.findUnique({
          where: { userId: ctx.session.user.id },
          select: { id: true },
        }),
        ctx.db.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: team.id,
              userId: ctx.session.user.id,
            },
          },
          select: {
            id: true,
            role: true,
            functionRoles: true,
          },
        }),
        ctx.db.teamJoinRequest.findFirst({
          where: {
            teamId: team.id,
            userId: ctx.session.user.id,
            status: TeamJoinRequestStatus.PENDING,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            status: true,
            message: true,
            createdAt: true,
          },
        }),
      ]);

      return {
        hasProfile: Boolean(profile),
        membership,
        pendingJoinRequest,
      };
    }),

  create: protectedProcedure
    .input(teamJoinRequestCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.profile.findUnique({
        where: { userId: ctx.session.user.id },
        select: { id: true },
      });

      if (!profile) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Перед подачей заявки заполните профиль.",
        });
      }

      const team = await ctx.db.team.findFirst({
        where: {
          slug: input.teamSlug,
          status: {
            in: publicTeamStatuses,
          },
        },
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

      const existingMembership = await ctx.db.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: team.id,
            userId: ctx.session.user.id,
          },
        },
        select: { id: true },
      });

      if (existingMembership) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Вы уже состоите в этой команде.",
        });
      }

      const existingPendingRequest = await ctx.db.teamJoinRequest.findFirst({
        where: {
          teamId: team.id,
          userId: ctx.session.user.id,
          status: TeamJoinRequestStatus.PENDING,
        },
        select: { id: true },
      });

      if (existingPendingRequest) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "У вас уже есть активная заявка в эту команду.",
        });
      }

      return ctx.db.teamJoinRequest.create({
        data: {
          teamId: team.id,
          userId: ctx.session.user.id,
          message: input.message,
        },
      });
    }),

  cancelMine: protectedProcedure
    .input(teamJoinRequestActionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.db.teamJoinRequest.findUnique({
        where: { id: input.requestId },
        select: {
          id: true,
          userId: true,
          status: true,
        },
      });

      if (request?.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Заявка не найдена.",
        });
      }

      if (request.status !== TeamJoinRequestStatus.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Заявка уже рассмотрена.",
        });
      }

      return ctx.db.teamJoinRequest.update({
        where: { id: request.id },
        data: {
          status: TeamJoinRequestStatus.CANCELLED_BY_USER,
        },
      });
    }),

  getForTeamManagement: protectedProcedure
    .input(teamJoinRequestTeamSlugInputSchema)
    .query(async ({ ctx, input }) => {
      const team = await getTeamForManagement({
        db: ctx.db,
        slug: input,
        userId: ctx.session.user.id,
      });

      const joinRequests = await ctx.db.teamJoinRequest.findMany({
        where: {
          teamId: team.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          status: true,
          message: true,
          decidedAt: true,
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
                  externalExperience: true,
                },
              },
            },
          },
        },
      });

      return {
        team,
        joinRequests: joinRequests.sort((left, right) => {
          if (left.status === right.status) {
            return right.createdAt.getTime() - left.createdAt.getTime();
          }

          if (left.status === TeamJoinRequestStatus.PENDING) return -1;
          if (right.status === TeamJoinRequestStatus.PENDING) return 1;

          return right.createdAt.getTime() - left.createdAt.getTime();
        }),
      };
    }),

  accept: protectedProcedure
    .input(teamJoinRequestActionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const request = await getRequestForManagement({
        db: ctx.db,
        requestId: input.requestId,
        userId: ctx.session.user.id,
      });

      const existingMembership = await ctx.db.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: request.teamId,
            userId: request.userId,
          },
        },
        select: { id: true },
      });

      if (existingMembership) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Пользователь уже состоит в команде.",
        });
      }

      try {
        return await ctx.db.$transaction(async (tx) => {
          await tx.teamMember.create({
            data: {
              teamId: request.teamId,
              userId: request.userId,
              role: TeamRole.MEMBER,
              functionRoles: [],
            },
          });

          return tx.teamJoinRequest.update({
            where: { id: request.id },
            data: {
              status: TeamJoinRequestStatus.ACCEPTED,
              decidedById: ctx.session.user.id,
              decidedAt: new Date(),
            },
          });
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Пользователь уже состоит в команде.",
          });
        }

        throw error;
      }
    }),

  reject: protectedProcedure
    .input(teamJoinRequestActionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const request = await getRequestForManagement({
        db: ctx.db,
        requestId: input.requestId,
        userId: ctx.session.user.id,
      });

      return ctx.db.teamJoinRequest.update({
        where: { id: request.id },
        data: {
          status: TeamJoinRequestStatus.REJECTED,
          decidedById: ctx.session.user.id,
          decidedAt: new Date(),
        },
      });
    }),
});
