import { TRPCError } from "@trpc/server";
import { createHash } from "node:crypto";

import {
  NotificationType,
  ObjectVisibility,
  PostPinTargetType,
  TeamRole,
  TeamStatus,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import {
  commentCreateInputSchema,
  commentDeleteInputSchema,
  commentUpdateInputSchema,
  postCreateInputSchema,
  postDeleteInputSchema,
  postIdInputSchema,
  postPinInputSchema,
  postPublicListInputSchema,
  postUpdateInputSchema,
  postViewInputSchema,
} from "@/lib/validation/post";
import {
  assertCommentCreateLimit,
  assertLikeCreateLimit,
  assertPostCreateLimit,
} from "@/server/anti-spam/rate-limit";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import type { db as database } from "@/server/db";
import { publicEventStatuses } from "@/server/events/statuses";
import { deleteMediaIfUnreferenced } from "@/server/media/cleanup";
import {
  resolveImageMediaForCreate,
  resolveImageMediaForUpdate,
} from "@/server/media/usage";
import {
  createNotification,
  notifyObjectFollowersAboutPost,
  notifyTeamFollowersAboutPost,
} from "@/server/notifications/service";

const publicTeamStatuses = [TeamStatus.REGULAR, TeamStatus.VERIFIED];
const manageableTeamRoles = [
  TeamRole.OWNER,
  TeamRole.ADMIN,
  TeamRole.ORGANIZER,
];

type PostRouterDb = typeof database;

const hashAnonymousViewerId = (anonymousViewerId: string) =>
  createHash("sha256").update(anonymousViewerId).digest("hex");

type PinTargetContext = {
  targetId: string;
  targetType: PostPinTargetType;
};

type InternalPinTargetContext = PinTargetContext & {
  teamIdForPermission: string;
};

export const publicPostWhere = {
  hiddenAt: null,
  showInFeed: true,
  AND: [
    {
      OR: [
        { teamId: null },
        {
          team: {
            status: {
              in: publicTeamStatuses,
            },
          },
        },
      ],
    },
    {
      OR: [
        { eventId: null },
        {
          event: {
            status: {
              in: publicEventStatuses,
            },
            team: {
              status: {
                in: publicTeamStatuses,
              },
            },
          },
        },
      ],
    },
    {
      OR: [
        { objectId: null },
        {
          object: {
            visibility: ObjectVisibility.PUBLIC,
            createdByTeam: {
              is: {
                status: {
                  in: publicTeamStatuses,
                },
              },
            },
          },
        },
      ],
    },
  ],
} satisfies Prisma.PostWhereInput;

const authorInclude = {
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
};

const linkedEntityInclude = {
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
  object: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
};

const getPublicPostWhere = (
  filterClauses: Prisma.PostWhereInput[] = [],
): Prisma.PostWhereInput => ({
  ...publicPostWhere,
  AND: [...publicPostWhere.AND, ...filterClauses],
});

const getReadablePostWhere = ({
  postId,
  userId,
}: {
  postId: string;
  userId: string;
}): Prisma.PostWhereInput => ({
  id: postId,
  OR: [
    publicPostWhere,
    ...(userId
      ? [
          {
            authorId: userId,
            hiddenAt: null,
          },
        ]
      : []),
  ],
});

const emptyPinsWhere = {
  id: {
    in: [],
  },
};

const getPinsWhereForTarget = (target: PinTargetContext | null) =>
  target
    ? {
        targetType: target.targetType,
        targetId: target.targetId,
      }
    : emptyPinsWhere;

const resolvePinTargetFromFilters = async ({
  db,
  event,
  object,
  team,
}: {
  db: PostRouterDb;
  event: string;
  object: string;
  team: string;
}): Promise<InternalPinTargetContext | null> => {
  const activeEntityFilters = [team, event, object].filter(Boolean);

  if (activeEntityFilters.length !== 1) return null;

  if (team) {
    const targetTeam = await db.team.findFirst({
      where: {
        slug: team,
        status: {
          in: publicTeamStatuses,
        },
      },
      select: {
        id: true,
      },
    });

    return targetTeam
      ? {
          targetType: PostPinTargetType.TEAM,
          targetId: targetTeam.id,
          teamIdForPermission: targetTeam.id,
        }
      : null;
  }

  if (event) {
    const targetEvent = await db.event.findFirst({
      where: {
        slug: event,
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
        teamId: true,
      },
    });

    return targetEvent
      ? {
          targetType: PostPinTargetType.EVENT,
          targetId: targetEvent.id,
          teamIdForPermission: targetEvent.teamId,
        }
      : null;
  }

  if (object) {
    const targetObject = await db.jumpObject.findFirst({
      where: {
        slug: object,
        visibility: ObjectVisibility.PUBLIC,
        createdByTeam: {
          is: {
            status: {
              in: publicTeamStatuses,
            },
          },
        },
      },
      select: {
        id: true,
        createdByTeamId: true,
      },
    });

    return targetObject?.createdByTeamId
      ? {
          targetType: PostPinTargetType.OBJECT,
          targetId: targetObject.id,
          teamIdForPermission: targetObject.createdByTeamId,
        }
      : null;
  }

  return null;
};

const canManagePinTarget = async ({
  db,
  target,
  userId,
}: {
  db: PostRouterDb;
  target: InternalPinTargetContext;
  userId: string;
}) => {
  const membership = await db.teamMember.findFirst({
    where: {
      teamId: target.teamIdForPermission,
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

const getValidatedPinTarget = async ({
  db,
  targetId,
  targetType,
}: {
  db: PostRouterDb;
  targetId: string;
  targetType: PostPinTargetType;
}): Promise<InternalPinTargetContext> => {
  if (targetType === PostPinTargetType.TEAM) {
    const team = await db.team.findFirst({
      where: {
        id: targetId,
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

    return {
      targetType,
      targetId: team.id,
      teamIdForPermission: team.id,
    };
  }

  if (targetType === PostPinTargetType.EVENT) {
    const event = await db.event.findFirst({
      where: {
        id: targetId,
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
        teamId: true,
      },
    });

    if (!event) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Мероприятие не найдено.",
      });
    }

    return {
      targetType,
      targetId: event.id,
      teamIdForPermission: event.teamId,
    };
  }

  const object = await db.jumpObject.findFirst({
    where: {
      id: targetId,
      visibility: ObjectVisibility.PUBLIC,
      createdByTeam: {
        is: {
          status: {
            in: publicTeamStatuses,
          },
        },
      },
    },
    select: {
      id: true,
      createdByTeamId: true,
    },
  });

  if (!object?.createdByTeamId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Объект не найден.",
    });
  }

  return {
    targetType,
    targetId: object.id,
    teamIdForPermission: object.createdByTeamId,
  };
};

const validatePostCanBePinnedToTarget = async ({
  db,
  postId,
  target,
}: {
  db: PostRouterDb;
  postId: string;
  target: PinTargetContext;
}) => {
  const post = await db.post.findFirst({
    where: {
      id: postId,
      ...publicPostWhere,
    },
    select: {
      id: true,
      teamId: true,
      eventId: true,
      objectId: true,
    },
  });

  if (!post) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Пост не найден.",
    });
  }

  const isLinkedToTarget =
    (target.targetType === PostPinTargetType.TEAM &&
      post.teamId === target.targetId) ||
    (target.targetType === PostPinTargetType.EVENT &&
      post.eventId === target.targetId) ||
    (target.targetType === PostPinTargetType.OBJECT &&
      post.objectId === target.targetId);

  if (!isLinkedToTarget) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Пост не связан с выбранной сущностью.",
    });
  }

  return post;
};

