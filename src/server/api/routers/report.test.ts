import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  EventLogisticsType,
  ObjectVisibility,
  ReportStatus,
} from "@/generated/prisma/enums";
import type { reportRouter as ReportRouter } from "@/server/api/routers/report";
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

vi.mock("@/server/api/routers/post", () => ({
  publicPostWhere: {
    hiddenAt: null,
  },
}));

const reporterId = "clx0a1b2c0000abcd1234efgh";
const moderatorId = "clx0a1b2c0001abcd1234efgh";
const impressionId = "clx0a1b2c0002abcd1234efgh";
const reportId = "clx0a1b2c0003abcd1234efgh";
const eventChatMessageId = "clx0a1b2c0004abcd1234efgh";
const teamChatMessageId = "clx0a1b2c0005abcd1234efgh";
const eventId = "clx0a1b2c0006abcd1234efgh";
const teamId = "clx0a1b2c0007abcd1234efgh";
const eventLogisticsPostId = "clx0a1b2c0008abcd1234efgh";
const reason = "Нарушение правил безопасности или сообщества";

const createReport = () => ({
  id: reportId,
  reporter: {
    id: reporterId,
    name: null,
    email: "reporter@example.com",
    image: null,
    profile: null,
  },
  reviewedBy: null,
});

const createDb = ({
  reportableImpression = { id: impressionId },
  reportableEventChatMessage = { id: eventChatMessageId, eventId },
  reportableEventLogisticsPost = { id: eventLogisticsPostId, eventId },
  reportableTeamChatMessage = { id: teamChatMessageId, teamId },
  eventAccessAllowed = true,
  teamAccessAllowed = true,
}: {
  reportableImpression?: { id: string } | null;
  reportableEventChatMessage?: { id: string; eventId: string } | null;
  reportableEventLogisticsPost?: { id: string; eventId: string } | null;
  reportableTeamChatMessage?: { id: string; teamId: string } | null;
  eventAccessAllowed?: boolean;
  teamAccessAllowed?: boolean;
} = {}) => {
  const tx = {
    objectImpression: {
      update: vi.fn().mockResolvedValue({ id: impressionId }),
    },
    eventChatMessage: {
      update: vi.fn().mockResolvedValue({ id: eventChatMessageId }),
    },
    eventLogisticsPost: {
      update: vi.fn().mockResolvedValue({ id: eventLogisticsPostId }),
    },
    teamChatMessage: {
      update: vi.fn().mockResolvedValue({ id: teamChatMessageId }),
    },
    report: {
      update: vi.fn().mockResolvedValue(createReport()),
    },
    notification: {
      create: vi.fn().mockResolvedValue({ id: "notification-id" }),
    },
  };

  return {
    $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) =>
      callback(tx),
    ),
    tx,
    profile: {
      findUnique: vi.fn().mockResolvedValue({ id: "profile-id" }),
    },
    post: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    comment: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    jumpObject: {
      findFirst: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    objectImpression: {
      findFirst: vi.fn().mockResolvedValue(reportableImpression),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({ id: impressionId }),
    },
    event: {
      findUnique: vi.fn().mockResolvedValue({
        createdById: eventAccessAllowed ? reporterId : "other-user-id",
        team: {
          members: [],
        },
        applications: [],
        participations: [],
      }),
    },
    team: {
      findUnique: vi.fn().mockResolvedValue({
        members: teamAccessAllowed ? [{ id: "member-id" }] : [],
      }),
    },
    eventChatMessage: {
      findFirst: vi.fn().mockResolvedValue(reportableEventChatMessage),
      findUnique: vi.fn().mockResolvedValue({ id: eventChatMessageId }),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({ id: eventChatMessageId }),
    },
    eventLogisticsPost: {
      findFirst: vi.fn().mockResolvedValue(reportableEventLogisticsPost),
      findUnique: vi.fn().mockResolvedValue({ id: eventLogisticsPostId }),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({ id: eventLogisticsPostId }),
    },
    teamChatMessage: {
      findFirst: vi.fn().mockResolvedValue(reportableTeamChatMessage),
      findUnique: vi.fn().mockResolvedValue({ id: teamChatMessageId }),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({ id: teamChatMessageId }),
    },
    report: {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: reportId }),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(createReport()),
    },
  };
};

