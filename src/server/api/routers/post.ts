import { TRPCError } from "@trpc/server";

import {
  NotificationType,
  ObjectVisibility,
  TeamRole,
  TeamStatus,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import {
  commentCreateInputSchema,
  postCreateInputSchema,
  postIdInputSchema,
  postPublicListInputSchema,
} from "@/lib/validation/post";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import type { db as database } from "@/server/db";
import { publicEventStatuses } from "@/server/events/statuses";
import { createNotification } from "@/server/notifications/service";

const publicTeamStatuses = [TeamStatus.REGULAR, TeamStatus.VERIFIED];
const manageableTeamRoles = [
  TeamRole.OWNER,
  TeamRole.ADMIN,
  TeamRole.ORGANIZER,
];

type PostRouterDb = typeof database;

export const publicPostWhere = {
  hiddenAt: null,
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
      message: "Связать пост можно только с активной командой, которой вы управляете.",
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
      const filterClauses: Prisma.PostWhereInput[] = [];

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

      return {
        posts,
        availableTeams,
        availableEvents,
        availableObjects,
        filters: {
          q,
          team,
          event,
          object,
        },
      };
    }),

  getById: publicProcedure.input(postIdInputSchema).query(({ ctx, input }) => {
    const userId = ctx.session?.user?.id ?? "";

    return ctx.db.post.findFirst({
      where: {
        id: input,
        ...publicPostWhere,
      },
      include: {
        author: authorInclude,
        ...linkedEntityInclude,
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

  create: protectedProcedure
    .input(postCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ensureProfile(ctx.db, ctx.session.user.id);

      if (input.teamId) {
        await ensureManageablePublicTeam(ctx.db, input.teamId, ctx.session.user.id);
      }

      if (input.eventId) {
        await ensurePublicEvent(ctx.db, input.eventId);
      }

      if (input.objectId) {
        await ensurePublicObject(ctx.db, input.objectId);
      }

      return ctx.db.post.create({
        data: {
          authorId: ctx.session.user.id,
          teamId: input.teamId,
          eventId: input.eventId,
          objectId: input.objectId,
          content: input.content,
          imageUrl: input.imageUrl,
        },
      });
    }),

  addComment: protectedProcedure
    .input(commentCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ensureProfile(ctx.db, ctx.session.user.id);

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
