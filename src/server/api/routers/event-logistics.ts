import { TRPCError } from "@trpc/server";
import type { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import {
  EventLogisticsStatus,
  EventLogisticsType,
  TeamRole,
} from "@/generated/prisma/enums";
import {
  eventLogisticsCreateInputSchema,
  eventLogisticsJoinInputSchema,
  eventLogisticsListInputSchema,
  eventLogisticsPostIdInputSchema,
  eventLogisticsUpdateInputSchema,
} from "@/lib/validation/event-logistics";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { assertCanAccessEventChat } from "@/server/events/chat-permissions";
import { isEventChatReadOnlyStatus } from "@/server/events/chat-lifecycle";
import { isModeratorUser } from "@/server/moderation/permissions";

const managerRoles = [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.ORGANIZER];
const readOnlyMessage =
  "Мероприятие закрыто. Новые записи по логистике недоступны.";
const updateReadOnlyMessage =
  "Мероприятие закрыто. Редактирование записей по логистике недоступно.";
const reopenReadOnlyMessage =
  "Мероприятие закрыто. Запись по логистике нельзя открыть снова.";
const dailyLimitMessage =
  "Слишком много записей по логистике за сегодня. Попробуйте позже.";
const noSeatsMessage = "Свободных мест больше нет.";
const alreadyJoinedMessage = "Вы уже присоединились к этой поездке.";
const maxJoinRetries = 3;

const isSerializationConflict = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2034";

const postSelect = {
  id: true,
  type: true,
  status: true,
  fromLocation: true,
  departureTimeText: true,
  seatsAvailable: true,
  baggageNote: true,
  body: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
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
  joins: {
    where: {
      cancelledAt: null,
    },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      user: {
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
    },
  },
};

const getEventReadOnly = async (
  db: {
    event: {
      findUnique: (input: {
        where: { id: string };
        select: { status: true };
      }) => Promise<{ status: Parameters<typeof isEventChatReadOnlyStatus>[0] } | null>;
    };
  },
  eventId: string,
) => {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { status: true },
  });

  if (!event) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Мероприятие не найдено.",
    });
  }

  return isEventChatReadOnlyStatus(event.status);
};

const assertCanAccessLogistics = async (
  db: Parameters<typeof assertCanAccessEventChat>[0]["db"],
  eventId: string,
  userId: string,
) => {
  await assertCanAccessEventChat({ db, eventId, userId });
};

const assertCreateLimit = async (
  db: {
    eventLogisticsPost: {
      count: (input: {
        where: { authorId: string; createdAt: { gte: Date } };
      }) => Promise<number>;
    };
  },
  userId: string,
) => {
  const count = await db.eventLogisticsPost.count({
    where: {
      authorId: userId,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });

  if (count >= 20) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: dailyLimitMessage,
    });
  }
};

const buildUpdateData = (input: z.infer<typeof eventLogisticsUpdateInputSchema>) => ({
  ...(input.type !== undefined ? { type: input.type } : {}),
  ...(input.fromLocation !== undefined ? { fromLocation: input.fromLocation } : {}),
  ...(input.departureTimeText !== undefined
    ? { departureTimeText: input.departureTimeText }
    : {}),
  ...(input.seatsAvailable !== undefined
    ? { seatsAvailable: input.seatsAvailable }
    : {}),
  ...(input.baggageNote !== undefined ? { baggageNote: input.baggageNote } : {}),
  ...(input.body !== undefined ? { body: input.body } : {}),
});

