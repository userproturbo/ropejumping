import { TRPCError } from "@trpc/server";

import { ReportStatus } from "@/generated/prisma/enums";
import {
  hideTargetInputSchema,
  reportActionInputSchema,
  reportCreateInputSchema,
  type ReportTargetType,
} from "@/lib/validation/report";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { publicPostWhere } from "@/server/api/routers/post";
import type { db as database } from "@/server/db";
import { requireModerator } from "@/server/moderation/permissions";

type ReportRouterDb = typeof database;

const reporterInclude = {
  select: {
    id: true,
    name: true,
    email: true,
    image: true,
    profile: {
      select: {
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    },
  },
};

const reportInclude = {
  reporter: reporterInclude,
  reviewedBy: reporterInclude,
};

const ensureProfile = async (db: ReportRouterDb, userId: string) => {
  const profile = await db.profile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Перед отправкой жалобы заполните профиль.",
    });
  }
};

const ensureReportableTarget = async (
  db: ReportRouterDb,
  targetType: ReportTargetType,
  targetId: string,
) => {
  if (targetType === "POST") {
    const post = await db.post.findFirst({
      where: {
        id: targetId,
        ...publicPostWhere,
      },
      select: { id: true },
    });

    if (!post) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Пост не найден.",
      });
    }

    return;
  }

  const comment = await db.comment.findFirst({
    where: {
      id: targetId,
      hiddenAt: null,
      post: publicPostWhere,
    },
    select: { id: true },
  });

  if (!comment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Комментарий не найден.",
    });
  }
};

const reviewReport = async (
  db: ReportRouterDb,
  reportId: string,
  reviewerId: string,
  status: ReportStatus,
) => {
  return db.report.update({
    where: { id: reportId },
    data: {
      status,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    },
    include: reportInclude,
  });
};

export const reportRouter = createTRPCRouter({
  create: protectedProcedure
    .input(reportCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ensureProfile(ctx.db, ctx.session.user.id);
      await ensureReportableTarget(ctx.db, input.targetType, input.targetId);

      return ctx.db.report.create({
        data: {
          reporterId: ctx.session.user.id,
          targetType: input.targetType,
          targetId: input.targetId,
          reason: input.reason,
          details: input.details,
          status: ReportStatus.OPEN,
        },
      });
    }),

  listOpen: protectedProcedure.query(({ ctx }) => {
    requireModerator(ctx);

    return ctx.db.report.findMany({
      where: {
        status: ReportStatus.OPEN,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: reportInclude,
    });
  }),

  listReviewed: protectedProcedure.query(({ ctx }) => {
    requireModerator(ctx);

    return ctx.db.report.findMany({
      where: {
        status: {
          in: [
            ReportStatus.REVIEWED,
            ReportStatus.RESOLVED,
            ReportStatus.DISMISSED,
          ],
        },
      },
      orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
      include: reportInclude,
    });
  }),

  resolve: protectedProcedure
    .input(reportActionInputSchema)
    .mutation(({ ctx, input }) => {
      requireModerator(ctx);

      return reviewReport(
        ctx.db,
        input.reportId,
        ctx.session.user.id,
        ReportStatus.RESOLVED,
      );
    }),

  dismiss: protectedProcedure
    .input(reportActionInputSchema)
    .mutation(({ ctx, input }) => {
      requireModerator(ctx);

      return reviewReport(
        ctx.db,
        input.reportId,
        ctx.session.user.id,
        ReportStatus.DISMISSED,
      );
    }),

  hideTarget: protectedProcedure
    .input(hideTargetInputSchema)
    .mutation(async ({ ctx, input }) => {
      requireModerator(ctx);

      if (input.targetType === "POST") {
        return ctx.db.post.update({
          where: { id: input.targetId },
          data: {
            hiddenAt: new Date(),
          },
        });
      }

      return ctx.db.comment.update({
        where: { id: input.targetId },
        data: {
          hiddenAt: new Date(),
        },
      });
    }),
});
