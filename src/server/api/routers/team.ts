import { TRPCError } from "@trpc/server";

import {
  AuditAction,
  ObjectVisibility,
  PostPinTargetType,
  TeamRole,
  TeamStatus,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import {
  teamMemberAddInputSchema,
  teamLeaveInputSchema,
  teamMemberRemoveInputSchema,
  teamMemberUpdateFunctionRolesInputSchema,
  teamMemberUpdateRoleInputSchema,
  teamOwnershipTransferInputSchema,
} from "@/lib/validation/team-member";
import {
  teamCreateInputSchema,
  teamPublicListInputSchema,
  teamSlugLookupSchema,
  teamUpdateInputSchema,
} from "@/lib/validation/team";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { createAuditLog } from "@/server/audit/service";
import { publicPostWhere } from "@/server/api/routers/post";
import type { db as database } from "@/server/db";
import { publicEventStatuses } from "@/server/events/statuses";
import { deleteMediaIfUnreferenced } from "@/server/media/cleanup";
import {
  resolveImageMediaForCreate,
  resolveImageMediaForUpdate,
} from "@/server/media/usage";
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

const getManageableMembership = async ({
  db,
  membershipId,
  userId,
}: {
  db: TeamRouterDb;
  membershipId: string;
  userId: string;
}) => {
  const membership = await db.teamMember.findUnique({
    where: { id: membershipId },
    select: {
      id: true,
      teamId: true,
      userId: true,
      role: true,
      functionRoles: true,
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Участник команды не найден.",
    });
  }

  const canManage = await hasTeamOwnerOrAdminRole({
    db,
    teamId: membership.teamId,
    userId,
  });

  if (!canManage) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "У вас нет прав на управление участниками этой команды.",
    });
  }

  if (membership.role === TeamRole.OWNER) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Владелец защищён от изменения в этой версии.",
    });
  }

  return membership;
};

const getMembershipForFunctionRoleManagement = async ({
  db,
  membershipId,
  userId,
}: {
  db: TeamRouterDb;
  membershipId: string;
  userId: string;
}) => {
  const membership = await db.teamMember.findUnique({
    where: { id: membershipId },
    select: {
      id: true,
      teamId: true,
      userId: true,
      functionRoles: true,
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Участник команды не найден.",
    });
  }

  const canManage = await hasTeamOwnerOrAdminRole({
    db,
    teamId: membership.teamId,
    userId,
  });

  if (!canManage) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "У вас нет прав на управление участниками этой команды.",
    });
  }

  return membership;
};

