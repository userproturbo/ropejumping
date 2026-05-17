import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  EventLogisticsStatus,
  EventLogisticsType,
  EventStatus,
} from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import type { eventLogisticsRouter as EventLogisticsRouter } from "@/server/api/routers/event-logistics";
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
const postId = "clx0a1b2c0001abcd1234efgh";
const userId = "clx0a1b2c0002abcd1234efgh";
const otherUserId = "clx0a1b2c0003abcd1234efgh";
const joinId = "clx0a1b2c0004abcd1234efgh";

const createAccessEvent = ({
  allowed = true,
  manager = false,
  status = EventStatus.APPLICATIONS_OPEN,
}: {
  allowed?: boolean;
  manager?: boolean;
  status?: EventStatus;
} = {}) => ({
  status,
  createdById: allowed ? userId : otherUserId,
  team: {
    members: manager ? [{ id: "manager-member-id" }] : [],
  },
  applications: [],
  participations: [],
});

const createJoin = ({
  cancelled = false,
  userId: joinUserId = userId,
}: {
  cancelled?: boolean;
  userId?: string;
} = {}) => ({
  id: joinId,
  postId,
  userId: joinUserId,
  createdAt: new Date("2026-05-17T10:30:00.000Z"),
  cancelledAt: cancelled ? new Date("2026-05-17T11:00:00.000Z") : null,
  user: {
    profile: {
      username: "joined-user",
      displayName: "Попутчик",
      avatarUrl: null,
      avatarMedia: null,
    },
  },
});

const createPost = ({
  authorId = userId,
  hidden = false,
  joins = [],
  seatsAvailable = null,
  status = EventLogisticsStatus.ACTIVE,
  type = EventLogisticsType.NEED_SEAT,
}: {
  authorId?: string;
  hidden?: boolean;
  joins?: ReturnType<typeof createJoin>[];
  seatsAvailable?: number | null;
  status?: EventLogisticsStatus;
  type?: EventLogisticsType;
} = {}) => ({
  id: postId,
  eventId,
  authorId,
  type,
  status,
  fromLocation: "Москва",
  departureTimeText: "суббота утром",
  seatsAvailable,
  baggageNote: null,
  body: "Ищу место до общего района сбора.",
  createdAt: new Date("2026-05-17T10:00:00.000Z"),
  updatedAt: new Date("2026-05-17T10:00:00.000Z"),
  closedAt: null,
  hiddenAt: hidden ? new Date("2026-05-17T11:00:00.000Z") : null,
  author: {
    profile: {
      username: "user",
      displayName: "Участник",
      avatarUrl: null,
      avatarMedia: null,
    },
  },
  joins,
});

const createDb = ({
  accessEvent = createAccessEvent(),
  post = createPost(),
  createCount = 0,
  existingJoin = null,
  activeJoinsCount = 0,
}: {
  accessEvent?: ReturnType<typeof createAccessEvent> | null;
  post?: ReturnType<typeof createPost> | null;
  createCount?: number;
  existingJoin?: ReturnType<typeof createJoin> | null;
  activeJoinsCount?: number;
} = {}) => {
  const db = {
    $transaction: vi.fn(
      async (
        callback: (tx: typeof db) => unknown,
        _options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
      ) => callback(db),
    ),
    event: {
      findUnique: vi.fn().mockResolvedValue(accessEvent),
    },
    eventLogisticsPost: {
      count: vi.fn().mockResolvedValue(createCount),
      findMany: vi.fn().mockResolvedValue(
        post
          ? [
              {
                ...post,
                joins: post.joins.filter((join) => !join.cancelledAt),
              },
            ]
          : [],
      ),
      findFirst: vi.fn().mockImplementation(() =>
        Promise.resolve(
          post && !post.hiddenAt
            ? {
                ...post,
                event: {
                  createdById: accessEvent?.createdById ?? otherUserId,
                  team: {
                    members: accessEvent?.team.members ?? [],
                  },
                },
              }
            : null,
        ),
      ),
      create: vi.fn().mockResolvedValue(post ?? createPost()),
      update: vi.fn().mockResolvedValue(post ?? createPost()),
    },
    eventLogisticsJoin: {
      count: vi.fn().mockResolvedValue(activeJoinsCount),
      findUnique: vi.fn().mockResolvedValue(
        existingJoin
          ? {
              ...existingJoin,
              post: {
                eventId,
              },
            }
          : null,
      ),
      create: vi.fn().mockResolvedValue(createJoin()),
      update: vi.fn().mockResolvedValue(
        existingJoin
          ? {
              ...existingJoin,
              cancelledAt: null,
            }
          : createJoin({ cancelled: true }),
      ),
    },
  };

  return db;
};