const createContext = (
  db: ReturnType<typeof createDb>,
  user: { id: string; email?: string | null } = {
    id: reporterId,
    email: "user@example.com",
  },
) =>
  ({
    db,
    session: {
      user,
    },
    headers: new Headers(),
  }) as never;

describe("reportRouter object impression support", () => {
  let createCaller: typeof CreateCallerFactory;
  let reportRouter: typeof ReportRouter;

  beforeAll(async () => {
    ({ createCallerFactory: createCaller } = await import("@/server/api/trpc"));
    ({ reportRouter } = await import("@/server/api/routers/report"));
  });

  it("accepts a visible impression on a public object as reportable", async () => {
    const db = createDb();
    const caller = createCaller(reportRouter)(createContext(db));

    await caller.create({
      targetType: "OBJECT_IMPRESSION",
      targetId: impressionId,
      reason,
      details: null,
    });

    expect(db.objectImpression.findFirst).toHaveBeenCalledWith({
      where: {
        id: impressionId,
        hiddenAt: null,
        object: {
          visibility: ObjectVisibility.PUBLIC,
          createdByTeam: {
            is: {
              status: {
                in: ["REGULAR", "VERIFIED"],
              },
            },
          },
        },
      },
      select: { id: true },
    });
    expect(db.report.create).toHaveBeenCalledWith({
      data: {
        reporterId,
        targetType: "OBJECT_IMPRESSION",
        targetId: impressionId,
        reason,
        details: null,
        status: ReportStatus.OPEN,
      },
    });
  });

  it("rejects a hidden object impression", async () => {
    const db = createDb({ reportableImpression: null });
    const caller = createCaller(reportRouter)(createContext(db));

    await expect(
      caller.create({
        targetType: "OBJECT_IMPRESSION",
        targetId: impressionId,
        reason,
        details: null,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Объект жалобы не найден.",
    });
    expect(db.report.create).not.toHaveBeenCalled();
  });

  it("rejects an impression when its object is not public", async () => {
    const db = createDb({ reportableImpression: null });
    const caller = createCaller(reportRouter)(createContext(db));

    await expect(
      caller.create({
        targetType: "OBJECT_IMPRESSION",
        targetId: impressionId,
        reason,
        details: null,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Объект жалобы не найден.",
    });
    const findFirstInput = db.objectImpression.findFirst.mock.calls[0]?.[0] as {
      where: {
        object: {
          visibility: ObjectVisibility;
        };
      };
    };

    expect(findFirstInput.where.object.visibility).toBe(
      ObjectVisibility.PUBLIC,
    );
  });

  it("allows moderators to hide an object impression", async () => {
    const db = createDb();
    const caller = createCaller(reportRouter)(
      createContext(db, {
        id: moderatorId,
        email: "moderator@example.com",
      }),
    );

    await expect(
      caller.hideObjectImpression({ impressionId }),
    ).resolves.toEqual({ success: true });
    expect(db.tx.objectImpression.update).toHaveBeenCalledWith({
      where: {
        id: impressionId,
      },
      data: {
        hiddenAt: expect.any(Date) as Date,
      },
    });
    expect(db.tx.report.update).not.toHaveBeenCalled();
  });

  it("resolves the report when hiding an impression with reportId", async () => {
    const db = createDb();
    const caller = createCaller(reportRouter)(
      createContext(db, {
        id: moderatorId,
        email: "moderator@example.com",
      }),
    );

    await caller.hideObjectImpression({ impressionId, reportId });

    expect(db.tx.report.update).toHaveBeenCalledWith({
      where: { id: reportId },
      data: {
        status: ReportStatus.RESOLVED,
        reviewedById: moderatorId,
        reviewedAt: expect.any(Date) as Date,
      },
      include: expect.any(Object) as object,
    });
    expect(db.tx.notification.create).toHaveBeenCalled();
  });

  it("rejects non-moderators hiding an object impression", async () => {
    const db = createDb();
    const caller = createCaller(reportRouter)(createContext(db));

    await expect(
      caller.hideObjectImpression({ impressionId }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "У вас нет прав модератора.",
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("allows users with event chat access to report visible event chat messages", async () => {
    const db = createDb();
    const caller = createCaller(reportRouter)(createContext(db));

    await caller.create({
      targetType: "EVENT_CHAT_MESSAGE",
      targetId: eventChatMessageId,
      reason,
      details: null,
    });

    expect(db.eventChatMessage.findFirst).toHaveBeenCalledWith({
      where: {
        id: eventChatMessageId,
        deletedAt: null,
        hiddenAt: null,
      },
      select: {
        id: true,
        eventId: true,
      },
    });
    expect(db.report.create).toHaveBeenCalledWith({
      data: {
        reporterId,
        targetType: "EVENT_CHAT_MESSAGE",
        targetId: eventChatMessageId,
        reason,
        details: null,
        status: ReportStatus.OPEN,
      },
    });
  });

  it("rejects event chat message reports without chat access", async () => {
    const db = createDb({ eventAccessAllowed: false });
    const caller = createCaller(reportRouter)(createContext(db));

    await expect(
      caller.create({
        targetType: "EVENT_CHAT_MESSAGE",
        targetId: eventChatMessageId,
        reason,
        details: null,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Объект жалобы не найден.",
    });
    expect(db.report.create).not.toHaveBeenCalled();
  });

  it("rejects deleted or hidden event chat messages", async () => {
    const db = createDb({ reportableEventChatMessage: null });
    const caller = createCaller(reportRouter)(createContext(db));

    await expect(
      caller.create({
        targetType: "EVENT_CHAT_MESSAGE",
        targetId: eventChatMessageId,
        reason,
        details: null,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Объект жалобы не найден.",
    });
    expect(db.event.findUnique).not.toHaveBeenCalled();
  });

  it("allows team members to report visible team chat messages", async () => {
    const db = createDb();
    const caller = createCaller(reportRouter)(createContext(db));

    await caller.create({
      targetType: "TEAM_CHAT_MESSAGE",
      targetId: teamChatMessageId,
      reason,
      details: null,
    });

    expect(db.teamChatMessage.findFirst).toHaveBeenCalledWith({
      where: {
        id: teamChatMessageId,
        deletedAt: null,
        hiddenAt: null,
      },
      select: {
        id: true,
        teamId: true,
      },
    });
    expect(db.report.create).toHaveBeenCalledWith({
      data: {
        reporterId,
        targetType: "TEAM_CHAT_MESSAGE",
        targetId: teamChatMessageId,
        reason,
        details: null,
        status: ReportStatus.OPEN,
      },
    });
  });

  it("allows users with logistics access to report visible logistics posts", async () => {
    const db = createDb();
    const caller = createCaller(reportRouter)(createContext(db));

    await caller.create({
      targetType: "EVENT_LOGISTICS_POST",
      targetId: eventLogisticsPostId,
      reason,
      details: null,
    });

    expect(db.eventLogisticsPost.findFirst).toHaveBeenCalledWith({
      where: {
        id: eventLogisticsPostId,
        hiddenAt: null,
      },
      select: {
        id: true,
        eventId: true,
      },
    });
    expect(db.report.create).toHaveBeenCalledWith({
      data: {
        reporterId,
        targetType: "EVENT_LOGISTICS_POST",
        targetId: eventLogisticsPostId,
        reason,
        details: null,
        status: ReportStatus.OPEN,
      },
    });
  });

  it("rejects logistics post reports without logistics access", async () => {
    const db = createDb({ eventAccessAllowed: false });
    const caller = createCaller(reportRouter)(createContext(db));

    await expect(
      caller.create({
        targetType: "EVENT_LOGISTICS_POST",
        targetId: eventLogisticsPostId,
        reason,
        details: null,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Объект жалобы не найден.",
    });
    expect(db.report.create).not.toHaveBeenCalled();
  });

  it("rejects pending applicants reporting logistics posts", async () => {
    const db = createDb({ eventAccessAllowed: false });
    const caller = createCaller(reportRouter)(createContext(db));

    await expect(
      caller.create({
        targetType: "EVENT_LOGISTICS_POST",
        targetId: eventLogisticsPostId,
        reason,
        details: null,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Объект жалобы не найден.",
    });
    const eventFindInput = db.event.findUnique.mock.calls[0]?.[0] as {
      select: {
        applications: {
          where: {
            status: {
              in: string[];
            };
          };
        };
      };
    };

    expect(eventFindInput.select.applications.where.status.in).toEqual([
      "ACCEPTED",
      "CONFIRMED_PARTICIPATION",
    ]);
    expect(db.report.create).not.toHaveBeenCalled();
  });

  it("rejects hidden logistics posts", async () => {
    const db = createDb({ reportableEventLogisticsPost: null });
    const caller = createCaller(reportRouter)(createContext(db));

    await expect(
      caller.create({
        targetType: "EVENT_LOGISTICS_POST",
        targetId: eventLogisticsPostId,
        reason,
        details: null,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Объект жалобы не найден.",
    });
    expect(db.event.findUnique).not.toHaveBeenCalled();
    expect(db.report.create).not.toHaveBeenCalled();
  });

  it("rejects team chat message reports without chat access", async () => {
    const db = createDb({ teamAccessAllowed: false });
    const caller = createCaller(reportRouter)(createContext(db));

    await expect(
      caller.create({
        targetType: "TEAM_CHAT_MESSAGE",
        targetId: teamChatMessageId,
        reason,
        details: null,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Объект жалобы не найден.",
    });
    expect(db.report.create).not.toHaveBeenCalled();
  });

  it("rejects deleted or hidden team chat messages", async () => {
    const db = createDb({ reportableTeamChatMessage: null });
    const caller = createCaller(reportRouter)(createContext(db));

    await expect(
      caller.create({
        targetType: "TEAM_CHAT_MESSAGE",
        targetId: teamChatMessageId,
        reason,
        details: null,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Объект жалобы не найден.",
    });
    expect(db.team.findUnique).not.toHaveBeenCalled();
  });

  it("allows moderators to hide event chat messages", async () => {
    const db = createDb();
    const caller = createCaller(reportRouter)(
      createContext(db, {
        id: moderatorId,
        email: "moderator@example.com",
      }),
    );

    await expect(
      caller.hideEventChatMessage({ messageId: eventChatMessageId }),
    ).resolves.toEqual({ success: true });
    expect(db.tx.eventChatMessage.update).toHaveBeenCalledWith({
      where: {
        id: eventChatMessageId,
      },
      data: {
        hiddenAt: expect.any(Date) as Date,
      },
    });
  });

  it("rejects non-moderators hiding event chat messages", async () => {
    const db = createDb();
    const caller = createCaller(reportRouter)(createContext(db));

    await expect(
      caller.hideEventChatMessage({ messageId: eventChatMessageId }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "У вас нет прав модератора.",
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("resolves the report when hiding an event chat message with reportId", async () => {
    const db = createDb();
    const caller = createCaller(reportRouter)(
      createContext(db, {
        id: moderatorId,
        email: "moderator@example.com",
      }),
    );

    await caller.hideEventChatMessage({
      messageId: eventChatMessageId,
      reportId,
    });

    expect(db.tx.report.update).toHaveBeenCalledWith({
      where: { id: reportId },
      data: {
        status: ReportStatus.RESOLVED,
        reviewedById: moderatorId,
        reviewedAt: expect.any(Date) as Date,
      },
      include: expect.any(Object) as object,
    });
  });

  it("allows moderators to hide team chat messages", async () => {
    const db = createDb();
    const caller = createCaller(reportRouter)(
      createContext(db, {
        id: moderatorId,
        email: "moderator@example.com",
      }),
    );

    await expect(
      caller.hideTeamChatMessage({ messageId: teamChatMessageId }),
    ).resolves.toEqual({ success: true });
    expect(db.tx.teamChatMessage.update).toHaveBeenCalledWith({
      where: {
        id: teamChatMessageId,
      },
      data: {
        hiddenAt: expect.any(Date) as Date,
      },
    });
  });

  it("allows moderators to hide logistics posts", async () => {
    const db = createDb();
    const caller = createCaller(reportRouter)(
      createContext(db, {
        id: moderatorId,
        email: "moderator@example.com",
      }),
    );

    await expect(
      caller.hideEventLogisticsPost({ postId: eventLogisticsPostId }),
    ).resolves.toEqual({ success: true });
    expect(db.tx.eventLogisticsPost.update).toHaveBeenCalledWith({
      where: {
        id: eventLogisticsPostId,
      },
      data: {
        hiddenAt: expect.any(Date) as Date,
      },
    });
  });

  it("rejects non-moderators hiding logistics posts", async () => {
    const db = createDb();
    const caller = createCaller(reportRouter)(createContext(db));

    await expect(
      caller.hideEventLogisticsPost({ postId: eventLogisticsPostId }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "У вас нет прав модератора.",
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("resolves the report when hiding a logistics post with reportId", async () => {
    const db = createDb();
    const caller = createCaller(reportRouter)(
      createContext(db, {
        id: moderatorId,
        email: "moderator@example.com",
      }),
    );

    await caller.hideEventLogisticsPost({
      postId: eventLogisticsPostId,
      reportId,
    });

    expect(db.tx.report.update).toHaveBeenCalledWith({
      where: { id: reportId },
      data: {
        status: ReportStatus.RESOLVED,
        reviewedById: moderatorId,
        reviewedAt: expect.any(Date) as Date,
      },
      include: expect.any(Object) as object,
    });
  });

  it("includes logistics post previews in moderation reports without emails", async () => {
    const db = createDb();
    db.report.findMany.mockResolvedValue([
      {
        id: reportId,
        reporterId,
        targetType: "EVENT_LOGISTICS_POST",
        targetId: eventLogisticsPostId,
        reason,
        details: null,
        status: ReportStatus.OPEN,
        createdAt: new Date("2026-05-17T10:00:00.000Z"),
        reviewedAt: null,
        reporter: {
          id: reporterId,
          name: "Reporter",
          email: "reporter@example.com",
          image: null,
          profile: null,
        },
        reviewedBy: null,
      },
    ]);
    db.eventLogisticsPost.findMany.mockResolvedValue([
      {
        id: eventLogisticsPostId,
        type: EventLogisticsType.OFFER_SEAT,
        body: "Есть два места от метро.",
        hiddenAt: null,
        author: {
          id: "author-id",
          name: "Автор",
          profile: {
            username: "author",
            displayName: "Автор логистики",
            avatarUrl: null,
          },
        },
        event: {
          id: eventId,
          title: "Прыжки",
          slug: "jumps",
        },
      },
    ]);
    const caller = createCaller(reportRouter)(
      createContext(db, {
        id: moderatorId,
        email: "moderator@example.com",
      }),
    );

    const result = await caller.listForModeration({ status: "OPEN" });

    expect(db.eventLogisticsPost.findMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: [eventLogisticsPostId],
        },
      },
      select: {
        id: true,
        type: true,
        body: true,
        hiddenAt: true,
        author: {
          select: {
            id: true,
            name: true,
            profile: {
              select: {
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });
    expect(result.reports[0]?.targetEventLogisticsPost).toMatchObject({
      id: eventLogisticsPostId,
      body: "Есть два места от метро.",
      event: {
        title: "Прыжки",
        slug: "jumps",
      },
    });
    expect(
      result.reports[0]?.targetEventLogisticsPost?.author,
    ).not.toHaveProperty("email");
  });

  it("rejects non-moderators hiding team chat messages", async () => {
    const db = createDb();
    const caller = createCaller(reportRouter)(createContext(db));

    await expect(
      caller.hideTeamChatMessage({ messageId: teamChatMessageId }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "У вас нет прав модератора.",
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("resolves the report when hiding a team chat message with reportId", async () => {
    const db = createDb();
    const caller = createCaller(reportRouter)(
      createContext(db, {
        id: moderatorId,
        email: "moderator@example.com",
      }),
    );

    await caller.hideTeamChatMessage({
      messageId: teamChatMessageId,
      reportId,
    });

    expect(db.tx.report.update).toHaveBeenCalledWith({
      where: { id: reportId },
      data: {
        status: ReportStatus.RESOLVED,
        reviewedById: moderatorId,
        reviewedAt: expect.any(Date) as Date,
      },
      include: expect.any(Object) as object,
    });
  });
});
