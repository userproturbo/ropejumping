import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApplicationStatus,
  EventStatus,
  ObjectVisibility,
  TeamRole,
} from "@/generated/prisma/enums";
import type { eventRouter as EventRouter } from "@/server/api/routers/event";
import type { createCallerFactory as CreateCallerFactory } from "@/server/api/trpc";

process.env.DATABASE_URL ??= "postgresql://user:password@localhost:5432/test";

const badgeServiceMocks = vi.hoisted(() => ({
  recalculateAutomaticBadgesForUser: vi.fn().mockResolvedValue({
    awardedBadgeCodes: ["participation_1"],
  }),
}));

vi.mock("@/server/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  db: {},
}));

vi.mock("server-only", () => ({}));

vi.mock("@/server/badges/service", () => badgeServiceMocks);

const creatorId = "clx0a1b2c0000abcd1234efgh";
const managerId = "clx0a1b2c0001abcd1234efgh";
const randomUserId = "clx0a1b2c0002abcd1234efgh";
const eventId = "clx0a1b2c0003abcd1234efgh";
const otherEventApplicationId = "clx0a1b2c0004abcd1234efgh";
const teamId = "clx0a1b2c0005abcd1234efgh";
const acceptedApplicationId = "clx0a1b2c0006abcd1234efgh";
const secondAcceptedApplicationId = "clx0a1b2c0007abcd1234efgh";
const confirmedApplicationId = "clx0a1b2c0008abcd1234efgh";
const noShowApplicationId = "clx0a1b2c0009abcd1234efgh";
const acceptedApplicationUserId = "clx0a1b2c0010abcd1234efgh";
const secondAcceptedApplicationUserId = "clx0a1b2c0011abcd1234efgh";
const confirmedApplicationUserId = "clx0a1b2c0012abcd1234efgh";
const noShowApplicationUserId = "clx0a1b2c0013abcd1234efgh";

const completionStatuses = [
  ApplicationStatus.ACCEPTED,
  ApplicationStatus.CONFIRMED_PARTICIPATION,
  ApplicationStatus.NO_SHOW,
];

const defaultEligibleApplications = [
  {
    id: acceptedApplicationId,
    userId: acceptedApplicationUserId,
  },
  {
    id: secondAcceptedApplicationId,
    userId: secondAcceptedApplicationUserId,
  },
  {
    id: confirmedApplicationId,
    userId: confirmedApplicationUserId,
  },
  {
    id: noShowApplicationId,
    userId: noShowApplicationUserId,
  },
];

const createDb = ({
  status = EventStatus.APPLICATIONS_CLOSED,
  createdById = managerId,
  memberRole = TeamRole.ORGANIZER,
  eligibleApplications = defaultEligibleApplications,
}: {
  status?: EventStatus;
  createdById?: string;
  memberRole?: TeamRole | null;
  eligibleApplications?: { id: string; userId: string }[];
} = {}) => {
  const event = {
    id: eventId,
    status,
    createdById,
    teamId,
  };
  const tx = {
    event: {
      update: vi
        .fn()
        .mockResolvedValue({ ...event, status: EventStatus.COMPLETED }),
    },
    eventApplication: {
      findMany: vi.fn().mockResolvedValue(eligibleApplications),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    eventParticipation: {
      upsert: vi.fn().mockResolvedValue({ id: "event-participation-id" }),
    },
  };

  return {
    $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) =>
      callback(tx),
    ),
    tx,
    event: {
      findUnique: vi.fn().mockResolvedValue(event),
    },
    teamMember: {
      findUnique: vi.fn().mockResolvedValue(
        memberRole
          ? {
              id: "team-member-id",
              role: memberRole,
            }
          : null,
      ),
    },
  };
};

const createContext = (db: ReturnType<typeof createDb>, id = managerId) =>
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