const createContext = (
  db: ReturnType<typeof createDb>,
  sessionUser: { id: string; email?: string | null } = {
    id: userId,
    email: "user@example.com",
  },
) =>
  ({
    db,
    session: { user: sessionUser },
    headers: new Headers(),
  }) as never;

describe("eventLogisticsRouter", () => {
  let createCaller: typeof CreateCallerFactory;
  let eventLogisticsRouter: typeof EventLogisticsRouter;

  beforeAll(async () => {
    ({ createCallerFactory: createCaller } = await import("@/server/api/trpc"));
    ({ eventLogisticsRouter } = await import(
      "@/server/api/routers/event-logistics"
    ));
  });

  it("allows accepted participants with chat access to list posts", async () => {
    const db = createDb();
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await expect(caller.list({ eventId })).resolves.toMatchObject({
      isReadOnly: false,
      posts: [{ id: postId }],
    });
  });

  it("rejects random users listing posts", async () => {
    const db = createDb({ accessEvent: createAccessEvent({ allowed: false }) });
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await expect(caller.list({ eventId })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(db.eventLogisticsPost.findMany).not.toHaveBeenCalled();
  });

  it("allows accessible users to create logistics posts", async () => {
    const db = createDb();
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await caller.create({
      eventId,
      type: EventLogisticsType.OFFER_SEAT,
      seatsAvailable: 2,
      body: "Есть два места в машине от города.",
    });

    expect(db.eventLogisticsPost.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventId,
        authorId: userId,
        type: EventLogisticsType.OFFER_SEAT,
        seatsAvailable: 2,
      }) as object,
      select: expect.any(Object) as object,
    });
  });

  it("rejects pending applicants without access creating posts", async () => {
    const db = createDb({ accessEvent: createAccessEvent({ allowed: false }) });
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await expect(
      caller.create({
        eventId,
        type: EventLogisticsType.NEED_SEAT,
        body: "Ищу место от общего района сбора.",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.eventLogisticsPost.create).not.toHaveBeenCalled();
  });

  it("rejects create for completed events", async () => {
    const db = createDb({
      accessEvent: createAccessEvent({ status: EventStatus.COMPLETED }),
    });
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await expect(
      caller.create({
        eventId,
        type: EventLogisticsType.NEED_SEAT,
        body: "Ищу место от общего района сбора.",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Мероприятие закрыто. Новые записи по логистике недоступны.",
    });
  });

  it("allows accepted participants to join offer-seat posts", async () => {
    const db = createDb({
      post: createPost({
        authorId: otherUserId,
        type: EventLogisticsType.OFFER_SEAT,
        seatsAvailable: 2,
      }),
    });
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await caller.join({ postId });

    expect(db.eventLogisticsJoin.create).toHaveBeenCalledWith({
      data: {
        postId,
        userId,
      },
      select: expect.any(Object) as object,
    });
    expect(db.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  });

  it("rejects random users joining posts", async () => {
    const db = createDb({
      accessEvent: createAccessEvent({ allowed: false }),
      post: createPost({
        authorId: otherUserId,
        type: EventLogisticsType.OFFER_SEAT,
        seatsAvailable: 2,
      }),
    });
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await expect(caller.join({ postId })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(db.eventLogisticsJoin.create).not.toHaveBeenCalled();
  });

  it("rejects author joining own post", async () => {
    const db = createDb({
      post: createPost({
        type: EventLogisticsType.OFFER_SEAT,
        seatsAvailable: 2,
      }),
    });
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await expect(caller.join({ postId })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Нельзя присоединиться к своей поездке.",
    });
  });

  it("rejects joining need-seat posts", async () => {
    const db = createDb({
      post: createPost({
        authorId: otherUserId,
        type: EventLogisticsType.NEED_SEAT,
        seatsAvailable: 2,
      }),
    });
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await expect(caller.join({ postId })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Присоединиться можно только к поездке с местами.",
    });
  });

  it("rejects joining going-together posts", async () => {
    const db = createDb({
      post: createPost({
        authorId: otherUserId,
        type: EventLogisticsType.GOING_TOGETHER,
        seatsAvailable: 2,
      }),
    });
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await expect(caller.join({ postId })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Присоединиться можно только к поездке с местами.",
    });
  });

  it("rejects joining closed posts", async () => {
    const db = createDb({
      post: createPost({
        authorId: otherUserId,
        type: EventLogisticsType.OFFER_SEAT,
        seatsAvailable: 2,
        status: EventLogisticsStatus.CLOSED,
      }),
    });
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await expect(caller.join({ postId })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Эта запись уже закрыта.",
    });
  });

  it("rejects joining hidden posts", async () => {
    const db = createDb({
      post: createPost({
        authorId: otherUserId,
        hidden: true,
        type: EventLogisticsType.OFFER_SEAT,
        seatsAvailable: 2,
      }),
    });
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await expect(caller.join({ postId })).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Запись не найдена.",
    });
  });

  it("rejects joining full posts", async () => {
    const db = createDb({
      activeJoinsCount: 2,
      post: createPost({
        authorId: otherUserId,
        type: EventLogisticsType.OFFER_SEAT,
        seatsAvailable: 2,
      }),
    });
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await expect(caller.join({ postId })).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Свободных мест больше нет.",
    });
  });

  it("rejects joining same ride twice", async () => {
    const db = createDb({
      existingJoin: createJoin(),
      post: createPost({
        authorId: otherUserId,
        type: EventLogisticsType.OFFER_SEAT,
        seatsAvailable: 2,
      }),
    });
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await expect(caller.join({ postId })).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Вы уже присоединились к этой поездке.",
    });
  });

  it("restores cancelled join", async () => {
    const db = createDb({
      existingJoin: createJoin({ cancelled: true }),
      post: createPost({
        authorId: otherUserId,
        type: EventLogisticsType.OFFER_SEAT,
        seatsAvailable: 2,
      }),
    });
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await caller.join({ postId });

    expect(db.eventLogisticsJoin.update).toHaveBeenCalledWith({
      where: { id: joinId },
      data: { cancelledAt: null },
      select: expect.any(Object) as object,
    });
  });

  it("rejects joining read-only event posts", async () => {
    const db = createDb({
      accessEvent: createAccessEvent({ status: EventStatus.COMPLETED }),
      post: createPost({
        authorId: otherUserId,
        type: EventLogisticsType.OFFER_SEAT,
        seatsAvailable: 2,
      }),
    });
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await expect(caller.join({ postId })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Мероприятие закрыто. Новые записи по логистике недоступны.",
    });
  });

  it("allows user to leave active join without hard delete", async () => {
    const db = createDb({
      existingJoin: createJoin(),
      post: createPost({
        authorId: otherUserId,
        type: EventLogisticsType.OFFER_SEAT,
        seatsAvailable: 2,
      }),
    });
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await expect(caller.leave({ postId })).resolves.toEqual({ success: true });
    expect(db.eventLogisticsJoin.update).toHaveBeenCalledWith({
      where: { id: joinId },
      data: {
        cancelledAt: expect.any(Date) as Date,
      },
    });
  });

  it("rejects leaving when user is not joined", async () => {
    const db = createDb({
      existingJoin: null,
      post: createPost({
        authorId: otherUserId,
        type: EventLogisticsType.OFFER_SEAT,
        seatsAvailable: 2,
      }),
    });
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await expect(caller.leave({ postId })).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Вы не присоединены к этой поездке.",
    });
  });

  it("allows leaving read-only event posts", async () => {
    const db = createDb({
      accessEvent: createAccessEvent({ status: EventStatus.COMPLETED }),
      existingJoin: createJoin(),
      post: createPost({
        authorId: otherUserId,
        type: EventLogisticsType.OFFER_SEAT,
        seatsAvailable: 2,
      }),
    });
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await expect(caller.leave({ postId })).resolves.toEqual({ success: true });
  });

  it("returns active joins and excludes cancelled joins from list", async () => {
    const db = createDb({
      post: createPost({
        authorId: otherUserId,
        joins: [createJoin(), createJoin({ cancelled: true, userId: otherUserId })],
        type: EventLogisticsType.OFFER_SEAT,
        seatsAvailable: 2,
      }),
    });
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    const result = await caller.list({ eventId });

    expect(result.posts[0]?.joins).toHaveLength(1);
    expect(result.posts[0]?.joins[0]?.userId).toBe(userId);
  });

  it("allows author to update own post", async () => {
    const db = createDb();
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await caller.updateMine({
      postId,
      body: "Обновил детали, выезд планирую утром.",
    });

    expect(db.eventLogisticsPost.update).toHaveBeenCalledWith({
      where: { id: postId },
      data: {
        body: "Обновил детали, выезд планирую утром.",
      },
      select: expect.any(Object) as object,
    });
  });

  it("rejects updating another user's post", async () => {
    const db = createDb({ post: createPost({ authorId: otherUserId }) });
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await expect(
      caller.updateMine({ postId, body: "Пробую изменить чужую запись." }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Можно редактировать только свою запись.",
    });
  });

  it("allows author to close own post", async () => {
    const db = createDb();
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await caller.closeMine({ postId });

    expect(db.eventLogisticsPost.update).toHaveBeenCalledWith({
      where: { id: postId },
      data: {
        status: EventLogisticsStatus.CLOSED,
        closedAt: expect.any(Date) as Date,
      },
      select: expect.any(Object) as object,
    });
  });

  it("allows author to reopen own post for active event", async () => {
    const db = createDb();
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await caller.reopenMine({ postId });

    expect(db.eventLogisticsPost.update).toHaveBeenCalledWith({
      where: { id: postId },
      data: {
        status: EventLogisticsStatus.ACTIVE,
        closedAt: null,
      },
      select: expect.any(Object) as object,
    });
  });

  it("rejects reopen for read-only event", async () => {
    const db = createDb({
      accessEvent: createAccessEvent({ status: EventStatus.COMPLETED }),
    });
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await expect(caller.reopenMine({ postId })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Мероприятие закрыто. Запись по логистике нельзя открыть снова.",
    });
  });

  it("allows managers to hide posts", async () => {
    const db = createDb({
      accessEvent: createAccessEvent({ allowed: false, manager: true }),
      post: createPost({ authorId: otherUserId }),
    });
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await expect(caller.hidePost({ postId })).resolves.toEqual({
      success: true,
    });
    expect(db.eventLogisticsPost.update).toHaveBeenCalledWith({
      where: { id: postId },
      data: {
        hiddenAt: expect.any(Date) as Date,
      },
    });
  });

  it("rejects random users hiding posts", async () => {
    const db = createDb({
      accessEvent: createAccessEvent({ allowed: false }),
      post: createPost({ authorId: otherUserId }),
    });
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await expect(caller.hidePost({ postId })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "У вас нет прав скрыть эту запись.",
    });
  });
});
