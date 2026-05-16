import { TRPCError } from "@trpc/server";

import { TeamRole } from "@/generated/prisma/enums";
import {
  eventChatDeleteInputSchema,
  eventChatListInputSchema,
  eventChatSendInputSchema,
  eventChatUpdateInputSchema,
} from "@/lib/validation/event-chat";
import { assertEventChatMessageCreateLimit } from "@/server/anti-spam/rate-limit";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  assertCanAccessEventChat,
  canAccessEventChat,
} from "@/server/events/chat-permissions";
import { isModeratorUser } from "@/server/moderation/permissions";

const messageSelect = {
  id: true,
  body: true,
  createdAt: true,
  editedAt: true,
  authorId: true,
  parentMessage: {
    select: {
      id: true,
      body: true,
      deletedAt: true,
      hiddenAt: true,
      author: {
        select: {
          profile: {
            select: {
              username: true,
              displayName: true,
            },
          },
        },
      },
    },
  },
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

const managerRoles = [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.ORGANIZER];

export const eventChatRouter = createTRPCRouter({
  list: protectedProcedure
    .input(eventChatListInputSchema)
    .query(async ({ ctx, input }) => {
      await assertCanAccessEventChat({
        db: ctx.db,
        eventId: input.eventId,
        userId: ctx.session.user.id,
      });

      const limit = input.limit ?? 30;
      const messages = await ctx.db.eventChatMessage.findMany({
        where: {
          eventId: input.eventId,
          deletedAt: null,
          hiddenAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit + 1,
        ...(input.cursor
          ? {
              cursor: {
                id: input.cursor,
              },
              skip: 1,
            }
          : {}),
        select: messageSelect,
      });
      const nextMessage = messages.length > limit ? messages.pop() : undefined;

      return {
        messages,
        nextCursor: nextMessage?.id ?? null,
      };
    }),

  send: protectedProcedure
    .input(eventChatSendInputSchema)
    .mutation(async ({ ctx, input }) => {
      await assertCanAccessEventChat({
        db: ctx.db,
        eventId: input.eventId,
        userId: ctx.session.user.id,
      });
      await assertEventChatMessageCreateLimit(ctx.db, ctx.session.user.id);

      if (input.replyToMessageId) {
        const parentMessage = await ctx.db.eventChatMessage.findFirst({
          where: {
            id: input.replyToMessageId,
            eventId: input.eventId,
            deletedAt: null,
            hiddenAt: null,
          },
          select: {
            id: true,
          },
        });

        if (!parentMessage) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Сообщение для ответа не найдено.",
          });
        }
      }

      return ctx.db.eventChatMessage.create({
        data: {
          eventId: input.eventId,
          authorId: ctx.session.user.id,
          parentMessageId: input.replyToMessageId ?? null,
          body: input.body,
        },
        select: messageSelect,
      });
    }),

  updateMine: protectedProcedure
    .input(eventChatUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.db.eventChatMessage.findFirst({
        where: {
          id: input.messageId,
          deletedAt: null,
          hiddenAt: null,
        },
        select: {
          id: true,
          authorId: true,
          eventId: true,
        },
      });

      if (!message) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Сообщение не найдено.",
        });
      }

      if (message.authorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Можно редактировать только своё сообщение.",
        });
      }

      await assertCanAccessEventChat({
        db: ctx.db,
        eventId: message.eventId,
        userId: ctx.session.user.id,
      });

      return ctx.db.eventChatMessage.update({
        where: {
          id: message.id,
        },
        data: {
          body: input.body,
          editedAt: new Date(),
        },
        select: messageSelect,
      });
    }),

  deleteMine: protectedProcedure
    .input(eventChatDeleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.db.eventChatMessage.findFirst({
        where: {
          id: input.messageId,
          deletedAt: null,
          hiddenAt: null,
        },
        select: {
          id: true,
          authorId: true,
          eventId: true,
        },
      });

      if (!message) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Сообщение не найдено.",
        });
      }

      if (message.authorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Можно удалить только своё сообщение.",
        });
      }

      await assertCanAccessEventChat({
        db: ctx.db,
        eventId: message.eventId,
        userId: ctx.session.user.id,
      });

      await ctx.db.eventChatMessage.update({
        where: {
          id: message.id,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      return { success: true };
    }),

  hideMessage: protectedProcedure
    .input(eventChatDeleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.db.eventChatMessage.findFirst({
        where: {
          id: input.messageId,
          deletedAt: null,
          hiddenAt: null,
        },
        select: {
          id: true,
          event: {
            select: {
              team: {
                select: {
                  members: {
                    where: {
                      userId: ctx.session.user.id,
                      role: {
                        in: managerRoles,
                      },
                    },
                    select: {
                      id: true,
                    },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });

      if (!message) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Сообщение не найдено.",
        });
      }

      const canHide =
        isModeratorUser(ctx.session.user) ||
        message.event.team.members.length > 0;

      if (!canHide) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "У вас нет прав скрыть это сообщение.",
        });
      }

      await ctx.db.eventChatMessage.update({
        where: {
          id: message.id,
        },
        data: {
          hiddenAt: new Date(),
        },
      });

      return { success: true };
    }),

  canAccess: protectedProcedure
    .input(eventChatListInputSchema.pick({ eventId: true }))
    .query(async ({ ctx, input }) => {
      const access = await canAccessEventChat({
        db: ctx.db,
        eventId: input.eventId,
        userId: ctx.session.user.id,
      });

      return { allowed: access.allowed };
    }),
});
