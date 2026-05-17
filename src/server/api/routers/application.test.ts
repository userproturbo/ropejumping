import { beforeAll, describe, expect, it, vi } from "vitest";

import { ApplicationStatus, TeamRole } from "@/generated/prisma/enums";
import type { applicationRouter as ApplicationRouter } from "@/server/api/routers/application";
import type { createCallerFactory as CreateCallerFactory } from "@/server/api/trpc";

process.env.DATABASE_URL ??= "postgresql://user:password@localhost:5432/test";

vi.mock("@/server/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  db: {},
}));

vi.mock("server-only", () => ({}));

const userId = "clx0a1b2c0000abcd1234efgh";
const otherUserId = "clx0a1b2c0001abcd1234efgh";
const managerId = "clx0a1b2c0002abcd1234efgh";
const applicationId = "clx0a1b2c0003abcd1234efgh";
const eventId = "clx0a1b2c0004abcd1234efgh";
const teamId = "clx0a1b2c0005abcd1234efgh";

const createApplication = (
  status: ApplicationStatus,
  overrides: Partial<{
    id: string;
    userId: string;
    eventId: string;
  }> = {},
) => ({
  id: overrides.id ?? applicationId,
  userId: overrides.userId ?? userId,
  eventId: overrides.eventId ?? eventId,
  status,
  event: {
    title: "Тестовое мероприятие",
    slug: "test-event",
  },
});

