import { beforeAll, describe, expect, it, vi } from "vitest";

import type { eventChatRouter as EventChatRouter } from "@/server/api/routers/event-chat";
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

const eventId = "clx0a1b2c0000abcd1234efgh";
const messageId = "clx0a1b2c0001abcd1234efgh";
const userId = "clx0a1b2c0002abcd1234efgh";
const otherUserId = "clx0a1b2c0003abcd1234efgh";
const replyToMessageId = "clx0a1b2c0004abcd1234efgh";
const body = "Буду на месте к началу сбора.";
const oldReadAt = new Date("2026-05-16T10:00:00.000Z");

const createAccessEvent = (allowed = true) => ({
  createdById: allowed ? userId : otherUserId,
  team: {
    members: [],
  },
  applications: [],
  participations: [],
});

const createChatMessage = (authorId = userId) => ({
  id: messageId,
  body,
  createdAt: new Date("2026-05-16T12:00:00.000Z"),
  editedAt: null,
  authorId,
  eventId,
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

const createInboxEvent = ({
  chatMessages = [
    {
      id: messageId,
      body: "Проверим связь перед сбором.",
      createdAt: new Date("2026-05-16T13:00:00.000Z"),
      author: {
        name: null,
        profile: {
          username: "event-user",
          displayName: "Участник события",
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
  id: eventId,
  title: "Открытая тренировка",
  slug: "open-training",
  status: "PUBLISHED",
  createdAt: new Date("2026-05-15T12:00:00.000Z"),
  updatedAt: new Date("2026-05-15T13:00:00.000Z"),
  chatReadStates,
  chatMessages,
});

const createDb = ({
  accessEvent = createAccessEvent(),
  inboxEvents = [createInboxEvent()],
  message = createChatMessage(),
  hideManager = false,
  readState = null,
  replyParent = { id: replyToMessageId },
  unreadCount = 0,
}: {
  accessEvent?: ReturnType<typeof createAccessEvent> | null;
  inboxEvents?: ReturnType<typeof createInboxEvent>[];
  message?: ReturnType<typeof createChatMessage> | null;
  hideManager?: boolean;
  readState?: { lastReadAt: Date } | null;
  replyParent?: { id: string } | null;
  unreadCount?: number;
} = {}) => {
  const storedReadState = { current: readState };

  return {
    event: {
      findUnique: vi.fn().mockResolvedValue(accessEvent),
      findMany: vi.fn().mockResolvedValue(inboxEvents),
    },
    eventChatReadState: {
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
            eventId,
            userId,
            lastReadAt: input.update.lastReadAt,
          });
        },
      ),
    },
    eventChatMessage: {
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
            body: "Во сколько сбор?",
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

          return Promise.resolve(
            message
              ? {
                  ...message,
                  event: {
                    team: {
                      members: hideManager
                        ? [{ id: "manager-member-id" }]
                        : [],
                    },
                  },
                }
              : null,
          );
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

describe("eventChatRouter", () => {
  let createCaller: typeof CreateCallerFactory;
  let eventChatRouter: typeof EventChatRouter;

  beforeAll(async () => {
    ({ createCallerFactory: createCaller } = await import("@/server/api/trpc"));
    ({ eventChatRouter } = await import("@/server/api/routers/event-chat"));
  });

  it("denies guests through protected procedures", async () => {
    const db = createDb();
    const caller = createCaller(eventChatRouter)(createContext(db, null));

    await expect(caller.list({ eventId })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("returns accessible event chats for accepted participants", async () => {
    const db = createDb({ unreadCount: 1 });
    const caller = createCaller(eventChatRouter)(createContext(db));

    const result = await caller.getMyChats();

    expect(result).toEqual([
      {
        eventId,
        eventTitle: "Открытая тренировка",
        eventSlug: "open-training",
        eventStatus: "PUBLISHED",
        lastMessage: {
          id: messageId,
          body: "Проверим связь перед сбором.",
          createdAt: new Date("2026-05-16T13:00:00.000Z"),
          authorName: "Участник события",
        },
        unreadCount: 1,
      },
    ]);
    expect(db.event.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        OR: expect.arrayContaining([
          expect.objectContaining({
            applications: {
              some: {
                userId,
                status: {
                  in: ["ACCEPTED", "CONFIRMED_PARTICIPATION"],
                },
              },
            },
          }) as object,
        ]) as object[],
      }) as object,
      select: expect.any(Object) as object,
    });
  });

  it("does not return event chats for random users", async () => {
    const db = createDb({ inboxEvents: [] });
    const caller = createCaller(eventChatRouter)(createContext(db));

    await expect(caller.getMyChats()).resolves.toEqual([]);
  });

  it("excludes own messages from event chat inbox unread count", async () => {
    const db = createDb({ unreadCount: 1 });
    const caller = createCaller(eventChatRouter)(createContext(db));

    await caller.getMyChats();

    expect(db.eventChatMessage.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        authorId: {
          not: userId,
        },
      }) as object,
    });
  });

  it("excludes deleted and hidden messages from event chat inbox unread count", async () => {
    const db = createDb({ unreadCount: 1 });
    const caller = createCaller(eventChatRouter)(createContext(db));

    await caller.getMyChats();

    expect(db.eventChatMessage.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        deletedAt: null,
        hiddenAt: null,
      }) as object,
    });
  });

  it("ignores deleted and hidden messages for event chat inbox last message", async () => {
    const db = createDb();
    const caller = createCaller(eventChatRouter)(createContext(db));

    await caller.getMyChats();

    expect(db.event.findMany).toHaveBeenCalledWith({
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

  it("denies list without event chat access", async () => {
    const db = createDb({ accessEvent: createAccessEvent(false) });
    const caller = createCaller(eventChatRouter)(createContext(db));

    await expect(caller.list({ eventId })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "У вас нет доступа к чату этого мероприятия.",
    });
    expect(db.eventChatMessage.findMany).not.toHaveBeenCalled();
    expect(db.eventChatMessage.count).not.toHaveBeenCalled();
  });

  it("lists visible messages with access", async () => {
    const db = createDb();
    const caller = createCaller(eventChatRouter)(createContext(db));

    await caller.list({ eventId });

    expect(db.eventChatMessage.findMany).toHaveBeenCalledWith({
      where: {
        eventId,
        deletedAt: null,
        hiddenAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 31,
      select: expect.objectContaining({
        parentMessage: expect.any(Object) as object,
      }) as object,
    });
  });

  it("returns parent message preview in list results", async () => {
    const db = createDb();
    const caller = createCaller(eventChatRouter)(createContext(db));

    const result = await caller.list({ eventId });

    expect(result.messages[0]?.parentMessage).toMatchObject({
      id: replyToMessageId,
      body: "Во сколько сбор?",
      deletedAt: null,
      hiddenAt: null,
      author: {
        profile: {
          username: "parent-user",
          displayName: "Автор вопроса",
        },
      },
    });
  });

  it("returns unread count in list results", async () => {
    const db = createDb({ unreadCount: 2 });
    const caller = createCaller(eventChatRouter)(createContext(db));

    const result = await caller.list({ eventId });

    expect(result.unreadCount).toBe(2);
    expect(db.eventChatReadState.findUnique).toHaveBeenCalledWith({
      where: {
        eventId_userId: {
          eventId,
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
    const caller = createCaller(eventChatRouter)(createContext(db));

    await caller.list({ eventId });

    expect(db.eventChatMessage.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        authorId: {
          not: userId,
        },
      }) as object,
    });
  });

  it("excludes hidden and deleted messages from unread count", async () => {
    const db = createDb({ unreadCount: 1 });
    const caller = createCaller(eventChatRouter)(createContext(db));

    await caller.list({ eventId });

    expect(db.eventChatMessage.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        deletedAt: null,
        hiddenAt: null,
      }) as object,
    });
  });

  it("marks event chat as read by creating read state", async () => {
    const db = createDb();
    const caller = createCaller(eventChatRouter)(createContext(db));

    await expect(caller.markRead({ eventId })).resolves.toEqual({
      success: true,
    });
    expect(db.eventChatReadState.upsert).toHaveBeenCalledWith({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
      create: {
        eventId,
        userId,
        lastReadAt: expect.any(Date) as Date,
      },
      update: {
        lastReadAt: expect.any(Date) as Date,
      },
    });
  });

  it("marks event chat as read by updating existing read state", async () => {
    const db = createDb({ readState: { lastReadAt: oldReadAt } });
    const caller = createCaller(eventChatRouter)(createContext(db));

    await expect(caller.markRead({ eventId })).resolves.toEqual({
      success: true,
    });
    expect(db.eventChatReadState.upsert).toHaveBeenCalledWith({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
      create: {
        eventId,
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
    const caller = createCaller(eventChatRouter)(createContext(db));

    await expect(caller.list({ eventId })).resolves.toMatchObject({
      unreadCount: 1,
    });
    await caller.markRead({ eventId });
    await expect(caller.list({ eventId })).resolves.toMatchObject({
      unreadCount: 0,
    });
  });

  it("sends a message with access", async () => {
    const db = createDb();
    const caller = createCaller(eventChatRouter)(createContext(db));

    await caller.send({ eventId, body });

    expect(db.eventChatMessage.create).toHaveBeenCalledWith({
      data: {
        eventId,
        authorId: userId,
        parentMessageId: null,
        body,
      },
      select: expect.any(Object) as object,
    });
  });

  it("sends a reply to a visible message in the same event", async () => {
    const db = createDb();
    const caller = createCaller(eventChatRouter)(createContext(db));

    await caller.send({
      eventId,
      body: "В 10:00 у парковки.",
      replyToMessageId,
    });

    expect(db.eventChatMessage.findFirst).toHaveBeenCalledWith({
      where: {
        id: replyToMessageId,
        eventId,
        deletedAt: null,
        hiddenAt: null,
      },
      select: {
        id: true,
      },
    });
    expect(db.eventChatMessage.create).toHaveBeenCalledWith({
      data: {
        eventId,
        authorId: userId,
        parentMessageId: replyToMessageId,
        body: "В 10:00 у парковки.",
      },
      select: expect.any(Object) as object,
    });
  });

  it("rejects reply to a message from another event", async () => {
    const db = createDb({ replyParent: null });
    const caller = createCaller(eventChatRouter)(createContext(db));

    await expect(
      caller.send({
        eventId,
        body: "Ответ.",
        replyToMessageId,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Сообщение для ответа не найдено.",
    });
    expect(db.eventChatMessage.create).not.toHaveBeenCalled();
  });

  it("rejects reply to a deleted message", async () => {
    const db = createDb({ replyParent: null });
    const caller = createCaller(eventChatRouter)(createContext(db));

    await expect(
      caller.send({
        eventId,
        body: "Ответ.",
        replyToMessageId,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Сообщение для ответа не найдено.",
    });
    expect(db.eventChatMessage.findFirst).toHaveBeenCalledWith({
      where: {
        id: replyToMessageId,
        eventId,
        deletedAt: null,
        hiddenAt: null,
      },
      select: {
        id: true,
      },
    });
  });

  it("rejects reply to a hidden message", async () => {
    const db = createDb({ replyParent: null });
    const caller = createCaller(eventChatRouter)(createContext(db));

    await expect(
      caller.send({
        eventId,
        body: "Ответ.",
        replyToMessageId,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Сообщение для ответа не найдено.",
    });
    expect(db.eventChatMessage.create).not.toHaveBeenCalled();
  });

  it("denies send without access", async () => {
    const db = createDb({ accessEvent: createAccessEvent(false) });
    const caller = createCaller(eventChatRouter)(createContext(db));

    await expect(caller.send({ eventId, body })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(db.eventChatMessage.create).not.toHaveBeenCalled();
  });

  it("updates only own messages", async () => {
    const db = createDb();
    const caller = createCaller(eventChatRouter)(createContext(db));

    await caller.updateMine({ messageId, body: "Обновление по времени сбора." });

    expect(db.eventChatMessage.update).toHaveBeenCalledWith({
      where: {
        id: messageId,
      },
      data: {
        body: "Обновление по времени сбора.",
        editedAt: expect.any(Date) as Date,
      },
      select: expect.any(Object) as object,
    });
  });

  it("denies editing another user's message", async () => {
    const db = createDb({ message: createChatMessage(otherUserId) });
    const caller = createCaller(eventChatRouter)(createContext(db));

    await expect(
      caller.updateMine({ messageId, body: "Обновление." }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Можно редактировать только своё сообщение.",
    });
  });

  it("soft deletes only own messages", async () => {
    const db = createDb();
    const caller = createCaller(eventChatRouter)(createContext(db));

    await caller.deleteMine({ messageId });

    expect(db.eventChatMessage.update).toHaveBeenCalledWith({
      where: {
        id: messageId,
      },
      data: {
        deletedAt: expect.any(Date) as Date,
      },
    });
  });

  it("does not delete replies when parent message is deleted", async () => {
    const db = createDb();
    const caller = createCaller(eventChatRouter)(createContext(db));

    await caller.deleteMine({ messageId });

    expect(db.eventChatMessage.update).toHaveBeenCalledTimes(1);
    expect(db.eventChatMessage.update).toHaveBeenCalledWith({
      where: {
        id: messageId,
      },
      data: {
        deletedAt: expect.any(Date) as Date,
      },
    });
  });

  it("allows event managers to hide messages", async () => {
    const db = createDb({
      message: createChatMessage(otherUserId),
      hideManager: true,
    });
    const caller = createCaller(eventChatRouter)(createContext(db));

    await expect(caller.hideMessage({ messageId })).resolves.toEqual({
      success: true,
    });
    expect(db.eventChatMessage.update).toHaveBeenCalledWith({
      where: {
        id: messageId,
      },
      data: {
        hiddenAt: expect.any(Date) as Date,
      },
    });
  });

  it("denies random users hiding messages", async () => {
    const db = createDb({ message: createChatMessage(otherUserId) });
    const caller = createCaller(eventChatRouter)(createContext(db));

    await expect(caller.hideMessage({ messageId })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "У вас нет прав скрыть это сообщение.",
    });
  });
});
