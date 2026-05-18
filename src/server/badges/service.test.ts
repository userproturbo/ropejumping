import { describe, expect, it, vi } from "vitest";

import {
  BadgeCategory,
  EventStatus,
  ObjectVisibility,
} from "@/generated/prisma/enums";
import { recalculateAutomaticBadgesForUser } from "@/server/badges/service";

const userId = "clx0a1b2c0000abcd1234efgh";
const awardedById = "clx0a1b2c0001abcd1234efgh";

type ParticipationInput = {
  objectId?: string | null;
  visibility?: ObjectVisibility | null;
  heightMeters?: number | null;
};

const createParticipation = ({
  objectId = "object-1",
  visibility = ObjectVisibility.PUBLIC,
  heightMeters = null,
}: ParticipationInput = {}) => ({
  event: {
    objectId,
    object:
      objectId === null || visibility === null
        ? null
        : {
            id: objectId,
            visibility,
            heightMeters,
          },
  },
});

const createDb = ({
  participations = [],
  existingBadgeCodes = [],
}: {
  participations?: ReturnType<typeof createParticipation>[];
  existingBadgeCodes?: string[];
} = {}) => {
  const createdUserBadges: string[] = [];
  const badgeRowsByCode = new Map<string, { id: string; code: string }>();

  const getBadgeRow = (code: string) => {
    const existing = badgeRowsByCode.get(code);

    if (existing) return existing;

    const row = {
      id: `badge-${code}`,
      code,
    };
    badgeRowsByCode.set(code, row);

    return row;
  };

  return {
    createdUserBadges,
    badge: {
      upsert: vi.fn(async ({ where }: { where: { code: string } }) =>
        getBadgeRow(where.code),
      ),
      findMany: vi.fn(
        ({
          where,
        }: {
          where: {
            code: {
              in: string[];
            };
          };
        }) => where.code.in.map(getBadgeRow),
      ),
    },
    eventParticipation: {
      findMany: vi.fn().mockResolvedValue(participations),
    },
    userBadge: {
      findMany: vi.fn().mockImplementation(
        ({
          where,
        }: {
          where: {
            badgeId: {
              in: string[];
            };
          };
        }) =>
          where.badgeId.in
            .filter((badgeId) =>
              existingBadgeCodes.includes(badgeId.replace("badge-", "")),
            )
            .map((badgeId) => ({ badgeId })),
      ),
      create: vi.fn(
        ({
          data,
        }: {
          data: {
            badgeId: string;
          };
        }) => {
          createdUserBadges.push(data.badgeId.replace("badge-", ""));

          return {
            id: `user-${data.badgeId}`,
          };
        },
      ),
    },
  };
};

const recalculateForTest = (
  db: ReturnType<typeof createDb>,
  input: {
    awardedById?: string;
  } = {},
) =>
  recalculateAutomaticBadgesForUser({
    db: db as never,
    userId,
    awardedById: input.awardedById,
  });

describe("automatic badge service", () => {
  it("grants no badges without participations", async () => {
    const db = createDb();

    await expect(recalculateForTest(db)).resolves.toEqual({
      awardedBadgeCodes: [],
    });
    expect(db.userBadge.create).not.toHaveBeenCalled();
  });

  it("grants first participation badge for one completed participation", async () => {
    const db = createDb({
      participations: [createParticipation()],
    });

    await expect(recalculateForTest(db, { awardedById })).resolves.toEqual({
      awardedBadgeCodes: ["participation_1", "objects_1"],
    });
    expect(db.userBadge.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          awardedById,
          reason: "Автоматически выдано за подтверждённую историю участия.",
        }) as object,
      }),
    );
  });

  it("grants participation milestones through five events", async () => {
    const db = createDb({
      participations: Array.from({ length: 5 }, (_, index) =>
        createParticipation({ objectId: `object-${index}` }),
      ),
    });

    await recalculateForTest(db);

    expect(db.createdUserBadges).toEqual(
      expect.arrayContaining([
        "participation_1",
        "participation_2",
        "participation_5",
      ]),
    );
  });

  it("queries only completed event participations", async () => {
    const db = createDb({
      participations: [createParticipation()],
    });

    await recalculateForTest(db);

    expect(db.eventParticipation.findMany).toHaveBeenCalledWith({
      where: {
        userId,
        event: {
          status: EventStatus.COMPLETED,
        },
      },
      select: expect.any(Object) as object,
    });
  });

  it("counts unique public objects once", async () => {
    const db = createDb({
      participations: [
        createParticipation({ objectId: "object-1" }),
        createParticipation({ objectId: "object-1" }),
        createParticipation({ objectId: "object-2" }),
        createParticipation({ objectId: "object-3" }),
      ],
    });

    await recalculateForTest(db);

    expect(db.createdUserBadges).toContain("objects_3");
    expect(db.createdUserBadges).not.toContain("objects_5");
  });

  it("does not count hidden objects for object badges", async () => {
    const db = createDb({
      participations: [
        createParticipation({ objectId: "object-1" }),
        createParticipation({
          objectId: "hidden-object",
          visibility: ObjectVisibility.HIDDEN,
        }),
        createParticipation({ objectId: "object-2" }),
      ],
    });

    await recalculateForTest(db);

    expect(db.createdUserBadges).toContain("objects_1");
    expect(db.createdUserBadges).not.toContain("objects_3");
  });

  it("grants public height badges", async () => {
    const db = createDb({
      participations: [createParticipation({ heightMeters: 100 })],
    });

    await recalculateForTest(db);

    expect(db.createdUserBadges).toEqual(
      expect.arrayContaining(["height_30", "height_50", "height_100"]),
    );
    expect(db.createdUserBadges).not.toContain("height_150");
  });

  it("does not count hidden object heights", async () => {
    const db = createDb({
      participations: [
        createParticipation({
          objectId: "hidden-object",
          visibility: ObjectVisibility.HIDDEN,
          heightMeters: 300,
        }),
      ],
    });

    await recalculateForTest(db);

    expect(db.createdUserBadges).not.toContain("height_300");
    expect(db.createdUserBadges).not.toContain("objects_1");
  });

  it("is idempotent and does not duplicate existing user badges", async () => {
    const db = createDb({
      participations: [createParticipation()],
      existingBadgeCodes: ["participation_1", "objects_1"],
    });

    await expect(recalculateForTest(db)).resolves.toEqual({
      awardedBadgeCodes: [],
    });
    expect(db.userBadge.create).not.toHaveBeenCalled();
  });

  it("does not affect manual badges", async () => {
    const db = createDb({
      participations: [createParticipation()],
      existingBadgeCodes: ["manual_special"],
    });

    await recalculateForTest(db);

    expect(db.badge.findMany).toHaveBeenCalledWith({
      where: {
        code: {
          in: expect.not.arrayContaining(["manual_special"]) as string[],
        },
      },
      select: {
        id: true,
        code: true,
      },
    });
  });

  it("keeps automatic badge catalog updated", async () => {
    const db = createDb();

    await recalculateForTest(db);

    expect(db.badge.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          code: "participation_1",
          category: BadgeCategory.PARTICIPATION,
          isManual: false,
        }) as object,
        update: expect.objectContaining({
          isManual: false,
        }) as object,
      }),
    );
  });
});
