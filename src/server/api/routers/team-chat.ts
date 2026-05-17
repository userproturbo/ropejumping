import { TRPCError } from "@trpc/server";

import { TeamRole } from "@/generated/prisma/enums";
import {
  teamChatDeleteInputSchema,
  teamChatListInputSchema,
  teamChatMarkReadInputSchema,
  teamChatSendInputSchema,
  teamChatUpdateInputSchema,
} from "@/lib/validation/team-chat";
import { assertTeamChatMessageCreateLimit } from "@/server/anti-spam/rate-limit";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  assertCanAccessTeamChat,
  assertCanModerateTeamChat,
} from "@/server/teams/chat-permissions";

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

const chatMemberRoles = [
  TeamRole.OWNER,
  TeamRole.ADMIN,
  TeamRole.ORGANIZER,
  TeamRole.MEMBER,
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

export const teamChatRouter = createTRPCRouter({
  getMyChats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const teams = await ctx.db.team.findMany({
      where: {
        members: {
          some: {
            userId,
            role: {
              in: chatMemberRoles,
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
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
      teams.map(async (team) => {
        const lastReadAt = team.chatReadStates[0]?.lastReadAt ?? new Date(0);
        const unreadCount = await ctx.db.teamChatMessage.count({
          where: {
            teamId: team.id,
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
        const lastMessage = team.chatMessages[0] ?? null;

        return {
          teamId: team.id,
          teamName: team.name,
          teamSlug: team.slug,
          teamStatus: team.status,
          sortDate: lastMessage?.createdAt ?? team.updatedAt,
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
    .input(teamChatListInputSchema)
    .query(async ({ ctx, input }) => {
      await assertCanAccessTeamChat({
        db: ctx.db,
        teamId: input.teamId,
        userId: ctx.session.user.id,
      });

      const limit = input.limit ?? 30;
      const readState = await ctx.db.teamChatReadState.findUnique({
        where: {
          teamId_userId: {
            teamId: input.teamId,
            userId: ctx.session.user.id,
          },
        },
        select: {
          lastReadAt: true,
        },
      });
      const lastReadAt = readState?.lastReadAt ?? new Date(0);
      const [messages, unreadCount] = await Promise.all([
        ctx.db.teamChatMessage.findMany({
          where: {
            teamId: input.teamId,
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
        ctx.db.teamChatMessage.count({
          where: {
            teamId: input.teamId,
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
    .input(teamChatMarkReadInputSchema)
    .mutation(async ({ ctx, input }) => {
      await assertCanAccessTeamChat({
        db: ctx.db,
        teamId: input.teamId,
        userId: ctx.session.user.id,
      });

      const lastReadAt = new Date();

      await ctx.db.teamChatReadState.upsert({
        where: {
          teamId_userId: {
            teamId: input.teamId,
            userId: ctx.session.user.id,
          },
        },
        create: {
          teamId: input.teamId,
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
    .input(teamChatSendInputSchema)
    .mutation(async ({ ctx, input }) => {
      await assertCanAccessTeamChat({
        db: ctx.db,
        teamId: input.teamId,
        userId: ctx.session.user.id,
      });
      await assertTeamChatMessageCreateLimit(ctx.db, ctx.session.user.id);

      if (input.replyToMessageId) {
        const parentMessage = await ctx.db.teamChatMessage.findFirst({
          where: {
            id: input.replyToMessageId,
            teamId: input.teamId,
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

      return ctx.db.teamChatMessage.create({
        data: {
          teamId: input.teamId,
          authorId: ctx.session.user.id,
          parentMessageId: input.replyToMessageId ?? null,
          body: input.body,
        },
        select: messageSelect,
      });
    }),

  updateMine: protectedProcedure
    .input(teamChatUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.db.teamChatMessage.findFirst({
        where: {
          id: input.messageId,
          deletedAt: null,
          hiddenAt: null,
        },
        select: {
          id: true,
          authorId: true,
          teamId: true,
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

      await assertCanAccessTeamChat({
        db: ctx.db,
        teamId: message.teamId,
        userId: ctx.session.user.id,
      });

      return ctx.db.teamChatMessage.update({
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
    .input(teamChatDeleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.db.teamChatMessage.findFirst({
        where: {
          id: input.messageId,
          deletedAt: null,
          hiddenAt: null,
        },
        select: {
          id: true,
          authorId: true,
          teamId: true,
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

      await assertCanAccessTeamChat({
        db: ctx.db,
        teamId: message.teamId,
        userId: ctx.session.user.id,
      });

      await ctx.db.teamChatMessage.update({
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
    .input(teamChatDeleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.db.teamChatMessage.findFirst({
        where: {
          id: input.messageId,
          deletedAt: null,
          hiddenAt: null,
        },
        select: {
          id: true,
          teamId: true,
        },
      });

      if (!message) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Сообщение не найдено.",
        });
      }

      await assertCanModerateTeamChat({
        db: ctx.db,
        teamId: message.teamId,
        userId: ctx.session.user.id,
        user: ctx.session.user,
      });

      await ctx.db.teamChatMessage.update({
        where: {
          id: message.id,
        },
        data: {
          hiddenAt: new Date(),
        },
      });

      return { success: true };
    }),
});