describe("eventRouter completion", () => {
  let createCaller: typeof CreateCallerFactory;
  let eventRouter: typeof EventRouter;

  beforeAll(async () => {
    ({ createCallerFactory: createCaller } = await import("@/server/api/trpc"));
    ({ eventRouter } = await import("@/server/api/routers/event"));
  });

  beforeEach(() => {
    badgeServiceMocks.recalculateAutomaticBadgesForUser.mockClear();
  });

  it("lets an event manager complete an event", async () => {
    const db = createDb();
    const caller = createCaller(eventRouter)(createContext(db, managerId));

    await expect(
      caller.complete({
        eventId,
        confirmedApplicationIds: [acceptedApplicationId],
        markUnselectedAcceptedAsNoShow: false,
      }),
    ).resolves.toEqual({ success: true });

    expect(db.tx.event.update).toHaveBeenCalledWith({
      where: { id: eventId },
      data: {
        status: EventStatus.COMPLETED,
        completedAt: expect.any(Date) as Date,
      },
    });
  });

  it("lets the event creator complete an event", async () => {
    const db = createDb({
      createdById: creatorId,
      memberRole: null,
    });
    const caller = createCaller(eventRouter)(createContext(db, creatorId));

    await expect(
      caller.complete({
        eventId,
        confirmedApplicationIds: [acceptedApplicationId],
        markUnselectedAcceptedAsNoShow: false,
      }),
    ).resolves.toEqual({ success: true });
  });

  it("rejects a random user", async () => {
    const db = createDb({
      createdById: creatorId,
      memberRole: null,
    });
    const caller = createCaller(eventRouter)(createContext(db, randomUserId));

    await expect(
      caller.complete({
        eventId,
        confirmedApplicationIds: [],
        markUnselectedAcceptedAsNoShow: false,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "У вас нет прав завершать это мероприятие.",
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects an accepted participant without manager rights", async () => {
    const db = createDb({
      createdById: creatorId,
      memberRole: null,
    });
    const caller = createCaller(eventRouter)(createContext(db, randomUserId));

    await expect(
      caller.complete({
        eventId,
        confirmedApplicationIds: [acceptedApplicationId],
        markUnselectedAcceptedAsNoShow: false,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("sets selected accepted applications to confirmed participation", async () => {
    const db = createDb();
    const caller = createCaller(eventRouter)(createContext(db, managerId));

    await caller.complete({
      eventId,
      confirmedApplicationIds: [acceptedApplicationId],
      markUnselectedAcceptedAsNoShow: false,
    });

    expect(db.tx.eventApplication.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        eventId,
        id: {
          in: [acceptedApplicationId],
        },
        status: {
          in: completionStatuses,
        },
      },
      data: {
        status: ApplicationStatus.CONFIRMED_PARTICIPATION,
        decidedById: managerId,
        decidedAt: expect.any(Date) as Date,
      },
    });
  });

  it("creates or updates participation for selected applications", async () => {
    const db = createDb();
    const caller = createCaller(eventRouter)(createContext(db, managerId));

    await caller.complete({
      eventId,
      confirmedApplicationIds: [acceptedApplicationId],
      markUnselectedAcceptedAsNoShow: false,
    });

    expect(db.tx.eventParticipation.upsert).toHaveBeenCalledWith({
      where: {
        eventId_userId: {
          eventId,
          userId: acceptedApplicationUserId,
        },
      },
      create: {
        eventId,
        userId: acceptedApplicationUserId,
        confirmedById: managerId,
        confirmedAt: expect.any(Date) as Date,
      },
      update: {
        confirmedById: managerId,
        confirmedAt: expect.any(Date) as Date,
      },
    });
  });

  it("recalculates automatic badges for selected applications", async () => {
    const db = createDb();
    const caller = createCaller(eventRouter)(createContext(db, managerId));

    await caller.complete({
      eventId,
      confirmedApplicationIds: [acceptedApplicationId],
      markUnselectedAcceptedAsNoShow: false,
    });

    expect(
      badgeServiceMocks.recalculateAutomaticBadgesForUser,
    ).toHaveBeenCalledWith({
      db,
      userId: acceptedApplicationUserId,
      awardedById: managerId,
    });
  });

  it("keeps unselected accepted applications accepted when no-show is off", async () => {
    const db = createDb();
    const caller = createCaller(eventRouter)(createContext(db, managerId));

    await caller.complete({
      eventId,
      confirmedApplicationIds: [acceptedApplicationId],
      markUnselectedAcceptedAsNoShow: false,
    });

    expect(db.tx.eventApplication.updateMany).toHaveBeenCalledTimes(1);
  });

  it("marks unselected accepted applications as no-show when requested", async () => {
    const db = createDb();
    const caller = createCaller(eventRouter)(createContext(db, managerId));

    await caller.complete({
      eventId,
      confirmedApplicationIds: [acceptedApplicationId],
      markUnselectedAcceptedAsNoShow: true,
    });

    expect(db.tx.eventApplication.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        eventId,
        id: {
          notIn: [acceptedApplicationId],
        },
        status: ApplicationStatus.ACCEPTED,
      },
      data: {
        status: ApplicationStatus.NO_SHOW,
        decidedById: managerId,
        decidedAt: expect.any(Date) as Date,
      },
    });
  });

  it("does not revert unselected confirmed participation to accepted", async () => {
    const db = createDb();
    const caller = createCaller(eventRouter)(createContext(db, managerId));

    await caller.complete({
      eventId,
      confirmedApplicationIds: [acceptedApplicationId],
      markUnselectedAcceptedAsNoShow: false,
    });

    expect(db.tx.eventApplication.updateMany).toHaveBeenCalledTimes(1);
  });

  it("does not revert unselected no-show to accepted", async () => {
    const db = createDb();
    const caller = createCaller(eventRouter)(createContext(db, managerId));

    await caller.complete({
      eventId,
      confirmedApplicationIds: [acceptedApplicationId],
      markUnselectedAcceptedAsNoShow: false,
    });

    expect(db.tx.eventApplication.updateMany).toHaveBeenCalledTimes(1);
  });

  it("does not modify pending, rejected, or cancelled applications", async () => {
    const db = createDb();
    const caller = createCaller(eventRouter)(createContext(db, managerId));

    await caller.complete({
      eventId,
      confirmedApplicationIds: [acceptedApplicationId],
      markUnselectedAcceptedAsNoShow: true,
    });

    expect(db.tx.eventApplication.findMany).toHaveBeenCalledWith({
      where: {
        eventId,
        status: {
          in: completionStatuses,
        },
      },
      select: {
        id: true,
        userId: true,
      },
    });
    expect(db.tx.eventApplication.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          status: {
            in: completionStatuses,
          },
        }) as object,
      }),
    );
    expect(db.tx.eventApplication.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          status: ApplicationStatus.ACCEPTED,
        }) as object,
      }),
    );
  });

  it("rejects cancelled events", async () => {
    const db = createDb({
      status: EventStatus.CANCELLED,
    });
    const caller = createCaller(eventRouter)(createContext(db, managerId));

    await expect(
      caller.complete({
        eventId,
        confirmedApplicationIds: [],
        markUnselectedAcceptedAsNoShow: false,
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Это мероприятие нельзя завершить.",
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects selected application ids from another event", async () => {
    const db = createDb({
      eligibleApplications: [
        {
          id: acceptedApplicationId,
          userId: acceptedApplicationUserId,
        },
      ],
    });
    const caller = createCaller(eventRouter)(createContext(db, managerId));

    await expect(
      caller.complete({
        eventId,
        confirmedApplicationIds: [otherEventApplicationId],
        markUnselectedAcceptedAsNoShow: false,
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message:
        "Некоторые заявки не найдены или не относятся к этому мероприятию.",
    });
    expect(db.tx.event.update).not.toHaveBeenCalled();
  });

  it("allows adjusting an already completed event", async () => {
    const db = createDb({
      status: EventStatus.COMPLETED,
    });
    const caller = createCaller(eventRouter)(createContext(db, managerId));

    await expect(
      caller.complete({
        eventId,
        confirmedApplicationIds: [confirmedApplicationId],
        markUnselectedAcceptedAsNoShow: false,
      }),
    ).resolves.toEqual({ success: true });
  });

  it("does not select email for completion data", async () => {
    const db = createDb();
    const caller = createCaller(eventRouter)(createContext(db, managerId));

    await caller.getForCompletion("test-event");

    expect(db.event.findUnique).toHaveBeenLastCalledWith({
      where: { id: eventId },
      select: expect.objectContaining({
        applications: expect.objectContaining({
          select: expect.objectContaining({
            user: {
              select: {
                id: true,
                name: true,
                profile: expect.any(Object) as object,
              },
            },
          }) as object,
        }) as object,
      }) as object,
    });
  });

  it("does not expose hidden object details on the public event page", async () => {
    const db = {
      event: {
        findFirst: vi.fn().mockResolvedValue({
          id: eventId,
          title: "Тестовое мероприятие",
          slug: "test-event",
          status: EventStatus.PUBLISHED,
          startsAt: new Date("2026-06-01T10:00:00.000Z"),
          endsAt: null,
          region: "Москва",
          capacity: 10,
          priceText: null,
          levelText: null,
          description: null,
          requirementsText: null,
          coverImageUrl: null,
          coverMedia: null,
          galleryImages: [],
          _count: {
            applications: 0,
          },
          team: {
            id: teamId,
            name: "Команда",
            slug: "team",
          },
          object: {
            id: "hidden-object-id",
            name: "Секретный объект",
            slug: "secret-object",
            type: "BRIDGE",
            visibility: ObjectVisibility.HIDDEN,
            heightMeters: 50,
            region: "Секретный регион",
          },
          applications: [],
          participations: [],
          crewMembers: [],
        }),
      },
      post: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const caller = createCaller(eventRouter)(createContext(db as never));

    const result = await caller.getBySlug("test-event");

    expect(result?.object).toEqual({
      id: "hidden-object-id",
      name: null,
      slug: null,
      type: null,
      visibility: ObjectVisibility.HIDDEN,
      heightMeters: null,
      region: null,
    });
  });
});
