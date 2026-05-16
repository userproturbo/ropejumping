import { TRPCError } from "@trpc/server";

import {
  NotificationType,
  ObjectVisibility,
  ReportStatus,
  TeamStatus,
} from "@/generated/prisma/enums";
import {
  hideObjectImpressionInputSchema,
  hideTargetInputSchema,
  reportActionInputSchema,
  reportCreateInputSchema,
  reportListInputSchema,
  type ReportListStatus,
  type ReportTargetType,
} from "@/lib/validation/report";
import { assertReportCreateLimit } from "@/server/anti-spam/rate-limit";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { publicPostWhere } from "@/server/api/routers/post";
import type { db as database } from "@/server/db";
import { requireModerator } from "@/server/moderation/permissions";
import { createNotification } from "@/server/notifications/service";
import { REPORT_TARGET_TYPES } from "@/server/reports/targets";

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
  if (targetType === REPORT_TARGET_TYPES.POST) {
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

  if (targetType === REPORT_TARGET_TYPES.OBJECT) {
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

  if (targetType === REPORT_TARGET_TYPES.OBJECT_IMPRESSION) {
    const impression = await db.objectImpression.findFirst({
      where: {
        id: targetId,
        hiddenAt: null,
        object: publicReportableObjectWhere,
      },
      select: { id: true },
    });

    if (!impression) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Объект жалобы не найден.",
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
    .filter((report) => report.targetType === REPORT_TARGET_TYPES.OBJECT)
    .map((report) => report.targetId);
  const impressionIds = reports
    .filter(
      (report) => report.targetType === REPORT_TARGET_TYPES.OBJECT_IMPRESSION,
    )
    .map((report) => report.targetId);

  if (objectIds.length === 0 && impressionIds.length === 0) {
    return reports.map((report) => ({
      ...report,
      targetObject: null,
      targetObjectImpression: null,
    }));
  }

  const [objects, impressions] = await Promise.all([
    objectIds.length > 0
      ? db.jumpObject.findMany({
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
        })
      : Promise.resolve([]),
    impressionIds.length > 0
      ? db.objectImpression.findMany({
          where: {
            id: {
              in: impressionIds,
            },
          },
          select: {
            id: true,
            body: true,
            hiddenAt: true,
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                profile: {
                  select: {
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            object: {
              select: {
                id: true,
                name: true,
                slug: true,
                visibility: true,
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);
  const objectById = new Map(objects.map((object) => [object.id, object]));
  const impressionById = new Map(
    impressions.map((impression) => [impression.id, impression]),
  );

  return reports.map((report) => ({
    ...report,
    targetObject:
      report.targetType === REPORT_TARGET_TYPES.OBJECT
        ? (objectById.get(report.targetId) ?? null)
        : null,
    targetObjectImpression:
      report.targetType === REPORT_TARGET_TYPES.OBJECT_IMPRESSION
        ? (impressionById.get(report.targetId) ?? null)
        : null,
  }));
};

type ReviewReportDb = Pick<ReportRouterDb, "notification" | "report">;

const reviewReportRecord = async (
  db: ReviewReportDb,
  reportId: string,
  reviewerId: string,
  status: ReportStatus,
) => {
  const report = await db.report.update({
    where: { id: reportId },
    data: {
      status,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    },
    include: reportInclude,
  });

  if (status === ReportStatus.RESOLVED) {
    await createNotification(db, {
      userId: report.reporter.id,
      type: NotificationType.REPORT_RESOLVED,
      title: "Жалоба рассмотрена",
      body: "Ваша жалоба была рассмотрена и отмечена как решённая.",
      href: null,
    });
  }

  if (status === ReportStatus.DISMISSED) {
    await createNotification(db, {
      userId: report.reporter.id,
      type: NotificationType.REPORT_DISMISSED,
      title: "Жалоба отклонена",
      body: "Ваша жалоба была рассмотрена и отклонена.",
      href: null,
    });
  }

  return report;
};

const hideObjectImpression = async (
  db: ReportRouterDb,
  input: {
    impressionId: string;
    reportId?: string;
    reviewerId: string;
  },
) => {
  await db.$transaction(async (tx) => {
    await tx.objectImpression.update({
      where: {
        id: input.impressionId,
      },
      data: {
        hiddenAt: new Date(),
      },
    });

    if (input.reportId) {
      await reviewReportRecord(
        tx,
        input.reportId,
        input.reviewerId,
        ReportStatus.RESOLVED,
      );
    }
  });

  return { success: true };
};

const reviewReport = async (
  db: ReportRouterDb,
  reportId: string,
  reviewerId: string,
  status: ReportStatus,
) => {
  return db.$transaction(async (tx) => {
    return reviewReportRecord(tx, reportId, reviewerId, status);
  });
};

const getReportStatusWhere = (
  status: ReportListStatus,
): ReportStatus | { in: ReportStatus[] } | undefined => {
  if (status === "OPEN") return ReportStatus.OPEN;
  if (status === "RESOLVED") return ReportStatus.RESOLVED;
  if (status === "DISMISSED") return ReportStatus.DISMISSED;
  if (status === "REVIEWED") {
    return {
      in: [ReportStatus.REVIEWED, ReportStatus.RESOLVED, ReportStatus.DISMISSED],
    };
  }

  return undefined;
};

const getReportOrderBy = (status: ReportListStatus) => {
  if (status === "OPEN") {
    return {
      createdAt: "asc" as const,
    };
  }

  if (status === "ALL") {
    return {
      createdAt: "desc" as const,
    };
  }

  return [{ reviewedAt: "desc" as const }, { createdAt: "desc" as const }];
};

export const reportRouter = createTRPCRouter({
  create: protectedProcedure
    .input(reportCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ensureProfile(ctx.db, ctx.session.user.id);
      await ensureReportableTarget(ctx.db, input.targetType, input.targetId);
      await assertReportCreateLimit(ctx.db, ctx.session.user.id);

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

  listForModeration: protectedProcedure
    .input(reportListInputSchema.optional())
    .query(async ({ ctx, input }) => {
      requireModerator(ctx);

      const status = input?.status ?? "OPEN";
      const targetType = input?.targetType;
      const statusWhere = getReportStatusWhere(status);
      const where = {
        ...(statusWhere ? { status: statusWhere } : {}),
        ...(targetType ? { targetType } : {}),
      };

      const [reports, open, reviewed, resolved, dismissed, all] =
        await Promise.all([
          ctx.db.report.findMany({
            where,
            orderBy: getReportOrderBy(status),
            include: reportInclude,
          }),
          ctx.db.report.count({
            where: {
              status: ReportStatus.OPEN,
            },
          }),
          ctx.db.report.count({
            where: {
              status: {
                in: [
                  ReportStatus.REVIEWED,
                  ReportStatus.RESOLVED,
                  ReportStatus.DISMISSED,
                ],
              },
            },
          }),
          ctx.db.report.count({
            where: {
              status: ReportStatus.RESOLVED,
            },
          }),
          ctx.db.report.count({
            where: {
              status: ReportStatus.DISMISSED,
            },
          }),
          ctx.db.report.count(),
        ]);

      return {
        reports: await addReportTargetPreviews(ctx.db, reports),
        filters: {
          status,
          targetType: targetType ?? "",
        },
        counts: {
          open,
          reviewed,
          resolved,
          dismissed,
          all,
        },
      };
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

      if (input.targetType === REPORT_TARGET_TYPES.POST) {
        return ctx.db.post.update({
          where: { id: input.targetId },
          data: {
            hiddenAt: new Date(),
          },
        });
      }

      if (input.targetType === REPORT_TARGET_TYPES.OBJECT) {
        return ctx.db.jumpObject.update({
          where: { id: input.targetId },
          data: {
            visibility: ObjectVisibility.HIDDEN,
          },
        });
      }

      if (input.targetType === REPORT_TARGET_TYPES.OBJECT_IMPRESSION) {
        return hideObjectImpression(ctx.db, {
          impressionId: input.targetId,
          reviewerId: ctx.session.user.id,
        });
      }

      return ctx.db.comment.update({
        where: { id: input.targetId },
        data: {
          hiddenAt: new Date(),
        },
      });
    }),

  hideObjectImpression: protectedProcedure
    .input(hideObjectImpressionInputSchema)
    .mutation(async ({ ctx, input }) => {
      requireModerator(ctx);

      return hideObjectImpression(ctx.db, {
        impressionId: input.impressionId,
        reportId: input.reportId,
        reviewerId: ctx.session.user.id,
      });
    }),
});
