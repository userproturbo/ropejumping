import { TRPCError } from "@trpc/server";

import {
  ObjectType,
  ObjectVisibility,
  TeamRole,
  TeamStatus,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import {
  objectCreateInputSchema,
  objectPublicListInputSchema,
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

const objectTypeFilterValues = new Set<string>(Object.values(ObjectType));

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

const getPublicObjectsWhere = ({
  team,
}: {
  team?: string;
} = {}): Prisma.JumpObjectWhereInput => ({
  visibility: ObjectVisibility.PUBLIC,
  createdByTeam: {
    is: {
      status: {
        in: publicTeamStatuses,
      },
      ...(team ? { slug: team } : {}),
    },
  },
});

const normalizePublicObjectTypeFilter = (type: string | undefined) => {
  if (!type) return undefined;

  return objectTypeFilterValues.has(type) ? (type as ObjectType) : undefined;
};

const normalizeHeightRange = ({
  maxHeight,
  minHeight,
}: {
  maxHeight?: number;
  minHeight?: number;
}) => {
  if (minHeight && maxHeight && minHeight > maxHeight) {
    return {
      minHeight: maxHeight,
      maxHeight: minHeight,
    };
  }

  return {
    minHeight,
    maxHeight,
  };
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
  listPublic: publicProcedure
    .input(objectPublicListInputSchema.optional())
    .query(async ({ ctx, input }) => {
      const q = input?.q ?? "";
      const region = input?.region ?? "";
      const team = input?.team ?? "";
      const type = normalizePublicObjectTypeFilter(input?.type);
      const { minHeight, maxHeight } = normalizeHeightRange({
        minHeight: input?.minHeight,
        maxHeight: input?.maxHeight,
      });
      const hasHeightFilter =
        minHeight !== undefined || maxHeight !== undefined;
      const publicObjectsWhere = getPublicObjectsWhere();
      const filteredObjectsWhere: Prisma.JumpObjectWhereInput =
        getPublicObjectsWhere({ team });

      if (type) {
        filteredObjectsWhere.type = type;
      }

      if (region) {
        filteredObjectsWhere.region = region;
      }

      if (hasHeightFilter) {
        filteredObjectsWhere.heightMeters = {
          ...(minHeight ? { gte: minHeight } : {}),
          ...(maxHeight ? { lte: maxHeight } : {}),
        };
      }

      if (q) {
        filteredObjectsWhere.OR = [
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
            createdByTeam: {
              is: {
                name: {
                  contains: q,
                  mode: "insensitive",
                },
              },
            },
          },
        ];
      }

      const [objects, regionRows, availableTeams] = await Promise.all([
        ctx.db.jumpObject.findMany({
          where: filteredObjectsWhere,
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
            createdAt: true,
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
        }),
        ctx.db.jumpObject.findMany({
          where: {
            ...publicObjectsWhere,
            region: {
              not: null,
            },
          },
          distinct: ["region"],
          select: {
            region: true,
          },
        }),
        ctx.db.team.findMany({
          where: {
            status: {
              in: publicTeamStatuses,
            },
            objects: {
              some: {
                visibility: ObjectVisibility.PUBLIC,
              },
            },
          },
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        }),
      ]);

      const availableRegions = Array.from(
        new Set(
          regionRows
            .map((object) => object.region?.trim())
            .filter((objectRegion): objectRegion is string =>
              Boolean(objectRegion),
            ),
        ),
      ).sort((left, right) => left.localeCompare(right, "ru"));

      const orderedObjects = objects.sort((left, right) => {
        const linkedEventDifference = right.events.length - left.events.length;

        if (linkedEventDifference !== 0) return linkedEventDifference;

        const createdAtDifference =
          right.createdAt.getTime() - left.createdAt.getTime();

        if (createdAtDifference !== 0) return createdAtDifference;

        return left.name.localeCompare(right.name, "ru");
      });
      const publicObjects = orderedObjects.map((object) => ({
        id: object.id,
        name: object.name,
        slug: object.slug,
        type: object.type,
        heightMeters: object.heightMeters,
        region: object.region,
        coverImageUrl: object.coverImageUrl,
        createdByTeam: object.createdByTeam,
        events: object.events,
      }));

      return {
        objects: publicObjects,
        availableRegions,
        availableTeams,
        filters: {
          q,
          type: type ?? "",
          region,
          team,
          minHeight: minHeight ?? "",
          maxHeight: maxHeight ?? "",
        },
      };
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
