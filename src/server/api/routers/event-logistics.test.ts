import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  EventLogisticsStatus,
  EventLogisticsType,
  EventStatus,
} from "@/generated/prisma/enums";
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

const createPost = (authorId = userId) => ({
  id: postId,
  eventId,
  authorId,
  type: EventLogisticsType.NEED_SEAT,
  status: EventLogisticsStatus.ACTIVE,
  fromLocation: "Москва",
  departureTimeText: "суббота утром",
  seatsAvailable: null,
  baggageNote: null,
  body: "Ищу место до общего района сбора.",
  createdAt: new Date("2026-05-17T10:00:00.000Z"),
  updatedAt: new Date("2026-05-17T10:00:00.000Z"),
  closedAt: null,
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
  accessEvent = createAccessEvent(),
  post = createPost(),
  createCount = 0,
}: {
  accessEvent?: ReturnType<typeof createAccessEvent> | null;
  post?: ReturnType<typeof createPost> | null;
  createCount?: number;
} = {}) => ({
  event: {
    findUnique: vi.fn().mockResolvedValue(accessEvent),
  },
  eventLogisticsPost: {
    count: vi.fn().mockResolvedValue(createCount),
    findMany: vi.fn().mockResolvedValue(post ? [post] : []),
    findFirst: vi.fn().mockResolvedValue(
      post
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
    create: vi.fn().mockResolvedValue(post ?? createPost()),
    update: vi.fn().mockResolvedValue(post ?? createPost()),
  },
});

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
    const db = createDb({ post: createPost(otherUserId) });
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
      post: createPost(otherUserId),
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
      post: createPost(otherUserId),
    });
    const caller = createCaller(eventLogisticsRouter)(createContext(db));

    await expect(caller.hidePost({ postId })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "У вас нет прав скрыть эту запись.",
    });
  });
});