export const eventLogisticsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(eventLogisticsListInputSchema)
    .query(async ({ ctx, input }) => {
      await assertCanAccessLogistics(ctx.db, input.eventId, ctx.session.user.id);
      const isReadOnly = await getEventReadOnly(ctx.db, input.eventId);

      const posts = await ctx.db.eventLogisticsPost.findMany({
        where: {
          eventId: input.eventId,
          hiddenAt: null,
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        select: postSelect,
      });

      return { posts, isReadOnly };
    }),

  create: protectedProcedure
    .input(eventLogisticsCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      await assertCanAccessLogistics(ctx.db, input.eventId, ctx.session.user.id);

      if (await getEventReadOnly(ctx.db, input.eventId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: readOnlyMessage });
      }

      await assertCreateLimit(ctx.db, ctx.session.user.id);

      return ctx.db.eventLogisticsPost.create({
        data: {
          eventId: input.eventId,
          authorId: ctx.session.user.id,
          type: input.type,
          fromLocation: input.fromLocation,
          departureTimeText: input.departureTimeText,
          seatsAvailable: input.seatsAvailable,
          baggageNote: input.baggageNote,
          body: input.body,
        },
        select: postSelect,
      });
    }),

  updateMine: protectedProcedure
    .input(eventLogisticsUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.eventLogisticsPost.findFirst({
        where: {
          id: input.postId,
          hiddenAt: null,
        },
        select: {
          id: true,
          authorId: true,
          eventId: true,
        },
      });

      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Запись не найдена." });
      }

      if (post.authorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Можно редактировать только свою запись.",
        });
      }

      if (await getEventReadOnly(ctx.db, post.eventId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: updateReadOnlyMessage,
        });
      }

      return ctx.db.eventLogisticsPost.update({
        where: { id: post.id },
        data: buildUpdateData(input),
        select: postSelect,
      });
    }),

  closeMine: protectedProcedure
    .input(eventLogisticsPostIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.eventLogisticsPost.findFirst({
        where: {
          id: input.postId,
          hiddenAt: null,
        },
        select: {
          id: true,
          authorId: true,
        },
      });

      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Запись не найдена." });
      }

      if (post.authorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Можно закрыть только свою запись.",
        });
      }

      return ctx.db.eventLogisticsPost.update({
        where: { id: post.id },
        data: {
          status: EventLogisticsStatus.CLOSED,
          closedAt: new Date(),
        },
        select: postSelect,
      });
    }),

  reopenMine: protectedProcedure
    .input(eventLogisticsPostIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.eventLogisticsPost.findFirst({
        where: {
          id: input.postId,
          hiddenAt: null,
        },
        select: {
          id: true,
          authorId: true,
          eventId: true,
        },
      });

      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Запись не найдена." });
      }

      if (post.authorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Можно открыть снова только свою запись.",
        });
      }

      if (await getEventReadOnly(ctx.db, post.eventId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: reopenReadOnlyMessage,
        });
      }

      return ctx.db.eventLogisticsPost.update({
        where: { id: post.id },
        data: {
          status: EventLogisticsStatus.ACTIVE,
          closedAt: null,
        },
        select: postSelect,
      });
    }),

  hidePost: protectedProcedure
    .input(eventLogisticsPostIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.eventLogisticsPost.findFirst({
        where: {
          id: input.postId,
          hiddenAt: null,
        },
        select: {
          id: true,
          event: {
            select: {
              createdById: true,
              team: {
                select: {
                  members: {
                    where: {
                      userId: ctx.session.user.id,
                      role: {
                        in: managerRoles,
                      },
                    },
                    select: { id: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });

      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Запись не найдена." });
      }

      const canHide =
        isModeratorUser(ctx.session.user) ||
        post.event.createdById === ctx.session.user.id ||
        post.event.team.members.length > 0;

      if (!canHide) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "У вас нет прав скрыть эту запись.",
        });
      }

      await ctx.db.eventLogisticsPost.update({
        where: { id: post.id },
        data: { hiddenAt: new Date() },
      });

      return { success: true };
    }),

  join: protectedProcedure
    .input(eventLogisticsJoinInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      for (let attempt = 0; attempt < maxJoinRetries; attempt += 1) {
        try {
          return await ctx.db.$transaction(
            async (tx) => {
              const post = await tx.eventLogisticsPost.findFirst({
                where: {
                  id: input.postId,
                  hiddenAt: null,
                },
                select: {
                  id: true,
                  eventId: true,
                  authorId: true,
                  type: true,
                  status: true,
                  seatsAvailable: true,
                },
              });

              if (!post) {
                throw new TRPCError({
                  code: "NOT_FOUND",
                  message: "Запись не найдена.",
                });
              }

              await assertCanAccessLogistics(tx, post.eventId, userId);

              if (await getEventReadOnly(tx, post.eventId)) {
                throw new TRPCError({
                  code: "FORBIDDEN",
                  message: readOnlyMessage,
                });
              }

              if (post.authorId === userId) {
                throw new TRPCError({
                  code: "FORBIDDEN",
                  message: "Нельзя присоединиться к своей поездке.",
                });
              }

              if (post.type !== EventLogisticsType.OFFER_SEAT) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: "Присоединиться можно только к поездке с местами.",
                });
              }

              if (post.status !== EventLogisticsStatus.ACTIVE) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: "Эта запись уже закрыта.",
                });
              }

              if (!post.seatsAvailable || post.seatsAvailable <= 0) {
                throw new TRPCError({
                  code: "CONFLICT",
                  message: noSeatsMessage,
                });
              }

              const existingJoin = await tx.eventLogisticsJoin.findUnique({
                where: {
                  postId_userId: {
                    postId: post.id,
                    userId,
                  },
                },
                select: {
                  id: true,
                  cancelledAt: true,
                },
              });

              if (existingJoin && !existingJoin.cancelledAt) {
                throw new TRPCError({
                  code: "CONFLICT",
                  message: alreadyJoinedMessage,
                });
              }

              const activeJoinsCount = await tx.eventLogisticsJoin.count({
                where: {
                  postId: post.id,
                  cancelledAt: null,
                },
              });

              if (activeJoinsCount >= post.seatsAvailable) {
                throw new TRPCError({
                  code: "CONFLICT",
                  message: noSeatsMessage,
                });
              }

              if (existingJoin) {
                return tx.eventLogisticsJoin.update({
                  where: { id: existingJoin.id },
                  data: { cancelledAt: null },
                  select: {
                    id: true,
                    postId: true,
                    userId: true,
                    createdAt: true,
                    cancelledAt: true,
                  },
                });
              }

              return tx.eventLogisticsJoin.create({
                data: {
                  postId: post.id,
                  userId,
                },
                select: {
                  id: true,
                  postId: true,
                  userId: true,
                  createdAt: true,
                  cancelledAt: true,
                },
              });
            },
            {
              isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            },
          );
        } catch (error) {
          if (isSerializationConflict(error) && attempt < maxJoinRetries - 1) {
            continue;
          }

          throw error;
        }
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Не удалось присоединиться к поездке.",
      });
    }),

  leave: protectedProcedure
    .input(eventLogisticsJoinInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const join = await ctx.db.eventLogisticsJoin.findUnique({
        where: {
          postId_userId: {
            postId: input.postId,
            userId,
          },
        },
        select: {
          id: true,
          cancelledAt: true,
          post: {
            select: {
              eventId: true,
            },
          },
        },
      });

      if (!join || join.cancelledAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Вы не присоединены к этой поездке.",
        });
      }

      await assertCanAccessLogistics(ctx.db, join.post.eventId, userId);

      await ctx.db.eventLogisticsJoin.update({
        where: { id: join.id },
        data: {
          cancelledAt: new Date(),
        },
      });

      return { success: true };
    }),
});