const ensureProfile = async (db: PostRouterDb, userId: string) => {
  const profile = await db.profile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Перед публикацией заполните профиль.",
    });
  }
};

const ensureManageablePublicTeam = async (
  db: PostRouterDb,
  teamId: string,
  userId: string,
) => {
  const membership = await db.teamMember.findFirst({
    where: {
      teamId,
      userId,
      role: {
        in: manageableTeamRoles,
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
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Связать пост можно только с активной командой, которой вы управляете.",
    });
  }
};

const ensurePublicEvent = async (db: PostRouterDb, eventId: string) => {
  const event = await db.event.findFirst({
    where: {
      id: eventId,
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
  });

  if (!event) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Выберите публичное мероприятие.",
    });
  }
};

const ensurePublicObject = async (db: PostRouterDb, objectId: string) => {
  const object = await db.jumpObject.findFirst({
    where: {
      id: objectId,
      visibility: ObjectVisibility.PUBLIC,
      createdByTeam: {
        is: {
          status: {
            in: publicTeamStatuses,
          },
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!object) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Выберите публичный объект из каталога.",
    });
  }
};

export const postRouter = createTRPCRouter({
  listPublic: publicProcedure
    .input(postPublicListInputSchema.optional())
    .query(async ({ ctx, input }) => {
      const q = input?.q ?? "";
      const team = input?.team ?? "";
      const event = input?.event ?? "";
      const object = input?.object ?? "";
      const sort = input?.sort ?? "createdAtDesc";
      const filterClauses: Prisma.PostWhereInput[] = [];
      const internalPinTarget = await resolvePinTargetFromFilters({
        db: ctx.db,
        team,
        event,
        object,
      });
      const currentPinTarget = internalPinTarget
        ? {
            targetType: internalPinTarget.targetType,
            targetId: internalPinTarget.targetId,
          }
        : null;
      const currentUserCanPin =
        internalPinTarget && ctx.session?.user?.id
          ? await canManagePinTarget({
              db: ctx.db,
              target: internalPinTarget,
              userId: ctx.session.user.id,
            })
          : false;

      if (team) {
        filterClauses.push({
          team: {
            is: {
              slug: team,
            },
          },
        });
      }

      if (event) {
        filterClauses.push({
          event: {
            is: {
              slug: event,
            },
          },
        });
      }

      if (object) {
        filterClauses.push({
          object: {
            is: {
              slug: object,
            },
          },
        });
      }

      if (q) {
        filterClauses.push({
          OR: [
            {
              content: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              author: {
                is: {
                  profile: {
                    is: {
                      displayName: {
                        contains: q,
                        mode: "insensitive",
                      },
                    },
                  },
                },
              },
            },
            {
              author: {
                is: {
                  profile: {
                    is: {
                      username: {
                        contains: q,
                        mode: "insensitive",
                      },
                    },
                  },
                },
              },
            },
            {
              team: {
                is: {
                  name: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              event: {
                is: {
                  title: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              object: {
                is: {
                  name: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        });
      }

      const where = getPublicPostWhere(filterClauses);
      const publicLinkedPostWhere = getPublicPostWhere();

      const [posts, availableTeams, availableEvents, availableObjects] =
        await Promise.all([
          ctx.db.post.findMany({
            where,
            orderBy: {
              createdAt: "desc",
            },
            include: {
              author: authorInclude,
              ...linkedEntityInclude,
              imageMedia: {
                select: {
                  id: true,
                  alt: true,
                },
              },
              pins: {
                where: getPinsWhereForTarget(currentPinTarget),
                select: {
                  id: true,
                  targetType: true,
                  targetId: true,
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
          }),
          ctx.db.team.findMany({
            where: {
              status: {
                in: publicTeamStatuses,
              },
              posts: {
                some: publicLinkedPostWhere,
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
          ctx.db.event.findMany({
            where: {
              status: {
                in: publicEventStatuses,
              },
              team: {
                status: {
                  in: publicTeamStatuses,
                },
              },
              posts: {
                some: publicLinkedPostWhere,
              },
            },
            orderBy: {
              title: "asc",
            },
            select: {
              id: true,
              title: true,
              slug: true,
            },
          }),
          ctx.db.jumpObject.findMany({
            where: {
              visibility: ObjectVisibility.PUBLIC,
              createdByTeam: {
                is: {
                  status: {
                    in: publicTeamStatuses,
                  },
                },
              },
              posts: {
                some: publicLinkedPostWhere,
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
      const comparePosts = (
        left: (typeof posts)[number],
        right: (typeof posts)[number],
      ) => {
        if (sort === "createdAtAsc") {
          return left.createdAt.getTime() - right.createdAt.getTime();
        }

        if (sort === "popular") {
          const viewsDifference = right.viewsCount - left.viewsCount;

          if (viewsDifference !== 0) return viewsDifference;

          const likesDifference = right._count.likes - left._count.likes;

          if (likesDifference !== 0) return likesDifference;

          const commentsDifference =
            right._count.comments - left._count.comments;

          if (commentsDifference !== 0) return commentsDifference;
        }

        return right.createdAt.getTime() - left.createdAt.getTime();
      };
      const orderedPosts = posts.sort((left, right) => {
        if (currentPinTarget) {
          const leftPinned = left.pins.length > 0;
          const rightPinned = right.pins.length > 0;

          if (leftPinned !== rightPinned) return leftPinned ? -1 : 1;
        }

        return comparePosts(left, right);
      });

      return {
        posts: orderedPosts.map((post) => ({
          ...post,
          isPinnedInCurrentFilter: post.pins.length > 0,
        })),
        availableTeams,
        availableEvents,
        availableObjects,
        currentPinTarget,
        currentUserCanPin,
        filters: {
          q,
          team,
          event,
          object,
          sort,
        },
      };
    }),

  getById: publicProcedure.input(postIdInputSchema).query(({ ctx, input }) => {
    const userId = ctx.session?.user?.id ?? "";

    return ctx.db.post.findFirst({
      where: getReadablePostWhere({ postId: input, userId }),
      include: {
        author: authorInclude,
        ...linkedEntityInclude,
        imageMedia: {
          select: {
            id: true,
            alt: true,
          },
        },
        likes: {
          where: {
            userId,
          },
          select: {
            id: true,
          },
        },
        comments: {
          where: {
            hiddenAt: null,
          },
          orderBy: {
            createdAt: "asc",
          },
          include: {
            author: authorInclude,
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
    });
  }),

  trackView: publicProcedure
    .input(postViewInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id ?? null;
      const post = await ctx.db.post.findFirst({
        where: getReadablePostWhere({
          postId: input.postId,
          userId: userId ?? "",
        }),
        select: {
          id: true,
          authorId: true,
          viewsCount: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Пост не найден.",
        });
      }

      if (userId && post.authorId === userId) {
        return { viewsCount: post.viewsCount };
      }

      if (!userId && !input.anonymousViewerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Не удалось определить просмотр.",
        });
      }

      const anonymousIdHash = userId
        ? null
        : hashAnonymousViewerId(input.anonymousViewerId!);

      return ctx.db.$transaction(async (tx) => {
        const result = await tx.postView.createMany({
          data: [
            {
              postId: post.id,
              userId,
              anonymousIdHash,
            },
          ],
          skipDuplicates: true,
        });

        if (result.count > 0) {
          const updatedPost = await tx.post.update({
            where: {
              id: post.id,
            },
            data: {
              viewsCount: {
                increment: 1,
              },
            },
            select: {
              viewsCount: true,
            },
          });

          return { viewsCount: updatedPost.viewsCount };
        }

        await tx.postView.updateMany({
          where: userId
            ? {
                postId: post.id,
                userId,
              }
            : {
                postId: post.id,
                anonymousIdHash,
              },
          data: {
            lastSeenAt: new Date(),
          },
        });

        return { viewsCount: post.viewsCount };
      });
    }),

  getMine: protectedProcedure.query(({ ctx }) => {
    return ctx.db.post.findMany({
      where: {
        authorId: ctx.session.user.id,
      },
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
        updatedAt: true,
        hiddenAt: true,
        showInFeed: true,
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
        object: {
          select: {
            id: true,
            name: true,
            slug: true,
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
    });
  }),

  create: protectedProcedure
    .input(postCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ensureProfile(ctx.db, ctx.session.user.id);
      await assertPostCreateLimit(ctx.db, ctx.session.user.id);

      if (input.teamId) {
        await ensureManageablePublicTeam(
          ctx.db,
          input.teamId,
          ctx.session.user.id,
        );
      }

      if (input.eventId) {
        await ensurePublicEvent(ctx.db, input.eventId);
      }

      if (input.objectId) {
        await ensurePublicObject(ctx.db, input.objectId);
      }

      const image = await resolveImageMediaForCreate({
        db: ctx.db,
        input: {
          mediaId: input.imageMediaId,
          url: input.imageUrl,
        },
        userId: ctx.session.user.id,
      });

      const createdPost = await ctx.db.post.create({
        data: {
          authorId: ctx.session.user.id,
          teamId: input.teamId,
          eventId: input.eventId,
          objectId: input.objectId,
          content: input.content,
          imageMediaId: image.mediaId,
          imageUrl: image.url,
          showInFeed: input.showInFeed,
        },
      });

      if (input.showInFeed) {
        try {
          const notifiedUserIds = input.teamId
            ? await notifyTeamFollowersAboutPost(ctx.db, {
                teamId: input.teamId,
                postId: createdPost.id,
                actorUserId: ctx.session.user.id,
              })
            : [];

          if (input.objectId) {
            await notifyObjectFollowersAboutPost(ctx.db, {
              objectId: input.objectId,
              postId: createdPost.id,
              actorUserId: ctx.session.user.id,
              excludeUserIds: notifiedUserIds,
            });
          }
        } catch {
          // Best effort: post creation must not fail because notifications did.
        }
      }

      return createdPost;
    }),

  updateMine: protectedProcedure
    .input(postUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.post.findFirst({
        where: {
          id: input.postId,
          hiddenAt: null,
        },
        select: {
          id: true,
          authorId: true,
          imageMediaId: true,
          imageUrl: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Пост не найден.",
        });
      }

      if (post.authorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Можно редактировать только свои посты.",
        });
      }

      const image = await resolveImageMediaForUpdate({
        db: ctx.db,
        existingMediaId: post.imageMediaId,
        existingUrl: post.imageUrl,
        input: {
          mediaId: input.imageMediaId,
          url: input.imageUrl,
        },
        userId: ctx.session.user.id,
      });

      const updatedPost = await ctx.db.post.update({
        where: {
          id: post.id,
        },
        data: {
          content: input.content,
          imageMediaId: image.mediaId,
          imageUrl: image.url,
        },
      });

      if (post.imageMediaId && post.imageMediaId !== image.mediaId) {
        try {
          await deleteMediaIfUnreferenced({
            db: ctx.db,
            mediaId: post.imageMediaId,
          });
        } catch {
          // Best effort: scheduled cleanup can retry storage failures.
        }
      }

      return updatedPost;
    }),

  deleteMine: protectedProcedure
    .input(postDeleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.post.findFirst({
        where: {
          id: input.postId,
          hiddenAt: null,
        },
        select: {
          id: true,
          authorId: true,
          imageMediaId: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Пост не найден.",
        });
      }

      if (post.authorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Можно удалить только свои посты.",
        });
      }

      await ctx.db.post.update({
        where: {
          id: post.id,
        },
        data: {
          hiddenAt: new Date(),
        },
      });

      if (post.imageMediaId) {
        try {
          await deleteMediaIfUnreferenced({
            db: ctx.db,
            mediaId: post.imageMediaId,
          });
        } catch {
          // Best effort: scheduled cleanup can retry storage failures.
        }
      }

      return { success: true };
    }),

  pin: protectedProcedure
    .input(postPinInputSchema)
    .mutation(async ({ ctx, input }) => {
      const target = await getValidatedPinTarget({
        db: ctx.db,
        targetType: input.targetType,
        targetId: input.targetId,
      });

      const canManage = await canManagePinTarget({
        db: ctx.db,
        target,
        userId: ctx.session.user.id,
      });

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "У вас нет прав закреплять посты здесь.",
        });
      }

      await validatePostCanBePinnedToTarget({
        db: ctx.db,
        postId: input.postId,
        target,
      });

      await ctx.db.postPin.upsert({
        where: {
          postId_targetType_targetId: {
            postId: input.postId,
            targetType: target.targetType,
            targetId: target.targetId,
          },
        },
        create: {
          postId: input.postId,
          targetType: target.targetType,
          targetId: target.targetId,
          pinnedById: ctx.session.user.id,
        },
        update: {},
      });

      return { success: true };
    }),

  unpin: protectedProcedure
    .input(postPinInputSchema)
    .mutation(async ({ ctx, input }) => {
      const target = await getValidatedPinTarget({
        db: ctx.db,
        targetType: input.targetType,
        targetId: input.targetId,
      });

      const canManage = await canManagePinTarget({
        db: ctx.db,
        target,
        userId: ctx.session.user.id,
      });

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "У вас нет прав откреплять посты здесь.",
        });
      }

      await validatePostCanBePinnedToTarget({
        db: ctx.db,
        postId: input.postId,
        target,
      });

      await ctx.db.postPin.deleteMany({
        where: {
          postId: input.postId,
          targetType: target.targetType,
          targetId: target.targetId,
        },
      });

      return { success: true };
    }),

  addComment: protectedProcedure
    .input(commentCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ensureProfile(ctx.db, ctx.session.user.id);
      await assertCommentCreateLimit(ctx.db, ctx.session.user.id);

      const post = await ctx.db.post.findFirst({
        where: {
          id: input.postId,
          ...publicPostWhere,
        },
        select: {
          id: true,
          authorId: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Пост не найден.",
        });
      }

      return ctx.db.$transaction(async (tx) => {
        const comment = await tx.comment.create({
          data: {
            postId: input.postId,
            authorId: ctx.session.user.id,
            content: input.content,
          },
        });

        if (post.authorId !== ctx.session.user.id) {
          await createNotification(tx, {
            userId: post.authorId,
            type: NotificationType.POST_COMMENTED,
            title: "Новый комментарий",
            body: "К вашему посту оставили новый комментарий.",
            href: `/posts/${post.id}`,
          });
        }

        return comment;
      });
    }),

  updateCommentMine: protectedProcedure
    .input(commentUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.comment.findFirst({
        where: {
          id: input.commentId,
          hiddenAt: null,
          post: getPublicPostWhere(),
        },
        select: {
          id: true,
          authorId: true,
        },
      });

      if (!comment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Комментарий не найден.",
        });
      }

      if (comment.authorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Можно редактировать только свои комментарии.",
        });
      }

      return ctx.db.comment.update({
        where: {
          id: comment.id,
        },
        data: {
          content: input.content,
        },
      });
    }),

  deleteCommentMine: protectedProcedure
    .input(commentDeleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.comment.findFirst({
        where: {
          id: input.commentId,
          hiddenAt: null,
        },
        select: {
          id: true,
          authorId: true,
        },
      });

      if (!comment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Комментарий не найден.",
        });
      }

      if (comment.authorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Можно удалить только свои комментарии.",
        });
      }

      await ctx.db.comment.update({
        where: {
          id: comment.id,
        },
        data: {
          hiddenAt: new Date(),
        },
      });

      return { success: true };
    }),

  toggleLike: protectedProcedure
    .input(postIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.post.findFirst({
        where: {
          id: input,
          ...publicPostWhere,
        },
        select: {
          id: true,
          authorId: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Пост не найден.",
        });
      }

      const existingLike = await ctx.db.postLike.findUnique({
        where: {
          postId_userId: {
            postId: input,
            userId: ctx.session.user.id,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingLike) {
        await ctx.db.postLike.delete({
          where: {
            id: existingLike.id,
          },
        });

        return { liked: false };
      }

      await assertLikeCreateLimit(ctx.db, ctx.session.user.id);

      await ctx.db.$transaction(async (tx) => {
        await tx.postLike.create({
          data: {
            postId: input,
            userId: ctx.session.user.id,
          },
        });

        if (post.authorId !== ctx.session.user.id) {
          await createNotification(tx, {
            userId: post.authorId,
            type: NotificationType.POST_LIKED,
            title: "Новый лайк",
            body: "Ваш пост понравился другому участнику.",
            href: `/posts/${post.id}`,
          });
        }
      });

      return { liked: true };
    }),
});
