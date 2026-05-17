import { beforeAll, describe, expect, it, vi } from "vitest";

import type { teamChatRouter as TeamChatRouter } from "@/server/api/routers/team-chat";
import type { createCallerFactory as CreateCallerFactory } from "@/server/api/trpc";

process.env.DATABASE_URL ??= "postgresql://user:password@localhost:5432/test";
process.env.MODERATOR_EMAILS = "moderator@example.com";

vi.mock("@/server/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  db: {},
}));

vi.mock("server-only", () => ({}));

const teamId = "clx0a1b2c0000abcd1234efgh";
const messageId = "clx0a1b2c0001abcd1234efgh";
const userId = "clx0a1b2c0002abcd1234efgh";
const otherUserId = "clx0a1b2c0003abcd1234efgh";
const replyToMessageId = "clx0a1b2c0004abcd1234efgh";
const body = "Нужно подготовить список задач.";
const oldReadAt = new Date("2026-05-17T10:00:00.000Z");

const createAccessTeam = (allowed = true) => ({
  members: allowed ? [{ id: "member-1" }] : [],
});

const createChatMessage = (authorId = userId) => ({
  id: messageId,
  body,
  createdAt: new Date("2026-05-17T12:00:00.000Z"),
  editedAt: null,
  authorId,
  teamId,
  parentMessage: null,
  author: {
    profile: {
      username: "user",
      displayName: "Участник",
      avatarUrl: null,
      avatarMedia: null,
    },
  },
});

const createInboxTeam = ({
  chatMessages = [
    {
      id: messageId,
      body: "Проверим список снаряжения.",
      createdAt: new Date("2026-05-17T13:00:00.000Z"),
      author: {
        name: null,
        profile: {
          username: "team-user",
          displayName: "Участник команды",
        },
      },
    },
  ],
  chatReadStates = [],
}: {
  chatMessages?: {
    id: string;
    body: string;
    createdAt: Date;
    author: {
      name: string | null;
      profile: {
        username: string | null;
        displayName: string | null;
      } | null;
    };
  }[];
  chatReadStates?: { lastReadAt: Date }[];
} = {}) => ({
  id: teamId,
  name: "Команда тест",
  slug: "test-team",
  status: "REGULAR",
  createdAt: new Date("2026-05-16T12:00:00.000Z"),
  updatedAt: new Date("2026-05-16T13:00:00.000Z"),
  chatReadStates,
  chatMessages,
});

const createDb = ({
  accessTeam = createAccessTeam(),
  inboxTeams = [createInboxTeam()],
  message = createChatMessage(),
  readState = null,
  replyParent = { id: replyToMessageId },
  unreadCount = 0,
}: {
  accessTeam?: ReturnType<typeof createAccessTeam> | null;
  inboxTeams?: ReturnType<typeof createInboxTeam>[];
  message?: ReturnType<typeof createChatMessage> | null;
  readState?: { lastReadAt: Date } | null;
  replyParent?: { id: string } | null;
  unreadCount?: number;
} = {}) => {
  const storedReadState = { current: readState };

  return {
    team: {
      findUnique: vi.fn().mockResolvedValue(accessTeam),
      findMany: vi.fn().mockResolvedValue(inboxTeams),
    },
    teamChatReadState: {
      findUnique: vi.fn().mockImplementation(() =>
        Promise.resolve(storedReadState.current),
      ),
      upsert: vi.fn().mockImplementation(
        (input: {
          create: { lastReadAt: Date };
          update: { lastReadAt: Date };
        }) => {
          storedReadState.current = {
            lastReadAt: input.update.lastReadAt,
          };

          return Promise.resolve({
            id: "read-state-id",
            teamId,
            userId,
            lastReadAt: input.update.lastReadAt,
          });
        },
      ),
    },
    teamChatMessage: {
      count: vi.fn().mockImplementation(
        (input: { where?: { createdAt?: { gt?: Date; gte?: Date } } } = {}) =>
          Promise.resolve(
            input.where?.createdAt?.gt
              ? storedReadState.current
                ? 0
                : unreadCount
              : 0,
          ),
      ),
      findMany: vi.fn().mockResolvedValue([
        {
          ...createChatMessage(),
          parentMessage: {
            id: replyToMessageId,
            body: "Кто заберёт оборудование?",
            deletedAt: null,
            hiddenAt: null,
            author: {
              profile: {
                username: "parent-user",
                displayName: "Автор вопроса",
              },
            },
          },
        },
      ]),
      findFirst: vi.fn().mockImplementation(
        (input: { where?: { id?: string } } = {}) => {
          if (input.where?.id === replyToMessageId) {
            return Promise.resolve(replyParent);
          }

          return Promise.resolve(message);
        },
      ),
      create: vi.fn().mockResolvedValue(createChatMessage()),
      update: vi.fn().mockResolvedValue(createChatMessage()),
    },
  };
};

