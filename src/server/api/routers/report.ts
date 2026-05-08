import { TRPCError } from "@trpc/server";

import {
  NotificationType,
  ObjectVisibility,
  ReportStatus,
  TeamStatus,
} from "@/generated/prisma/enums";
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
import { createNotification } from "@/server/notifications/service";

type ReportRouterDb = typeof database;

const publicTeamStatuses = [TeamStatus.REGULAR, TeamStatus.VERIFIED];

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

const publicReportableObjectWhere = {
  visibility: ObjectVisibility.PUBLIC,
  createdByTeam: {
    is: {
      status: {
        in: publicTeamStatuses,
      },
    },
  },
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

  if (targetType === "OBJECT") {
    const object = await db.jumpObject.findFirst({
      where: {
        id: targetId,
        ...publicReportableObjectWhere,
      },
      select: { id: true },
    });

    if (!object) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Объект не найден.",
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

const addReportTargetPreviews = async <
  TReport extends {
    targetId: string;
    targetType: string;
  },
>(
  db: ReportRouterDb,
  reports: TReport[],
) => {
  const objectIds = reports
    .filter((report) => report.targetType === "OBJECT")
    .map((report) => report.targetId);

  if (objectIds.length === 0) {
    return reports.map((report) => ({
      ...report,
      targetObject: null,
    }));
  }

  const objects = await db.jumpObject.findMany({
    where: {
      id: {
        in: objectIds,
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      visibility: true,
    },
  });
  const objectById = new Map(objects.map((object) => [object.id, object]));

  return reports.map((report) => ({
    ...report,
    targetObject:
      report.targetType === "OBJECT"
        ? (objectById.get(report.targetId) ?? null)
        : null,
  }));
};

const reviewReport = async (
  db: ReportRouterDb,
  reportId: string,
  reviewerId: string,
  status: ReportStatus,
) => {
  return db.$transaction(async (tx) => {
    const report = await tx.report.update({
      where: { id: reportId },
      data: {
        status,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
      include: reportInclude,
    });

    if (status === ReportStatus.RESOLVED) {
      await createNotification(tx, {
        userId: report.reporter.id,
        type: NotificationType.REPORT_RESOLVED,
        title: "Жалоба рассмотрена",
        body: "Ваша жалоба была рассмотрена и отмечена как решённая.",
        href: null,
      });
    }

    if (status === ReportStatus.DISMISSED) {
      await createNotification(tx, {
        userId: report.reporter.id,
        type: NotificationType.REPORT_DISMISSED,
        title: "Жалоба отклонена",
        body: "Ваша жалоба была рассмотрена и отклонена.",
        href: null,
      });
    }

    return report;
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

  listOpen: protectedProcedure.query(async ({ ctx }) => {
    requireModerator(ctx);

    const reports = await ctx.db.report.findMany({
      where: {
        status: ReportStatus.OPEN,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: reportInclude,
    });

    return addReportTargetPreviews(ctx.db, reports);
  }),

  listReviewed: protectedProcedure.query(async ({ ctx }) => {
    requireModerator(ctx);

    const reports = await ctx.db.report.findMany({
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

    return addReportTargetPreviews(ctx.db, reports);
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

      if (input.targetType === "OBJECT") {
        return ctx.db.jumpObject.update({
          where: { id: input.targetId },
          data: {
            visibility: ObjectVisibility.HIDDEN,
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
