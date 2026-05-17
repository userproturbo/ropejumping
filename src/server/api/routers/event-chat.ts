import { TRPCError } from "@trpc/server";

import { ApplicationStatus, TeamRole } from "@/generated/prisma/enums";
import {
  eventChatDeleteInputSchema,
  eventChatListInputSchema,
  eventChatMarkReadInputSchema,
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
const chatApplicationStatuses = [
  ApplicationStatus.ACCEPTED,
  ApplicationStatus.CONFIRMED_PARTICIPATION,
];

const getPreviewAuthorName = (message: {
  author: {
    name: string | null;
    profile: {
      username: string | null;
      displayName: string | null;
    } | null;
  };
}) =>
  message.author.profile?.displayName ??
  message.author.profile?.username ??
  message.author.name ??
  "Участник";

export const eventChatRouter = createTRPCRouter({
  getMyChats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const events = await ctx.db.event.findMany({
      where: {
        OR: [
          {
            createdById: userId,
          },
          {
            team: {
              members: {
                some: {
                  userId,
                  role: {
                    in: managerRoles,
                  },
                },
              },
            },
          },
          {
            applications: {
              some: {
                userId,
                status: {
                  in: chatApplicationStatuses,
                },
              },
            },
          },
          {
            participations: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        chatReadStates: {
          where: {
            userId,
          },
          select: {
            lastReadAt: true,
          },
          take: 1,
        },
        chatMessages: {
          where: {
            deletedAt: null,
            hiddenAt: null,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            body: true,
            createdAt: true,
            author: {
              select: {
                name: true,
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
      },
    });

    const chats = await Promise.all(
      events.map(async (event) => {
        const lastReadAt =
          event.chatReadStates[0]?.lastReadAt ?? new Date(0);
        const unreadCount = await ctx.db.eventChatMessage.count({
          where: {
            eventId: event.id,
            authorId: {
              not: userId,
            },
            createdAt: {
              gt: lastReadAt,
            },
            deletedAt: null,
            hiddenAt: null,
          },
        });
        const lastMessage = event.chatMessages[0] ?? null;

        return {
          eventId: event.id,
          eventTitle: event.title,
          eventSlug: event.slug,
          eventStatus: event.status,
          sortDate: lastMessage?.createdAt ?? event.updatedAt,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                body: lastMessage.body,
                createdAt: lastMessage.createdAt,
                authorName: getPreviewAuthorName(lastMessage),
              }
            : null,
          unreadCount,
        };
      }),
    );

    return chats
      .sort((left, right) => right.sortDate.getTime() - left.sortDate.getTime())
      .slice(0, 50)
      .map(({ sortDate: _sortDate, ...chat }) => chat);
  }),

  list: protectedProcedure
    .input(eventChatListInputSchema)
    .query(async ({ ctx, input }) => {
      await assertCanAccessEventChat({
        db: ctx.db,
        eventId: input.eventId,
        userId: ctx.session.user.id,
      });

      const limit = input.limit ?? 30;
      const readState = await ctx.db.eventChatReadState.findUnique({
        where: {
          eventId_userId: {
            eventId: input.eventId,
            userId: ctx.session.user.id,
          },
        },
        select: {
          lastReadAt: true,
        },
      });
      const lastReadAt = readState?.lastReadAt ?? new Date(0);
      const [messages, unreadCount] = await Promise.all([
        ctx.db.eventChatMessage.findMany({
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
        }),
        ctx.db.eventChatMessage.count({
          where: {
            eventId: input.eventId,
            authorId: {
              not: ctx.session.user.id,
            },
            createdAt: {
              gt: lastReadAt,
            },
            deletedAt: null,
            hiddenAt: null,
          },
        }),
      ]);
      const nextMessage = messages.length > limit ? messages.pop() : undefined;

      return {
        messages,
        nextCursor: nextMessage?.id ?? null,
        unreadCount,
      };
    }),

  markRead: protectedProcedure
    .input(eventChatMarkReadInputSchema)
    .mutation(async ({ ctx, input }) => {
      await assertCanAccessEventChat({
        db: ctx.db,
        eventId: input.eventId,
        userId: ctx.session.user.id,
      });

      const lastReadAt = new Date();

      await ctx.db.eventChatReadState.upsert({
        where: {
          eventId_userId: {
            eventId: input.eventId,
            userId: ctx.session.user.id,
          },
        },
        create: {
          eventId: input.eventId,
          userId: ctx.session.user.id,
          lastReadAt,
        },
        update: {
          lastReadAt,
        },
      });

      return { success: true };
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
