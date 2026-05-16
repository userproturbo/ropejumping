import { beforeAll, describe, expect, it, vi } from "vitest";

import {
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

vi.mock("@/server/api/routers/post", () => ({
  publicPostWhere: {
    hiddenAt: null,
  },
}));

const reporterId = "clx0a1b2c0000abcd1234efgh";
const moderatorId = "clx0a1b2c0001abcd1234efgh";
const impressionId = "clx0a1b2c0002abcd1234efgh";
const reportId = "clx0a1b2c0003abcd1234efgh";
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
}: {
  reportableImpression?: { id: string } | null;
} = {}) => {
  const tx = {
    objectImpression: {
      update: vi.fn().mockResolvedValue({ id: impressionId }),
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
    const findFirstInput = db.objectImpression.findFirst.mock
      .calls[0]?.[0] as {
      where: {
        object: {
          visibility: ObjectVisibility;
        };
      };
    };

    expect(findFirstInput.where.object.visibility).toBe(ObjectVisibility.PUBLIC);
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
});