export const teamRouter = createTRPCRouter({
  listPublic: publicProcedure
    .input(teamPublicListInputSchema.optional())
    .query(async ({ ctx, input }) => {
      const q = input?.q ?? "";
      const region = input?.region ?? "";
      const status = input?.status;
      const sort = input?.sort ?? "nameAsc";
      const publicTeamsWhere: Prisma.TeamWhereInput = {
        status: {
          in: publicTeamStatuses,
        },
      };
      const filteredTeamsWhere: Prisma.TeamWhereInput = {
        ...publicTeamsWhere,
        ...(status ? { status } : {}),
      };

      if (region) {
        filteredTeamsWhere.region = region;
      }

      if (q) {
        filteredTeamsWhere.OR = [
          {
            name: {
              contains: q,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: q,
              mode: "insensitive",
            },
          },
          {
            region: {
              contains: q,
              mode: "insensitive",
            },
          },
          {
            slug: {
              contains: q,
              mode: "insensitive",
            },
          },
        ];
      }

      const [teams, regionRows] = await Promise.all([
        ctx.db.team.findMany({
          where: filteredTeamsWhere,
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            region: true,
            logoUrl: true,
            logoMedia: {
              select: {
                id: true,
                alt: true,
              },
            },
            status: true,
            createdAt: true,
            _count: {
              select: {
                members: true,
                followers: true,
              },
            },
          },
        }),
        ctx.db.team.findMany({
          where: {
            ...publicTeamsWhere,
            region: {
              not: null,
            },
          },
          distinct: ["region"],
          select: {
            region: true,
          },
        }),
      ]);

      const availableRegions = Array.from(
        new Set(
          regionRows
            .map((team) => team.region?.trim())
            .filter((teamRegion): teamRegion is string => Boolean(teamRegion)),
        ),
      ).sort((left, right) => left.localeCompare(right, "ru"));

      const orderedTeams = teams.sort((left, right) => {
        if (sort === "createdAtDesc") {
          const createdAtDifference =
            right.createdAt.getTime() - left.createdAt.getTime();

          if (createdAtDifference !== 0) return createdAtDifference;
        }

        if (sort === "membersDesc") {
          const memberDifference = right._count.members - left._count.members;

          if (memberDifference !== 0) return memberDifference;
        }

        if (sort === "followersDesc") {
          const followerDifference =
            right._count.followers - left._count.followers;

          if (followerDifference !== 0) return followerDifference;
        }

        return left.name.localeCompare(right.name, "ru");
      });

      return {
        teams: orderedTeams,
        availableRegions,
        filters: {
          q,
          region,
          status: status ?? "",
          sort,
        },
      };
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
    .query(async ({ ctx, input }) => {
      const team = await ctx.db.team.findFirst({
        where: {
          slug: input,
          status: {
            in: publicTeamStatuses,
          },
        },
        include: {
          logoMedia: {
            select: {
              id: true,
              alt: true,
            },
          },
          followers: {
            where: {
              userId: ctx.session?.user?.id ?? "",
            },
            select: {
              id: true,
            },
            take: 1,
          },
          _count: {
            select: {
              followers: true,
            },
          },
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
              coverImageUrl: true,
              coverMedia: {
                select: {
                  id: true,
                  alt: true,
                },
              },
              _count: {
                select: {
                  applications: true,
                },
              },
              object: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  heightMeters: true,
                  region: true,
                  visibility: true,
                },
              },
            },
          },
          members: {
            orderBy: {
              createdAt: "asc",
            },
            select: {
              id: true,
              role: true,
              functionRoles: true,
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
          objects: {
            where: {
              visibility: ObjectVisibility.PUBLIC,
            },
            orderBy: {
              createdAt: "desc",
            },
            select: {
              id: true,
              name: true,
              slug: true,
              type: true,
              heightMeters: true,
              region: true,
              coverImageUrl: true,
              coverMedia: {
                select: {
                  id: true,
                  alt: true,
                },
              },
              createdAt: true,
              events: {
                where: {
                  status: {
                    in: publicEventStatuses,
                  },
                  team: {
                    status: {
                      in: publicTeamStatuses,
                    },
                  },
                },
                select: {
                  id: true,
                },
              },
            },
          },
          posts: {
            where: publicPostWhere,
            orderBy: {
              createdAt: "desc",
            },
            select: {
              id: true,
              content: true,
              imageUrl: true,
              viewsCount: true,
              imageMedia: {
                select: {
                  id: true,
                  alt: true,
                },
              },
              createdAt: true,
              author: {
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
              event: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                },
              },
              object: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
              pins: {
                where: {
                  targetType: PostPinTargetType.TEAM,
                },
                select: {
                  id: true,
                  targetId: true,
                  targetType: true,
                  createdAt: true,
                },
              },
              _count: {
                select: {
                  likes: true,
                  comments: {
                    where: {
                      hiddenAt: null,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!team) return null;

      const { followers, _count, ...teamData } = team;

      return {
        ...teamData,
        followerCount: _count.followers,
        isFollowedByCurrentUser: followers.length > 0,
        posts: team.posts
          .sort((left, right) => {
            const leftPinned = left.pins.some(
              (pin) => pin.targetId === team.id,
            );
            const rightPinned = right.pins.some(
              (pin) => pin.targetId === team.id,
            );

            if (leftPinned !== rightPinned) return leftPinned ? -1 : 1;

            return right.createdAt.getTime() - left.createdAt.getTime();
          })
          .slice(0, 5),
      };
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

      const logo = await resolveImageMediaForCreate({
        db: ctx.db,
        input: {
          mediaId: input.logoMediaId,
          url: input.logoUrl,
        },
        userId: ctx.session.user.id,
      });

      try {
        const createdTeam = await ctx.db.$transaction(async (tx) => {
          const team = await tx.team.create({
            data: {
              ...input,
              logoMediaId: logo.mediaId,
              logoUrl: logo.url,
            },
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

        return createdTeam;
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

      const currentTeam = await ctx.db.team.findUniqueOrThrow({
        where: { id: team.id },
        select: {
          name: true,
          description: true,
          region: true,
          logoMediaId: true,
          logoUrl: true,
          slug: true,
        },
      });
      const logo = await resolveImageMediaForUpdate({
        db: ctx.db,
        existingMediaId: currentTeam.logoMediaId,
        existingUrl: currentTeam.logoUrl,
        input: {
          mediaId: input.logoMediaId,
          url: input.logoUrl,
        },
        userId: ctx.session.user.id,
      });
      const changedFields = [
        currentTeam.name !== input.name ? "name" : null,
        currentTeam.description !== input.description ? "description" : null,
        currentTeam.region !== input.region ? "region" : null,
        currentTeam.logoUrl !== logo.url ||
        currentTeam.logoMediaId !== logo.mediaId
          ? "logoUrl"
          : null,
      ].filter((field): field is string => field !== null);

      const updatedTeam = await ctx.db.$transaction(async (tx) => {
        const updatedTeam = await tx.team.update({
          where: { id: team.id },
          data: {
            name: input.name,
            description: input.description,
            region: input.region,
            logoMediaId: logo.mediaId,
            logoUrl: logo.url,
          },
        });

        await createAuditLog(tx, {
          actorId: ctx.session.user.id,
          action: AuditAction.TEAM_UPDATED,
          targetType: "TEAM",
          targetId: team.id,
          metadata: {
            teamSlug: currentTeam.slug,
            changedFields,
          },
        });

        return updatedTeam;
      });

      if (currentTeam.logoMediaId && currentTeam.logoMediaId !== logo.mediaId) {
        try {
          await deleteMediaIfUnreferenced({
            db: ctx.db,
            mediaId: currentTeam.logoMediaId,
          });
        } catch {
          // Best effort: scheduled cleanup can retry storage failures.
        }
      }

      return updatedTeam;
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
        include: {
          logoMedia: {
            select: {
              id: true,
              alt: true,
            },
          },
        },
      });
    }),

  getForMembersManagement: protectedProcedure
    .input(teamSlugLookupSchema)
    .query(async ({ ctx, input }) => {
      const team = await getManageableTeam({
        db: ctx.db,
        slug: input,
        userId: ctx.session.user.id,
      });

      const teamForManagement = await ctx.db.team.findUniqueOrThrow({
        where: { id: team.id },
        select: {
          id: true,
          name: true,
          slug: true,
          members: {
            orderBy: {
              createdAt: "asc",
            },
            select: {
              id: true,
              role: true,
              functionRoles: true,
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
      const currentMembership = teamForManagement.members.find(
        (membership) => membership.user.id === ctx.session.user.id,
      );

      if (!currentMembership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "У вас нет прав на управление участниками этой команды.",
        });
      }

      return {
        ...teamForManagement,
        currentUserRole: currentMembership.role,
        currentUserMembershipId: currentMembership.id,
      };
    }),

  addMember: protectedProcedure
    .input(teamMemberAddInputSchema)
    .mutation(async ({ ctx, input }) => {
      const team = await getManageableTeam({
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

      try {
        return await ctx.db.$transaction(async (tx) => {
          const member = await tx.teamMember.create({
            data: {
              teamId: team.id,
              userId: profile.userId,
              role: input.role,
              functionRoles: input.functionRoles,
            },
          });

          await createAuditLog(tx, {
            actorId: ctx.session.user.id,
            action: AuditAction.TEAM_MEMBER_ADDED,
            targetType: "TEAM",
            targetId: team.id,
            metadata: {
              targetUserId: profile.userId,
              role: input.role,
              functionRoles: input.functionRoles,
            },
          });

          return member;
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

  updateMemberRole: protectedProcedure
    .input(teamMemberUpdateRoleInputSchema)
    .mutation(async ({ ctx, input }) => {
      const membership = await getManageableMembership({
        db: ctx.db,
        membershipId: input.membershipId,
        userId: ctx.session.user.id,
      });

      return ctx.db.$transaction(async (tx) => {
        const updatedMember = await tx.teamMember.update({
          where: { id: membership.id },
          data: {
            role: input.role,
          },
        });

        await createAuditLog(tx, {
          actorId: ctx.session.user.id,
          action: AuditAction.TEAM_MEMBER_ROLE_UPDATED,
          targetType: "TEAM",
          targetId: membership.teamId,
          metadata: {
            targetUserId: membership.userId,
            previousRole: membership.role,
            newRole: input.role,
          },
        });

        return updatedMember;
      });
    }),

  updateMemberFunctionRoles: protectedProcedure
    .input(teamMemberUpdateFunctionRolesInputSchema)
    .mutation(async ({ ctx, input }) => {
      const membership = await getMembershipForFunctionRoleManagement({
        db: ctx.db,
        membershipId: input.membershipId,
        userId: ctx.session.user.id,
      });

      return ctx.db.$transaction(async (tx) => {
        const updatedMember = await tx.teamMember.update({
          where: { id: membership.id },
          data: {
            functionRoles: input.functionRoles,
          },
        });

        await createAuditLog(tx, {
          actorId: ctx.session.user.id,
          action: AuditAction.TEAM_MEMBER_FUNCTION_ROLES_UPDATED,
          targetType: "TEAM",
          targetId: membership.teamId,
          metadata: {
            targetUserId: membership.userId,
            previousFunctionRoles: membership.functionRoles,
            newFunctionRoles: input.functionRoles,
          },
        });

        return updatedMember;
      });
    }),

  removeMember: protectedProcedure
    .input(teamMemberRemoveInputSchema)
    .mutation(async ({ ctx, input }) => {
      const membership = await getManageableMembership({
        db: ctx.db,
        membershipId: input.membershipId,
        userId: ctx.session.user.id,
      });

      return ctx.db.$transaction(async (tx) => {
        const removedMember = await tx.teamMember.delete({
          where: { id: membership.id },
        });

        await createAuditLog(tx, {
          actorId: ctx.session.user.id,
          action: AuditAction.TEAM_MEMBER_REMOVED,
          targetType: "TEAM",
          targetId: membership.teamId,
          metadata: {
            targetUserId: membership.userId,
            previousRole: membership.role,
          },
        });

        return removedMember;
      });
    }),

  transferOwnership: protectedProcedure
    .input(teamOwnershipTransferInputSchema)
    .mutation(async ({ ctx, input }) => {
      const targetMembership = await ctx.db.teamMember.findUnique({
        where: { id: input.newOwnerMembershipId },
        select: {
          id: true,
          teamId: true,
          userId: true,
          role: true,
          team: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
        },
      });

      if (!targetMembership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Участник команды не найден.",
        });
      }

      const currentOwnerMembership = await ctx.db.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: targetMembership.teamId,
            userId: ctx.session.user.id,
          },
        },
        select: {
          id: true,
          teamId: true,
          userId: true,
          role: true,
        },
      });

      if (currentOwnerMembership?.role !== TeamRole.OWNER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Передать владение может только текущий владелец команды.",
        });
      }

      if (currentOwnerMembership.id === targetMembership.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Нельзя передать владение самому себе.",
        });
      }

      if (currentOwnerMembership.teamId !== targetMembership.teamId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Передать владение может только текущий владелец команды.",
        });
      }

      await ctx.db.$transaction(async (tx) => {
        await tx.teamMember.update({
          where: { id: currentOwnerMembership.id },
          data: { role: TeamRole.ADMIN },
        });
        await tx.teamMember.update({
          where: { id: targetMembership.id },
          data: { role: TeamRole.OWNER },
        });
        await createAuditLog(tx, {
          actorId: ctx.session.user.id,
          action: AuditAction.TEAM_OWNER_TRANSFERRED,
          targetType: "TEAM",
          targetId: targetMembership.teamId,
          metadata: {
            previousOwnerUserId: currentOwnerMembership.userId,
            newOwnerUserId: targetMembership.userId,
          },
        });
      });

      return { success: true };
    }),

  leaveMine: protectedProcedure
    .input(teamLeaveInputSchema)
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.teamMember.findFirst({
        where: {
          userId: ctx.session.user.id,
          team: {
            slug: input.teamSlug,
          },
        },
        select: {
          id: true,
          teamId: true,
          role: true,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Вы не состоите в этой команде.",
        });
      }

      if (membership.role === TeamRole.OWNER) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Владелец не может выйти из команды. Сначала передайте владение другому участнику.",
        });
      }

      await ctx.db.$transaction(async (tx) => {
        await tx.teamMember.delete({
          where: { id: membership.id },
        });

        await createAuditLog(tx, {
          actorId: ctx.session.user.id,
          action: AuditAction.TEAM_MEMBER_LEFT,
          targetType: "TEAM",
          targetId: membership.teamId,
          metadata: {
            userId: ctx.session.user.id,
            previousRole: membership.role,
          },
        });
      });

      return { success: true };
    }),
});
