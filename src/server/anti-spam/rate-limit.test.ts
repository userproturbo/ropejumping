import type { TRPCError } from "@trpc/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  assertPostCreateLimit,
  assertUserActionLimit,
  type RateLimitDb,
} from "@/server/anti-spam/rate-limit";

const userId = "user-1";

const createDb = (count: number) => ({
  comment: {
    count: vi.fn().mockResolvedValue(count),
  },
  post: {
    count: vi.fn().mockResolvedValue(count),
  },
  postLike: {
    count: vi.fn().mockResolvedValue(count),
  },
  report: {
    count: vi.fn().mockResolvedValue(count),
  },
});

const asRateLimitDb = (db: ReturnType<typeof createDb>) =>
  db as unknown as RateLimitDb;

describe("anti-spam rate limits", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("passes when usage is under the limit", async () => {
    const db = createDb(4);

    await expect(
      assertUserActionLimit({
        db: asRateLimitDb(db),
        userId,
        model: "post",
        limits: [
          {
            max: 5,
            message: "Слишком много публикаций.",
            windowMs: 60 * 60 * 1000,
          },
        ],
      }),
    ).resolves.toBeUndefined();
  });

  it("throws when usage is equal to the limit", async () => {
    const db = createDb(5);

    await expect(
      assertUserActionLimit({
        db: asRateLimitDb(db),
        userId,
        model: "post",
        limits: [
          {
            max: 5,
            message: "Слишком много публикаций.",
            windowMs: 60 * 60 * 1000,
          },
        ],
      }),
    ).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
      message: "Слишком много публикаций.",
    } satisfies Partial<TRPCError>);
  });

  it("throws when usage is over the limit", async () => {
    const db = createDb(6);

    await expect(
      assertUserActionLimit({
        db: asRateLimitDb(db),
        userId,
        model: "comment",
        limits: [
          {
            max: 5,
            message: "Слишком много комментариев.",
            windowMs: 60 * 60 * 1000,
          },
        ],
      }),
    ).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
      message: "Слишком много комментариев.",
    } satisfies Partial<TRPCError>);
  });

  it("checks the configured time window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-16T12:00:00.000Z"));
    const db = createDb(0);

    await assertUserActionLimit({
      db: asRateLimitDb(db),
      userId,
      model: "like",
      limits: [
        {
          max: 120,
          message: "Слишком много реакций.",
          windowMs: 60 * 60 * 1000,
        },
      ],
    });

    expect(db.postLike.count).toHaveBeenCalledWith({
      where: {
        createdAt: {
          gte: new Date("2026-05-16T11:00:00.000Z"),
        },
        userId,
      },
    });
  });

  it("uses Russian helper messages", async () => {
    const db = createDb(5);

    await expect(
      assertPostCreateLimit(asRateLimitDb(db), userId),
    ).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
      message: "Слишком много публикаций за последний час. Попробуйте позже.",
    } satisfies Partial<TRPCError>);
  });
});