const createDb = ({
  application = createApplication(ApplicationStatus.PENDING),
  canManage = true,
}: {
  application?: ReturnType<typeof createApplication> | null;
  canManage?: boolean;
} = {}) => {
  const tx = {
    eventApplication: {
      update: vi.fn().mockResolvedValue(application ?? { id: applicationId }),
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
    event: {
      findUnique: vi.fn().mockResolvedValue({
        createdById: canManage ? managerId : otherUserId,
        teamId,
      }),
    },
    eventApplication: {
      findUnique: vi.fn().mockResolvedValue(application),
      update: vi.fn().mockResolvedValue(application ?? { id: applicationId }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    teamMember: {
      findUnique: vi.fn().mockResolvedValue(
        canManage
          ? {
              id: "team-member-id",
              role: TeamRole.ORGANIZER,
            }
          : null,
      ),
    },
  };
};

const createContext = (db: ReturnType<typeof createDb>, id = userId) =>
  ({
    db,
    session: {
      user: {
        id,
        email: "user@example.com",
      },
    },
    headers: new Headers(),
  }) as never;

describe("applicationRouter application polish", () => {
  let createCaller: typeof CreateCallerFactory;
  let applicationRouter: typeof ApplicationRouter;

  beforeAll(async () => {
    ({ createCallerFactory: createCaller } = await import("@/server/api/trpc"));
    ({ applicationRouter } = await import("@/server/api/routers/application"));
  });

  it("lets a user cancel their own pending application", async () => {
    const db = createDb({
      application: createApplication(ApplicationStatus.PENDING),
    });
    const caller = createCaller(applicationRouter)(createContext(db));

    await caller.cancelMine({ applicationId });

    expect(db.eventApplication.update).toHaveBeenCalledWith({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.CANCELLED_BY_USER,
      },
    });
  });

  it("lets a user cancel their own accepted application", async () => {
    const db = createDb({
      application: createApplication(ApplicationStatus.ACCEPTED),
    });
    const caller = createCaller(applicationRouter)(createContext(db));

    await caller.cancelMine({ applicationId });

    expect(db.eventApplication.update).toHaveBeenCalledWith({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.CANCELLED_BY_USER,
      },
    });
  });

  it("rejects cancelling rejected applications", async () => {
    const db = createDb({
      application: createApplication(ApplicationStatus.REJECTED),
    });
    const caller = createCaller(applicationRouter)(createContext(db));

    await expect(caller.cancelMine({ applicationId })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Эту заявку нельзя отменить.",
    });
    expect(db.eventApplication.update).not.toHaveBeenCalled();
  });

  it("rejects cancelling confirmed applications", async () => {
    const db = createDb({
      application: createApplication(ApplicationStatus.CONFIRMED_PARTICIPATION),
    });
    const caller = createCaller(applicationRouter)(createContext(db));

    await expect(caller.cancelMine({ applicationId })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Эту заявку нельзя отменить.",
    });
    expect(db.eventApplication.update).not.toHaveBeenCalled();
  });

  it("does not let a random user cancel someone else's application", async () => {
    const db = createDb({
      application: createApplication(ApplicationStatus.PENDING, {
        userId: otherUserId,
      }),
    });
    const caller = createCaller(applicationRouter)(createContext(db));

    await expect(caller.cancelMine({ applicationId })).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Заявка не найдена.",
    });
    expect(db.eventApplication.update).not.toHaveBeenCalled();
  });

  it("lets an event manager accept a pending application", async () => {
    const db = createDb({
      application: createApplication(ApplicationStatus.PENDING),
    });
    const caller = createCaller(applicationRouter)(
      createContext(db, managerId),
    );

    await caller.accept({ applicationId, organizerNote: "Ок" });

    expect(db.tx.eventApplication.update).toHaveBeenCalledWith({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.ACCEPTED,
        decidedById: managerId,
        decidedAt: expect.any(Date) as Date,
        organizerNote: "Ок",
      },
      select: expect.any(Object) as object,
    });
  });

  it("lets an event manager reject a pending application", async () => {
    const db = createDb({
      application: createApplication(ApplicationStatus.PENDING),
    });
    const caller = createCaller(applicationRouter)(
      createContext(db, managerId),
    );

    await caller.reject({ applicationId, organizerNote: "Не подходит" });

    expect(db.tx.eventApplication.update).toHaveBeenCalledWith({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.REJECTED,
        decidedById: managerId,
        decidedAt: expect.any(Date) as Date,
        organizerNote: "Не подходит",
      },
      select: expect.any(Object) as object,
    });
  });

  it("rejects non-managers accepting applications", async () => {
    const db = createDb({
      application: createApplication(ApplicationStatus.PENDING),
      canManage: false,
    });
    const caller = createCaller(applicationRouter)(createContext(db));

    await expect(
      caller.accept({ applicationId, organizerNote: null }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "У вас нет прав на управление заявками этого мероприятия.",
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("lets an event manager update organizer note", async () => {
    const db = createDb({
      application: createApplication(ApplicationStatus.ACCEPTED),
    });
    const caller = createCaller(applicationRouter)(
      createContext(db, managerId),
    );

    await caller.updateOrganizerNote({
      applicationId,
      organizerNote: "Позвонить перед выездом",
    });

    expect(db.eventApplication.update).toHaveBeenCalledWith({
      where: { id: applicationId },
      data: {
        organizerNote: "Позвонить перед выездом",
      },
    });
  });

  it("lets an event manager confirm accepted participation", async () => {
    const db = createDb({
      application: createApplication(ApplicationStatus.ACCEPTED),
    });
    const caller = createCaller(applicationRouter)(
      createContext(db, managerId),
    );

    await caller.confirmParticipation({ applicationId });

    expect(db.eventApplication.update).toHaveBeenCalledWith({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.CONFIRMED_PARTICIPATION,
        decidedById: managerId,
        decidedAt: expect.any(Date) as Date,
      },
    });
  });

  it("lets an event manager mark accepted application as no-show", async () => {
    const db = createDb({
      application: createApplication(ApplicationStatus.ACCEPTED),
    });
    const caller = createCaller(applicationRouter)(
      createContext(db, managerId),
    );

    await caller.markNoShow({ applicationId });

    expect(db.eventApplication.update).toHaveBeenCalledWith({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.NO_SHOW,
        decidedById: managerId,
        decidedAt: expect.any(Date) as Date,
      },
    });
  });
});
