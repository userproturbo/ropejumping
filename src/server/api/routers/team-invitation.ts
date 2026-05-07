import { TRPCError } from "@trpc/server";

import { TeamInvitationStatus } from "@/generated/prisma/enums";
import {
  teamInvitationActionInputSchema,
  teamInvitationCreateInputSchema,
} from "@/lib/validation/team-invitation";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { db as database } from "@/server/db";
import { hasTeamOwnerOrAdminRole } from "@/server/teams/permissions";

type TeamInvitationRouterDb = typeof database;

const isUniqueConstraintError = (error: unknown) =>
  error instanceof Error && error.message.includes("Unique constraint failed");

const reporterInclude = {
  select: {
    id: true,
    name: true,
    profile: {
      select: {
        username: true,
        displayName: true,
      },
    },
  },
};

const getTeamForInvitationManagement = async ({
  db,
  slug,
  userId,
}: {
  db: TeamInvitationRouterDb;
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
      message: "У вас нет прав на управление приглашениями этой команды.",
    });
  }

  return team;
};

const orderInvitationsByLifecycle = <
  TInvitation extends {
    createdAt: Date;
    status: TeamInvitationStatus;
  },
>(
  invitations: TInvitation[],
) => {
  return invitations.sort((left, right) => {
    const leftIsPending = left.status === TeamInvitationStatus.PENDING;
    const rightIsPending = right.status === TeamInvitationStatus.PENDING;

    if (leftIsPending !== rightIsPending) return leftIsPending ? -1 : 1;

    return right.createdAt.getTime() - left.createdAt.getTime();
  });
};

export const teamInvitationRouter = createTRPCRouter({
  create: protectedProcedure
    .input(teamInvitationCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const team = await getTeamForInvitationManagement({
        db: ctx.db,
        slug: input.teamSlug,
        userId: ctx.session.user.id,
      });

      const profile = await ctx.db.profile.findUnique({
        where: { username: input.username },
        select: {
          userId: true,
        },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Пользователь с таким username не найден.",
        });
      }

      if (profile.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Нельзя пригласить самого себя.",
        });
      }

      const existingMembership = await ctx.db.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: team.id,
            userId: profile.userId,
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

      const existingPendingInvitation = await ctx.db.teamInvitation.findFirst({
        where: {
          teamId: team.id,
          invitedUserId: profile.userId,
          status: TeamInvitationStatus.PENDING,
        },
        select: { id: true },
      });

      if (existingPendingInvitation) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "У пользователя уже есть активное приглашение в эту команду.",
        });
      }

      return ctx.db.teamInvitation.create({
        data: {
          teamId: team.id,
          invitedUserId: profile.userId,
          invitedById: ctx.session.user.id,
          role: input.role,
          functionRoles: input.functionRoles,
          message: input.message,
          status: TeamInvitationStatus.PENDING,
        },
      });
    }),

  getMine: protectedProcedure.query(async ({ ctx }) => {
    const invitations = await ctx.db.teamInvitation.findMany({
      where: {
        invitedUserId: ctx.session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        status: true,
        role: true,
        functionRoles: true,
        message: true,
        createdAt: true,
        decidedAt: true,
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            region: true,
            status: true,
          },
        },
        invitedBy: reporterInclude,
      },
    });

    return orderInvitationsByLifecycle(invitations);
  }),

  getForTeamManagement: protectedProcedure
    .input(teamInvitationCreateInputSchema.shape.teamSlug)
    .query(async ({ ctx, input }) => {
      const team = await getTeamForInvitationManagement({
        db: ctx.db,
        slug: input,
        userId: ctx.session.user.id,
      });

      const invitations = await ctx.db.teamInvitation.findMany({
        where: {
          teamId: team.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          status: true,
          role: true,
          functionRoles: true,
          message: true,
          createdAt: true,
          decidedAt: true,
          invitedUser: {
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
          invitedBy: reporterInclude,
        },
      });

      return orderInvitationsByLifecycle(invitations);
    }),

  acceptMine: protectedProcedure
    .input(teamInvitationActionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.teamInvitation.findFirst({
        where: {
          id: input.invitationId,
          invitedUserId: ctx.session.user.id,
        },
        select: {
          id: true,
          teamId: true,
          invitedUserId: true,
          role: true,
          functionRoles: true,
          status: true,
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Приглашение не найдено.",
        });
      }

      if (invitation.status !== TeamInvitationStatus.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Приглашение уже рассмотрено.",
        });
      }

      const existingMembership = await ctx.db.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: invitation.teamId,
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

      try {
        await ctx.db.$transaction([
          ctx.db.teamMember.create({
            data: {
              teamId: invitation.teamId,
              userId: ctx.session.user.id,
              role: invitation.role,
              functionRoles: invitation.functionRoles,
            },
          }),
          ctx.db.teamInvitation.update({
            where: { id: invitation.id },
            data: {
              status: TeamInvitationStatus.ACCEPTED,
              decidedAt: new Date(),
            },
          }),
        ]);
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Вы уже состоите в этой команде.",
          });
        }

        throw error;
      }

      return { success: true };
    }),

  rejectMine: protectedProcedure
    .input(teamInvitationActionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.teamInvitation.findFirst({
        where: {
          id: input.invitationId,
          invitedUserId: ctx.session.user.id,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Приглашение не найдено.",
        });
      }

      if (invitation.status !== TeamInvitationStatus.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Приглашение уже рассмотрено.",
        });
      }

      await ctx.db.teamInvitation.update({
        where: { id: invitation.id },
        data: {
          status: TeamInvitationStatus.REJECTED,
          decidedAt: new Date(),
        },
      });

      return { success: true };
    }),

  cancel: protectedProcedure
    .input(teamInvitationActionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.teamInvitation.findUnique({
        where: { id: input.invitationId },
        select: {
          id: true,
          teamId: true,
          status: true,
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Приглашение не найдено.",
        });
      }

      const canManage = await hasTeamOwnerOrAdminRole({
        db: ctx.db,
        teamId: invitation.teamId,
        userId: ctx.session.user.id,
      });

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "У вас нет прав на управление приглашениями этой команды.",
        });
      }

      if (invitation.status !== TeamInvitationStatus.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Приглашение уже рассмотрено.",
        });
      }

      await ctx.db.teamInvitation.update({
        where: { id: invitation.id },
        data: {
          status: TeamInvitationStatus.CANCELLED_BY_TEAM,
          decidedAt: new Date(),
        },
      });

      return { success: true };
    }),
});
