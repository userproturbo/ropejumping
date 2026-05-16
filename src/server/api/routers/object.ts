import { TRPCError } from "@trpc/server";

import {
  MediaStatus,
  ObjectType,
  ObjectVisibility,
  PostPinTargetType,
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
import { publicPostWhere } from "@/server/api/routers/post";
import type { db as database } from "@/server/db";
import { publicEventStatuses } from "@/server/events/statuses";
import { deleteMediaIfUnreferenced } from "@/server/media/cleanup";
import {
  resolveImageMediaForCreate,
  resolveImageMediaForUpdate,
} from "@/server/media/usage";

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

const publicObjectImpressionSelect = {
  id: true,
  body: true,
  createdAt: true,
  editedAt: true,
  authorId: true,
  author: {
    select: {
      profile: {
        select: {
          username: true,
          displayName: true,
          avatarUrl: true,
          avatarMedia: {
            select: {
              alt: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ObjectImpressionSelect;

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
            coverMedia: {
              select: {
                id: true,
                alt: true,
              },
            },
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
        coverMedia: object.coverMedia,
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
    .query(async ({ ctx, input }) => {
      const object = await ctx.db.jumpObject.findFirst({
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
          coverMedia: {
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
          likes: {
            where: {
              userId: ctx.session?.user?.id ?? "",
            },
            select: {
              id: true,
            },
            take: 1,
          },
          impressions: {
            where: {
              hiddenAt: null,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 20,
            select: publicObjectImpressionSelect,
          },
          _count: {
            select: {
              followers: true,
              likes: true,
              impressions: {
                where: {
                  hiddenAt: null,
                },
              },
            },
          },
          galleryImages: {
            where: {
              media: {
                deletedAt: null,
                status: MediaStatus.UPLOADED,
                url: { not: null },
              },
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              sortOrder: true,
              media: {
                select: {
                  id: true,
                  url: true,
                  alt: true,
                },
              },
            },
          },
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

      if (!object) return null;

      const objectPinWhere = {
        targetType: PostPinTargetType.OBJECT,
        targetId: object.id,
      };
      const postSelect = {
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
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        pins: {
          where: objectPinWhere,
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
      } satisfies Prisma.PostSelect;

      const currentUserId = ctx.session?.user?.id;
      const [pinnedPosts, latestPosts, myImpression] = await Promise.all([
        ctx.db.post.findMany({
          where: {
            ...publicPostWhere,
            objectId: object.id,
            pins: {
              some: objectPinWhere,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
          select: postSelect,
        }),
        ctx.db.post.findMany({
          where: {
            ...publicPostWhere,
            objectId: object.id,
            pins: {
              none: objectPinWhere,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
          select: postSelect,
        }),
        currentUserId
          ? ctx.db.objectImpression.findFirst({
              where: {
                objectId: object.id,
                authorId: currentUserId,
                hiddenAt: null,
              },
              select: publicObjectImpressionSelect,
            })
          : Promise.resolve(null),
      ]);

      const { followers, likes, _count, ...objectData } = object;

      return {
        ...objectData,
        followerCount: _count.followers,
        isFollowedByCurrentUser: followers.length > 0,
        likesCount: _count.likes,
        isLikedByCurrentUser: likes.length > 0,
        impressionsCount: _count.impressions,
        myImpression,
        posts: [...pinnedPosts, ...latestPosts].slice(0, 5),
      };
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
          coverMedia: {
            select: {
              id: true,
              alt: true,
            },
          },
          galleryImages: {
            where: {
              media: {
                deletedAt: null,
                status: MediaStatus.UPLOADED,
                url: { not: null },
              },
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              sortOrder: true,
              media: {
                select: {
                  id: true,
                  url: true,
                  alt: true,
                },
              },
            },
          },
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
          message:
            "Создавать объекты могут только организаторы активных команд.",
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
        const cover = await resolveImageMediaForCreate({
          db: ctx.db,
          input: {
            mediaId: objectInput.coverMediaId,
            url: objectInput.coverImageUrl,
          },
          userId: ctx.session.user.id,
        });

        const createdObject = await ctx.db.jumpObject.create({
          data: {
            ...objectInput,
            coverImageUrl: cover.url,
            coverMediaId: cover.mediaId,
            createdById: ctx.session.user.id,
            createdByTeamId: teamId,
            visibility: ObjectVisibility.PUBLIC,
          },
        });

        return createdObject;
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
          coverImageUrl: true,
          coverMediaId: true,
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

      const cover = await resolveImageMediaForUpdate({
        db: ctx.db,
        existingMediaId: object.coverMediaId,
        existingUrl: object.coverImageUrl,
        input: {
          mediaId: input.coverMediaId,
          url: input.coverImageUrl,
        },
        userId: ctx.session.user.id,
      });

      const updatedObject = await ctx.db.jumpObject.update({
        where: { id: object.id },
        data: {
          name: input.name,
          type: input.type,
          heightMeters: input.heightMeters,
          region: input.region,
          description: input.description,
          coverImageUrl: cover.url,
          coverMediaId: cover.mediaId,
        },
      });

      if (object.coverMediaId && object.coverMediaId !== cover.mediaId) {
        try {
          await deleteMediaIfUnreferenced({
            db: ctx.db,
            mediaId: object.coverMediaId,
          });
        } catch {
          // Best effort: scheduled cleanup can retry storage failures.
        }
      }

      return updatedObject;
    }),
});
