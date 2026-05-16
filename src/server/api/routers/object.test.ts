import { beforeAll, describe, expect, it, vi } from "vitest";

import { ObjectType } from "@/generated/prisma/enums";
import type { objectRouter as ObjectRouter } from "@/server/api/routers/object";
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
const objectId = "clx0a1b2c0001abcd1234efgh";
const otherUserId = "clx0a1b2c0002abcd1234efgh";

const createImpression = (id: string, authorId: string) => ({
  id,
  body: `Впечатление пользователя ${authorId} о красивом объекте.`,
  createdAt: new Date("2026-05-16T10:00:00.000Z"),
  editedAt: null,
  authorId,
  author: {
    profile: {
      username: `user-${authorId.slice(-4)}`,
      displayName: null,
      avatarUrl: null,
      avatarMedia: null,
    },
  },
});

type ObjectFindFirstInput = {
  include: {
    impressions: {
      take: number;
      orderBy: { createdAt: "desc" };
      where: { hiddenAt: null };
    };
  };
};

type MyImpressionFindFirstInput = {
  where: {
    objectId: string;
    authorId: string;
    hiddenAt: null;
  };
  select: Record<string, unknown>;
};

const createDb = () => {
  const publicImpression = createImpression("latest-impression-id", otherUserId);
  const myImpression = createImpression("my-older-impression-id", userId);

  return {
    jumpObject: {
      findFirst: vi.fn().mockResolvedValue({
        id: objectId,
        name: "Мост",
        slug: "bridge-object",
        type: ObjectType.BRIDGE,
        heightMeters: 50,
        region: "Москва",
        description: null,
        coverImageUrl: null,
        coverMediaId: null,
        createdById: otherUserId,
        createdByTeamId: null,
        createdAt: new Date("2026-05-16T09:00:00.000Z"),
        updatedAt: new Date("2026-05-16T09:00:00.000Z"),
        coverMedia: null,
        followers: [],
        likes: [],
        impressions: [publicImpression],
        _count: {
          followers: 0,
          likes: 0,
          impressions: 21,
        },
        galleryImages: [],
        createdByTeam: null,
        events: [],
      }),
    },
    post: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    objectImpression: {
      findFirst: vi.fn().mockResolvedValue(myImpression),
    },
  };
};

const createContext = (db: ReturnType<typeof createDb>) =>
  ({
    db,
    session: {
      user: {
        id: userId,
      },
    },
    headers: new Headers(),
  }) as never;

describe("objectRouter.getBySlug", () => {
  let createCaller: typeof CreateCallerFactory;
  let objectRouter: typeof ObjectRouter;

  beforeAll(async () => {
    ({ createCallerFactory: createCaller } = await import("@/server/api/trpc"));
    ({ objectRouter } = await import("@/server/api/routers/object"));
  });

  it("loads myImpression separately from the latest public impressions list", async () => {
    const db = createDb();
    const caller = createCaller(objectRouter)(createContext(db));

    const result = await caller.getBySlug("bridge-object");
    const jumpObjectFindFirstInput = db.jumpObject.findFirst.mock
      .calls[0]?.[0] as ObjectFindFirstInput;
    const myImpressionFindFirstInput = db.objectImpression.findFirst.mock
      .calls[0]?.[0] as MyImpressionFindFirstInput;

    expect(jumpObjectFindFirstInput.include.impressions).toMatchObject({
      take: 20,
      orderBy: {
        createdAt: "desc",
      },
      where: {
        hiddenAt: null,
      },
    });
    expect(myImpressionFindFirstInput.where).toEqual({
      objectId,
      authorId: userId,
      hiddenAt: null,
    });
    expect(myImpressionFindFirstInput.select).toMatchObject({
      id: true,
      body: true,
      authorId: true,
    });
    expect(result?.impressions).toHaveLength(1);
    expect(result?.impressions[0]?.authorId).toBe(otherUserId);
    expect(result?.myImpression?.id).toBe("my-older-impression-id");
  });
});
