import { TRPCError } from "@trpc/server";

import {
  ObjectVisibility,
  TeamRole,
  TeamStatus,
} from "@/generated/prisma/enums";
import {
  objectCreateInputSchema,
  objectSlugLookupSchema,
  objectUpdateInputSchema,
} from "@/lib/validation/object";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import type { db as database } from "@/server/db";
import { publicEventStatuses } from "@/server/events/statuses";

const publicTeamStatuses = [TeamStatus.REGULAR, TeamStatus.VERIFIED];
const manageableTeamRoles = [
  TeamRole.OWNER,
  TeamRole.ADMIN,
  TeamRole.ORGANIZER,
];

const isUniqueConstraintError = (error: unknown) =>
  error instanceof Error && error.message.includes("Unique constraint failed");

type ObjectRouterDb = typeof database;

const publicLinkedEventsWhere = {
  status: {
    in: publicEventStatuses,
  },
  team: {
    status: {
      in: publicTeamStatuses,
    },
  },
};

const canManageTeam = async ({
  db,
  requirePublicStatus = false,
  teamId,
  userId,
}: {
  db: ObjectRouterDb;
  requirePublicStatus?: boolean;
  teamId: string;
  userId: string;
}) => {
  const membership = await db.teamMember.findFirst({
    where: {
      team: {
        id: teamId,
        ...(requirePublicStatus
          ? {
              status: {
                in: publicTeamStatuses,
              },
            }
          : {}),
      },
      userId,
      role: {
        in: manageableTeamRoles,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(membership);
};

export const objectRouter = createTRPCRouter({
  listPublic: publicProcedure.query(({ ctx }) => {
    return ctx.db.jumpObject.findMany({
      where: {
        visibility: ObjectVisibility.PUBLIC,
        createdByTeam: {
          is: {
            status: {
              in: publicTeamStatuses,
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        createdByTeam: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        events: {
          where: publicLinkedEventsWhere,
          select: {
            id: true,
          },
        },
      },
    });
  }),

  getBySlug: publicProcedure
    .input(objectSlugLookupSchema)
    .query(({ ctx, input }) => {
      return ctx.db.jumpObject.findFirst({
        where: {
          slug: input,
          visibility: ObjectVisibility.PUBLIC,
          createdByTeam: {
            is: {
              status: {
                in: publicTeamStatuses,
              },
            },
          },
        },
        include: {
          createdByTeam: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          events: {
            where: publicLinkedEventsWhere,
            orderBy: {
              startsAt: "asc",
            },
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      });
    }),

  getMine: protectedProcedure.query(({ ctx }) => {
    return ctx.db.jumpObject.findMany({
      where: {
        OR: [
          {
            createdById: ctx.session.user.id,
          },
          {
            createdByTeam: {
              members: {
                some: {
                  userId: ctx.session.user.id,
                  role: {
                    in: manageableTeamRoles,
                  },
                },
              },
            },
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        createdByTeam: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        events: {
          select: {
            id: true,
          },
        },
      },
    });
  }),

  getForEdit: protectedProcedure
    .input(objectSlugLookupSchema)
    .query(async ({ ctx, input }) => {
      const object = await ctx.db.jumpObject.findUnique({
        where: { slug: input },
        include: {
          createdByTeam: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      if (!object) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Объект не найден.",
        });
      }

      const canEditByTeam = object.createdByTeamId
        ? await canManageTeam({
            db: ctx.db,
            teamId: object.createdByTeamId,
            userId: ctx.session.user.id,
          })
        : false;

      if (object.createdById !== ctx.session.user.id && !canEditByTeam) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "У вас нет прав на редактирование этого объекта.",
        });
      }

      return object;
    }),

  create: protectedProcedure
    .input(objectCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.profile.findUnique({
        where: { userId: ctx.session.user.id },
        select: { id: true },
      });

      if (!profile) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Перед созданием объекта заполните профиль.",
        });
      }

      const canCreateForTeam = await canManageTeam({
        db: ctx.db,
        requirePublicStatus: true,
        teamId: input.teamId,
        userId: ctx.session.user.id,
      });

      if (!canCreateForTeam) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Создавать объекты могут только организаторы активных команд.",
        });
      }

      const existingObject = await ctx.db.jumpObject.findUnique({
        where: { slug: input.slug },
        select: { id: true },
      });

      if (existingObject) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Такой slug объекта уже занят.",
        });
      }

      try {
        const { teamId, ...objectInput } = input;

        return await ctx.db.jumpObject.create({
          data: {
            ...objectInput,
            createdById: ctx.session.user.id,
            createdByTeamId: teamId,
            visibility: ObjectVisibility.PUBLIC,
          },
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Такой slug объекта уже занят.",
          });
        }

        throw error;
      }
    }),

  update: protectedProcedure
    .input(objectUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const object = await ctx.db.jumpObject.findUnique({
        where: { slug: input.slug },
        select: {
          id: true,
          createdById: true,
          createdByTeamId: true,
        },
      });

      if (!object) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Объект не найден.",
        });
      }

      const canEditByTeam = object.createdByTeamId
        ? await canManageTeam({
            db: ctx.db,
            teamId: object.createdByTeamId,
            userId: ctx.session.user.id,
          })
        : false;

      if (object.createdById !== ctx.session.user.id && !canEditByTeam) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "У вас нет прав на редактирование этого объекта.",
        });
      }

      return ctx.db.jumpObject.update({
        where: { id: object.id },
        data: {
          name: input.name,
          type: input.type,
          heightMeters: input.heightMeters,
          region: input.region,
          description: input.description,
          coverImageUrl: input.coverImageUrl,
        },
      });
    }),
});
