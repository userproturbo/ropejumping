import { beforeAll, describe, expect, it, vi } from "vitest";

import { RadioMood } from "@/generated/prisma/enums";
import type { radioRouter as RadioRouter } from "@/server/api/routers/radio";
import type { createCallerFactory as CreateCallerFactory } from "@/server/api/trpc";

process.env.DATABASE_URL ??= "postgresql://user:password@localhost:5432/test";
process.env.MODERATOR_EMAILS = "moderator@example.com";

vi.mock("@/server/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  db: {},
}));

const activeRelaxTrack = {
  id: "clx0a1b2c0000abcd1234efgh",
  title: "Bridge Morning",
  artist: "DJ Rope",
  mood: RadioMood.RELAX,
  audioUrl: "https://example.com/relax.mp3",
  coverUrl: null,
  isActive: true,
  sortOrder: 0,
  createdAt: new Date("2026-05-01T10:00:00.000Z"),
  updatedAt: new Date("2026-05-01T10:00:00.000Z"),
};

const disabledFunTrack = {
  ...activeRelaxTrack,
  id: "clx0a1b2c0001abcd1234efgh",
  title: "Hidden Fun",
  mood: RadioMood.FUN,
  audioUrl: "https://example.com/fun.mp3",
  isActive: false,
};

const expectedRadioTrackSelect = {
  id: true,
  title: true,
  artist: true,
  mood: true,
  audioUrl: true,
  coverUrl: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
};

const createDb = () => ({
  radioTrack: {
    findMany: vi.fn().mockResolvedValue([activeRelaxTrack]),
    create: vi.fn().mockResolvedValue(activeRelaxTrack),
    update: vi.fn().mockResolvedValue({ ...activeRelaxTrack, isActive: false }),
  },
});

const createContext = ({
  db,
  email,
}: {
  db: ReturnType<typeof createDb>;
  email?: string | null;
}) =>
  ({
    db,
    session: email
      ? {
          user: {
            id: "user-id",
            email,
          },
        }
      : null,
    headers: new Headers(),
  }) as never;

describe("radioRouter", () => {
  let createCaller: typeof CreateCallerFactory;
  let radioRouter: typeof RadioRouter;

  beforeAll(async () => {
    ({ createCallerFactory: createCaller } = await import("@/server/api/trpc"));
    ({ radioRouter } = await import("@/server/api/routers/radio"));
  });

  it("returns only active tracks for the public player", async () => {
    const db = createDb();
    const caller = createCaller(radioRouter)(createContext({ db }));

    await caller.listActive();

    expect(db.radioTrack.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: expectedRadioTrackSelect,
    });
  });

  it("filters active tracks by mood", async () => {
    const db = createDb();
    const caller = createCaller(radioRouter)(createContext({ db }));

    await caller.listActive(RadioMood.RELAX);

    expect(db.radioTrack.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
        mood: RadioMood.RELAX,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: expectedRadioTrackSelect,
    });
  });

  it("allows moderators to create tracks", async () => {
    const db = createDb();
    const caller = createCaller(radioRouter)(
      createContext({ db, email: "moderator@example.com" }),
    );

    await caller.create({
      title: "Bridge Morning",
      artist: "DJ Rope",
      mood: RadioMood.RELAX,
      audioUrl: "https://example.com/relax.mp3",
      coverUrl: "",
      sortOrder: 0,
      isActive: true,
    });

    expect(db.radioTrack.create).toHaveBeenCalledWith({
      data: {
        title: "Bridge Morning",
        artist: "DJ Rope",
        mood: RadioMood.RELAX,
        audioUrl: "https://example.com/relax.mp3",
        coverUrl: null,
        sortOrder: 0,
        isActive: true,
      },
      select: expectedRadioTrackSelect,
    });
  });

  it("rejects non-moderators creating tracks", async () => {
    const db = createDb();
    const caller = createCaller(radioRouter)(
      createContext({ db, email: "user@example.com" }),
    );

    await expect(
      caller.create({
        title: "Bridge Morning",
        artist: "",
        mood: RadioMood.RELAX,
        audioUrl: "https://example.com/relax.mp3",
        coverUrl: "",
        sortOrder: 0,
        isActive: true,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(db.radioTrack.create).not.toHaveBeenCalled();
  });

  it("does not return disabled tracks to the player", async () => {
    const db = createDb();
    db.radioTrack.findMany.mockResolvedValueOnce([activeRelaxTrack]);
    const caller = createCaller(radioRouter)(createContext({ db }));
    const tracks = await caller.listActive();

    expect(tracks).not.toContainEqual(disabledFunTrack);
    expect(tracks).toEqual([activeRelaxTrack]);
  });
});
