import { TRPCError } from "@trpc/server";

import {
  ObjectVisibility,
  TeamRole,
  TeamStatus,
} from "@/generated/prisma/enums";
import {
  commentCreateInputSchema,
  postCreateInputSchema,
  postIdInputSchema,
} from "@/lib/validation/post";
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

type PostRouterDb = typeof database;

const publicPostWhere = {
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
};

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
  listPublic: publicProcedure.query(({ ctx }) => {
    return ctx.db.post.findMany({
      where: publicPostWhere,
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
    });
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
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Пост не найден.",
        });
      }

      return ctx.db.comment.create({
        data: {
          postId: input.postId,
          authorId: ctx.session.user.id,
          content: input.content,
        },
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

      await ctx.db.postLike.create({
        data: {
          postId: input,
          userId: ctx.session.user.id,
        },
      });

      return { liked: true };
    }),
});
