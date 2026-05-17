import { TRPCError } from "@trpc/server";
import type { z } from "zod";

import {
  EventLogisticsStatus,
  TeamRole,
} from "@/generated/prisma/enums";
import {
  eventLogisticsCreateInputSchema,
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
});
