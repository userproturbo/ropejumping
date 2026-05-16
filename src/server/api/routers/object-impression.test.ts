import { beforeAll, describe, expect, it, vi } from "vitest";

import { ObjectVisibility } from "@/generated/prisma/enums";
import type { objectImpressionRouter as ObjectImpressionRouter } from "@/server/api/routers/object-impression";
import type { createCallerFactory as CreateCallerFactory } from "@/server/api/trpc";

process.env.DATABASE_URL ??= "postgresql://user:password@localhost:5432/test";

vi.mock("@/server/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  db: {},
}));

const userId = "clx0a1b2c0000abcd1234efgh";
const objectId = "clx0a1b2c0001abcd1234efgh";
const body = "Очень красивое место, удобно смотреть со стороны.";

const createDb = ({
  existingImpression = null,
}: {
  existingImpression?: { id: string; hiddenAt: Date | null } | null;
} = {}) => ({
  profile: {
    findUnique: vi.fn().mockResolvedValue({ id: "profile-id" }),
  },
  objectImpression: {
    count: vi.fn().mockResolvedValue(0),
    findFirst: vi.fn().mockResolvedValue(existingImpression),
    create: vi.fn().mockResolvedValue({ id: "created-id", body }),
    update: vi.fn().mockResolvedValue({ id: existingImpression?.id, body }),
  },
  jumpObject: {
    findFirst: vi.fn().mockResolvedValue({ id: objectId }),
  },
});

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

describe("objectImpressionRouter.create", () => {
  let createCaller: typeof CreateCallerFactory;
  let objectImpressionRouter: typeof ObjectImpressionRouter;

  beforeAll(async () => {
    ({ createCallerFactory: createCaller } = await import("@/server/api/trpc"));
    ({ objectImpressionRouter } = await import(
      "@/server/api/routers/object-impression"
    ));
  });

  it("rejects an existing visible impression", async () => {
    const db = createDb({
      existingImpression: {
        id: "impression-id",
        hiddenAt: null,
      },
    });
    const caller = createCaller(objectImpressionRouter)(createContext(db));

    await expect(caller.create({ objectId, body })).rejects.toMatchObject({
      code: "CONFLICT",
      message:
        "Вы уже оставили впечатление об этом объекте. Его можно отредактировать.",
    });
    expect(db.objectImpression.create).not.toHaveBeenCalled();
    expect(db.objectImpression.update).not.toHaveBeenCalled();
  });

  it("restores a hidden impression instead of creating a duplicate row", async () => {
    const hiddenAt = new Date("2026-05-16T12:00:00.000Z");
    const db = createDb({
      existingImpression: {
        id: "hidden-impression-id",
        hiddenAt,
      },
    });
    const caller = createCaller(objectImpressionRouter)(createContext(db));

    await caller.create({ objectId, body });

    expect(db.objectImpression.findFirst).toHaveBeenCalledWith({
      where: {
        objectId,
        authorId: userId,
      },
      select: {
        id: true,
        hiddenAt: true,
      },
    });
    expect(db.objectImpression.update).toHaveBeenCalledWith({
      where: {
        id: "hidden-impression-id",
      },
      data: {
        body,
        hiddenAt: null,
        editedAt: null,
      },
    });
    expect(db.objectImpression.create).not.toHaveBeenCalled();
  });

  it("creates a new impression when no row exists for the user and object", async () => {
    const db = createDb();
    const caller = createCaller(objectImpressionRouter)(createContext(db));

    await caller.create({ objectId, body });

    expect(db.jumpObject.findFirst).toHaveBeenCalledWith({
      where: {
        id: objectId,
        visibility: ObjectVisibility.PUBLIC,
      },
      select: {
        id: true,
      },
    });
    expect(db.objectImpression.create).toHaveBeenCalledWith({
      data: {
        objectId,
        authorId: userId,
        body,
      },
    });
  });

  it("still maps unique constraint races to the Russian conflict message", async () => {
    const db = createDb();
    db.objectImpression.create.mockRejectedValueOnce(
      new Error(
        "Unique constraint failed on the fields: (`objectId`,`authorId`)",
      ),
    );
    const caller = createCaller(objectImpressionRouter)(createContext(db));

    await expect(caller.create({ objectId, body })).rejects.toMatchObject({
      code: "CONFLICT",
      message:
        "Вы уже оставили впечатление об этом объекте. Его можно отредактировать.",
    });
  });
});
