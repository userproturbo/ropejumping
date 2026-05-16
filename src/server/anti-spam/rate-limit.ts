import { TRPCError } from "@trpc/server";

import type { Prisma } from "@/generated/prisma/client";
import type { db as database } from "@/server/db";

export type RateLimitDb =
  | Pick<
      typeof database,
      "comment" | "objectLike" | "post" | "postLike" | "report"
    >
  | Pick<
      Prisma.TransactionClient,
      "comment" | "objectLike" | "post" | "postLike" | "report"
    >;

type UserActionModel = "post" | "comment" | "like" | "objectLike" | "report";

type Limit = {
  windowMs: number;
  max: number;
  message: string;
};

type AssertUserActionLimitInput = {
  db: RateLimitDb;
  userId: string;
  model: UserActionModel;
  where?: Record<string, unknown>;
  limits: Limit[];
};

const hourMs = 60 * 60 * 1000;
const dayMs = 24 * hourMs;

const countUserActions = async ({
  db,
  model,
  since,
  userId,
  where = {},
}: Omit<AssertUserActionLimitInput, "limits"> & { since: Date }) => {
  if (model === "post") {
    return db.post.count({
      where: {
        ...(where as Prisma.PostWhereInput),
        authorId: userId,
        createdAt: {
          gte: since,
        },
      },
    });
  }

  if (model === "comment") {
    return db.comment.count({
      where: {
        ...(where as Prisma.CommentWhereInput),
        authorId: userId,
        createdAt: {
          gte: since,
        },
      },
    });
  }

  if (model === "like") {
    return db.postLike.count({
      where: {
        ...(where as Prisma.PostLikeWhereInput),
        userId,
        createdAt: {
          gte: since,
        },
      },
    });
  }

  if (model === "objectLike") {
    return db.objectLike.count({
      where: {
        ...(where as Prisma.ObjectLikeWhereInput),
        userId,
        createdAt: {
          gte: since,
        },
      },
    });
  }

  return db.report.count({
    where: {
      ...(where as Prisma.ReportWhereInput),
      reporterId: userId,
      createdAt: {
        gte: since,
      },
    },
  });
};

export const assertUserActionLimit = async ({
  db,
  userId,
  model,
  where,
  limits,
}: AssertUserActionLimitInput) => {
  const now = Date.now();

  for (const limit of limits) {
    const count = await countUserActions({
      db,
      userId,
      model,
      where,
      since: new Date(now - limit.windowMs),
    });

    if (count >= limit.max) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: limit.message,
      });
    }
  }
};

export const assertPostCreateLimit = (db: RateLimitDb, userId: string) =>
  assertUserActionLimit({
    db,
    userId,
    model: "post",
    limits: [
      {
        windowMs: hourMs,
        max: 5,
        message: "Слишком много публикаций за последний час. Попробуйте позже.",
      },
      {
        windowMs: dayMs,
        max: 20,
        message: "Слишком много публикаций за сегодня. Попробуйте позже.",
      },
    ],
  });

export const assertCommentCreateLimit = (db: RateLimitDb, userId: string) =>
  assertUserActionLimit({
    db,
    userId,
    model: "comment",
    limits: [
      {
        windowMs: hourMs,
        max: 30,
        message:
          "Слишком много комментариев за последний час. Попробуйте позже.",
      },
      {
        windowMs: dayMs,
        max: 100,
        message: "Слишком много комментариев за сегодня. Попробуйте позже.",
      },
    ],
  });

export const assertLikeCreateLimit = (db: RateLimitDb, userId: string) =>
  assertUserActionLimit({
    db,
    userId,
    model: "like",
    limits: [
      {
        windowMs: hourMs,
        max: 120,
        message: "Слишком много реакций за последний час. Попробуйте позже.",
      },
    ],
  });

export const assertObjectLikeCreateLimit = (db: RateLimitDb, userId: string) =>
  assertUserActionLimit({
    db,
    userId,
    model: "objectLike",
    limits: [
      {
        windowMs: hourMs,
        max: 120,
        message: "Слишком много реакций за последний час. Попробуйте позже.",
      },
    ],
  });

export const assertReportCreateLimit = (db: RateLimitDb, userId: string) =>
  assertUserActionLimit({
    db,
    userId,
    model: "report",
    limits: [
      {
        windowMs: dayMs,
        max: 10,
        message: "Слишком много жалоб за сегодня. Попробуйте позже.",
      },
    ],
  });
