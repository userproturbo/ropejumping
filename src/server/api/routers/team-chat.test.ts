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

const createDb = ({
  accessTeam = createAccessTeam(),
  message = createChatMessage(),
  replyParent = { id: replyToMessageId },
}: {
  accessTeam?: ReturnType<typeof createAccessTeam> | null;
  message?: ReturnType<typeof createChatMessage> | null;
  replyParent?: { id: string } | null;
} = {}) => ({
  team: {
    findUnique: vi.fn().mockResolvedValue(accessTeam),
  },
  teamChatMessage: {
    count: vi.fn().mockResolvedValue(0),
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
});

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