const createContext = (
  db: ReturnType<typeof createDb>,
  sessionUser: { id: string; email?: string | null } | null = {
    id: userId,
    email: "user@example.com",
  },
) =>
  ({
    db,
    session: sessionUser ? { user: sessionUser } : null,
    headers: new Headers(),
  }) as never;

describe("teamChatRouter", () => {
  let createCaller: typeof CreateCallerFactory;
  let teamChatRouter: typeof TeamChatRouter;

  beforeAll(async () => {
    ({ createCallerFactory: createCaller } = await import("@/server/api/trpc"));
    ({ teamChatRouter } = await import("@/server/api/routers/team-chat"));
  });

  it("denies guests through protected procedures", async () => {
    const db = createDb();
    const caller = createCaller(teamChatRouter)(createContext(db, null));

    await expect(caller.list({ teamId })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("returns team chats for team members", async () => {
    const db = createDb({ unreadCount: 1 });
    const caller = createCaller(teamChatRouter)(createContext(db));

    const result = await caller.getMyChats();

    expect(result).toEqual([
      {
        teamId,
        teamName: "Команда тест",
        teamSlug: "test-team",
        teamStatus: "REGULAR",
        lastMessage: {
          id: messageId,
          body: "Проверим список снаряжения.",
          createdAt: new Date("2026-05-17T13:00:00.000Z"),
          authorName: "Участник команды",
        },
        unreadCount: 1,
      },
    ]);
    expect(db.team.findMany).toHaveBeenCalledWith({
      where: {
        members: {
          some: {
            userId,
            role: {
              in: ["OWNER", "ADMIN", "ORGANIZER", "MEMBER"],
            },
          },
        },
      },
      select: expect.any(Object) as object,
    });
  });

  it("does not return team chats for random users", async () => {
    const db = createDb({ inboxTeams: [] });
    const caller = createCaller(teamChatRouter)(createContext(db));

    await expect(caller.getMyChats()).resolves.toEqual([]);
  });

  it("excludes own messages from team chat inbox unread count", async () => {
    const db = createDb({ unreadCount: 1 });
    const caller = createCaller(teamChatRouter)(createContext(db));

    await caller.getMyChats();

    expect(db.teamChatMessage.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        authorId: {
          not: userId,
        },
      }) as object,
    });
  });

  it("excludes deleted and hidden messages from team chat inbox unread count", async () => {
    const db = createDb({ unreadCount: 1 });
    const caller = createCaller(teamChatRouter)(createContext(db));

    await caller.getMyChats();

    expect(db.teamChatMessage.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        deletedAt: null,
        hiddenAt: null,
      }) as object,
    });
  });

  it("ignores deleted and hidden messages for team chat inbox last message", async () => {
    const db = createDb();
    const caller = createCaller(teamChatRouter)(createContext(db));

    await caller.getMyChats();

    expect(db.team.findMany).toHaveBeenCalledWith({
      where: expect.any(Object) as object,
      select: expect.objectContaining({
        chatMessages: expect.objectContaining({
          where: {
            deletedAt: null,
            hiddenAt: null,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        }) as object,
      }) as object,
    });
  });

  it("allows members to list visible messages", async () => {
    const db = createDb();
    const caller = createCaller(teamChatRouter)(createContext(db));

    await caller.list({ teamId });

    expect(db.teamChatMessage.findMany).toHaveBeenCalledWith({
      where: {
        teamId,
        deletedAt: null,
        hiddenAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 31,
      select: expect.objectContaining({
        author: {
          select: {
            profile: expect.any(Object) as object,
          },
        },
        parentMessage: expect.any(Object) as object,
      }) as object,
    });
  });

  it("denies random users listing messages", async () => {
    const db = createDb({ accessTeam: createAccessTeam(false) });
    const caller = createCaller(teamChatRouter)(createContext(db));

    await expect(caller.list({ teamId })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "У вас нет доступа к чату этой команды.",
    });
    expect(db.teamChatMessage.findMany).not.toHaveBeenCalled();
    expect(db.teamChatMessage.count).not.toHaveBeenCalled();
  });

  it("returns unread count in list results", async () => {
    const db = createDb({ unreadCount: 2 });
    const caller = createCaller(teamChatRouter)(createContext(db));

    const result = await caller.list({ teamId });

    expect(result.unreadCount).toBe(2);
    expect(db.teamChatReadState.findUnique).toHaveBeenCalledWith({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
      select: {
        lastReadAt: true,
      },
    });
  });

  it("excludes own messages from unread count", async () => {
    const db = createDb({ unreadCount: 1 });
    const caller = createCaller(teamChatRouter)(createContext(db));

    await caller.list({ teamId });

    expect(db.teamChatMessage.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        authorId: {
          not: userId,
        },
      }) as object,
    });
  });

  it("excludes hidden and deleted messages from unread count", async () => {
    const db = createDb({ unreadCount: 1 });
    const caller = createCaller(teamChatRouter)(createContext(db));

    await caller.list({ teamId });

    expect(db.teamChatMessage.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        deletedAt: null,
        hiddenAt: null,
      }) as object,
    });
  });

  it("marks team chat as read by creating read state", async () => {
    const db = createDb();
    const caller = createCaller(teamChatRouter)(createContext(db));

    await expect(caller.markRead({ teamId })).resolves.toEqual({
      success: true,
    });
    expect(db.teamChatReadState.upsert).toHaveBeenCalledWith({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
      create: {
        teamId,
        userId,
        lastReadAt: expect.any(Date) as Date,
      },
      update: {
        lastReadAt: expect.any(Date) as Date,
      },
    });
  });

  it("marks team chat as read by updating existing read state", async () => {
    const db = createDb({ readState: { lastReadAt: oldReadAt } });
    const caller = createCaller(teamChatRouter)(createContext(db));

    await expect(caller.markRead({ teamId })).resolves.toEqual({
      success: true,
    });
    expect(db.teamChatReadState.upsert).toHaveBeenCalledWith({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
      create: {
        teamId,
        userId,
        lastReadAt: expect.any(Date) as Date,
      },
      update: {
        lastReadAt: expect.any(Date) as Date,
      },
    });
  });

  it("returns zero unread count after markRead", async () => {
    const db = createDb({ unreadCount: 1 });
    const caller = createCaller(teamChatRouter)(createContext(db));

    await expect(caller.list({ teamId })).resolves.toMatchObject({
      unreadCount: 1,
    });
    await caller.markRead({ teamId });
    await expect(caller.list({ teamId })).resolves.toMatchObject({
      unreadCount: 0,
    });
  });

  it("allows members to send messages", async () => {
    const db = createDb();
    const caller = createCaller(teamChatRouter)(createContext(db));

    await caller.send({ teamId, body });

    expect(db.teamChatMessage.create).toHaveBeenCalledWith({
      data: {
        teamId,
        authorId: userId,
        parentMessageId: null,
        body,
      },
      select: expect.any(Object) as object,
    });
  });

  it("denies random users sending messages", async () => {
    const db = createDb({ accessTeam: createAccessTeam(false) });
    const caller = createCaller(teamChatRouter)(createContext(db));

    await expect(caller.send({ teamId, body })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(db.teamChatMessage.create).not.toHaveBeenCalled();
  });

  it("allows users to edit own messages", async () => {
    const db = createDb();
    const caller = createCaller(teamChatRouter)(createContext(db));

    await caller.updateMine({ messageId, body: "Обновил задачи." });

    expect(db.teamChatMessage.update).toHaveBeenCalledWith({
      where: {
        id: messageId,
      },
      data: {
        body: "Обновил задачи.",
        editedAt: expect.any(Date) as Date,
      },
      select: expect.any(Object) as object,
    });
  });

  it("denies editing another user's message", async () => {
    const db = createDb({ message: createChatMessage(otherUserId) });
    const caller = createCaller(teamChatRouter)(createContext(db));

    await expect(
      caller.updateMine({ messageId, body: "Обновление." }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Можно редактировать только своё сообщение.",
    });
  });

  it("allows users to soft-delete own messages", async () => {
    const db = createDb();
    const caller = createCaller(teamChatRouter)(createContext(db));

    await caller.deleteMine({ messageId });

    expect(db.teamChatMessage.update).toHaveBeenCalledWith({
      where: {
        id: messageId,
      },
      data: {
        deletedAt: expect.any(Date) as Date,
      },
    });
  });

  it("denies deleting another user's message", async () => {
    const db = createDb({ message: createChatMessage(otherUserId) });
    const caller = createCaller(teamChatRouter)(createContext(db));

    await expect(caller.deleteMine({ messageId })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Можно удалить только своё сообщение.",
    });
  });

  it("allows team managers to hide messages", async () => {
    const db = createDb({ message: createChatMessage(otherUserId) });
    const caller = createCaller(teamChatRouter)(createContext(db));

    await expect(caller.hideMessage({ messageId })).resolves.toEqual({
      success: true,
    });
    expect(db.teamChatMessage.update).toHaveBeenCalledWith({
      where: {
        id: messageId,
      },
      data: {
        hiddenAt: expect.any(Date) as Date,
      },
    });
  });

  it("denies MEMBER hiding messages", async () => {
    const db = createDb({
      accessTeam: createAccessTeam(false),
      message: createChatMessage(otherUserId),
    });
    const caller = createCaller(teamChatRouter)(createContext(db));

    await expect(caller.hideMessage({ messageId })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "У вас нет прав модерировать чат этой команды.",
    });
  });

  it("allows replies to visible messages in the same team", async () => {
    const db = createDb();
    const caller = createCaller(teamChatRouter)(createContext(db));

    await caller.send({
      teamId,
      body: "Я заберу.",
      replyToMessageId,
    });

    expect(db.teamChatMessage.findFirst).toHaveBeenCalledWith({
      where: {
        id: replyToMessageId,
        teamId,
        deletedAt: null,
        hiddenAt: null,
      },
      select: {
        id: true,
      },
    });
    expect(db.teamChatMessage.create).toHaveBeenCalledWith({
      data: {
        teamId,
        authorId: userId,
        parentMessageId: replyToMessageId,
        body: "Я заберу.",
      },
      select: expect.any(Object) as object,
    });
  });

  it("rejects replies to messages from another team", async () => {
    const db = createDb({ replyParent: null });
    const caller = createCaller(teamChatRouter)(createContext(db));

    await expect(
      caller.send({
        teamId,
        body: "Ответ.",
        replyToMessageId,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Сообщение для ответа не найдено.",
    });
    expect(db.teamChatMessage.create).not.toHaveBeenCalled();
  });

  it("rejects replies to deleted messages", async () => {
    const db = createDb({ replyParent: null });
    const caller = createCaller(teamChatRouter)(createContext(db));

    await expect(
      caller.send({
        teamId,
        body: "Ответ.",
        replyToMessageId,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Сообщение для ответа не найдено.",
    });
  });

  it("rejects replies to hidden messages", async () => {
    const db = createDb({ replyParent: null });
    const caller = createCaller(teamChatRouter)(createContext(db));

    await expect(
      caller.send({
        teamId,
        body: "Ответ.",
        replyToMessageId,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Сообщение для ответа не найдено.",
    });
  });
});
