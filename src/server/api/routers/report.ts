import { TRPCError } from "@trpc/server";

import {
  NotificationType,
  ObjectVisibility,
  ReportStatus,
  TeamStatus,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { moderationSafetyKeywords } from "@/lib/moderation/safety-keywords";
import {
  hideChatMessageInputSchema,
  hideEventLogisticsPostInputSchema,
  hideObjectImpressionInputSchema,
  hideTargetInputSchema,
  reportActionInputSchema,
  reportCreateInputSchema,
  reportListInputSchema,
  type ReportListSort,
  type ReportListStatus,
  type ReportTargetType,
} from "@/lib/validation/report";
import { assertReportCreateLimit } from "@/server/anti-spam/rate-limit";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { publicPostWhere } from "@/server/api/routers/post";
import type { db as database } from "@/server/db";
import { assertCanAccessEventChat } from "@/server/events/chat-permissions";
import { requireModerator } from "@/server/moderation/permissions";
import { createNotification } from "@/server/notifications/service";
import { REPORT_TARGET_TYPES } from "@/server/reports/targets";
import { assertCanAccessTeamChat } from "@/server/teams/chat-permissions";

type ReportRouterDb = typeof database;

const publicTeamStatuses = [TeamStatus.REGULAR, TeamStatus.VERIFIED];

const reporterInclude = {
  select: {
    id: true,
    name: true,
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
  reporterId: string,
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

  if (targetType === REPORT_TARGET_TYPES.EVENT_CHAT_MESSAGE) {
    const message = await db.eventChatMessage.findFirst({
      where: {
        id: targetId,
        deletedAt: null,
        hiddenAt: null,
      },
      select: {
        id: true,
        eventId: true,
      },
    });

    if (!message) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Объект жалобы не найден.",
      });
    }

    try {
      await assertCanAccessEventChat({
        db,
        eventId: message.eventId,
        userId: reporterId,
      });
    } catch (error) {
      if (!(error instanceof TRPCError)) {
        throw error;
      }

      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Объект жалобы не найден.",
      });
    }

    return;
  }

  if (targetType === REPORT_TARGET_TYPES.EVENT_LOGISTICS_POST) {
    const post = await db.eventLogisticsPost.findFirst({
      where: {
        id: targetId,
        hiddenAt: null,
      },
      select: {
        id: true,
        eventId: true,
      },
    });

    if (!post) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Объект жалобы не найден.",
      });
    }

    try {
      await assertCanAccessEventChat({
        db,
        eventId: post.eventId,
        userId: reporterId,
      });
    } catch (error) {
      if (!(error instanceof TRPCError)) {
        throw error;
      }

      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Объект жалобы не найден.",
      });
    }

    return;
  }

  if (targetType === REPORT_TARGET_TYPES.TEAM_CHAT_MESSAGE) {
    const message = await db.teamChatMessage.findFirst({
      where: {
        id: targetId,
        deletedAt: null,
        hiddenAt: null,
      },
      select: {
        id: true,
        teamId: true,
      },
    });

    if (!message) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Объект жалобы не найден.",
      });
    }

    try {
      await assertCanAccessTeamChat({
        db,
        teamId: message.teamId,
        userId: reporterId,
      });
    } catch (error) {
      if (!(error instanceof TRPCError)) {
        throw error;
      }

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
  const eventChatMessageIds = reports
    .filter(
      (report) => report.targetType === REPORT_TARGET_TYPES.EVENT_CHAT_MESSAGE,
    )
    .map((report) => report.targetId);
  const eventLogisticsPostIds = reports
    .filter(
      (report) =>
        report.targetType === REPORT_TARGET_TYPES.EVENT_LOGISTICS_POST,
    )
    .map((report) => report.targetId);
  const teamChatMessageIds = reports
    .filter(
      (report) => report.targetType === REPORT_TARGET_TYPES.TEAM_CHAT_MESSAGE,
    )
    .map((report) => report.targetId);

  if (
    objectIds.length === 0 &&
    impressionIds.length === 0 &&
    eventChatMessageIds.length === 0 &&
    eventLogisticsPostIds.length === 0 &&
    teamChatMessageIds.length === 0
  ) {
    return reports.map((report) => ({
      ...report,
      targetObject: null,
      targetObjectImpression: null,
      targetEventChatMessage: null,
      targetEventLogisticsPost: null,
      targetTeamChatMessage: null,
    }));
  }

  const [
    objects,
    impressions,
    eventChatMessages,
    eventLogisticsPosts,
    teamChatMessages,
  ] = await Promise.all([
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
    eventChatMessageIds.length > 0
      ? db.eventChatMessage.findMany({
          where: {
            id: {
              in: eventChatMessageIds,
            },
          },
          select: {
            id: true,
            body: true,
            hiddenAt: true,
            deletedAt: true,
            author: {
              select: {
                id: true,
                name: true,
                profile: {
                  select: {
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            event: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    eventLogisticsPostIds.length > 0
      ? db.eventLogisticsPost.findMany({
          where: {
            id: {
              in: eventLogisticsPostIds,
            },
          },
          select: {
            id: true,
            type: true,
            body: true,
            hiddenAt: true,
            author: {
              select: {
                id: true,
                name: true,
                profile: {
                  select: {
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            event: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    teamChatMessageIds.length > 0
      ? db.teamChatMessage.findMany({
          where: {
            id: {
              in: teamChatMessageIds,
            },
          },
          select: {
            id: true,
            body: true,
            hiddenAt: true,
            deletedAt: true,
            author: {
              select: {
                id: true,
                name: true,
                profile: {
                  select: {
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            team: {
              select: {
                id: true,
                name: true,
                slug: true,
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
  const eventChatMessageById = new Map(
    eventChatMessages.map((message) => [message.id, message]),
  );
  const eventLogisticsPostById = new Map(
    eventLogisticsPosts.map((post) => [post.id, post]),
  );
  const teamChatMessageById = new Map(
    teamChatMessages.map((message) => [message.id, message]),
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
    targetEventChatMessage:
      report.targetType === REPORT_TARGET_TYPES.EVENT_CHAT_MESSAGE
        ? (eventChatMessageById.get(report.targetId) ?? null)
        : null,
    targetEventLogisticsPost:
      report.targetType === REPORT_TARGET_TYPES.EVENT_LOGISTICS_POST
        ? (eventLogisticsPostById.get(report.targetId) ?? null)
        : null,
    targetTeamChatMessage:
      report.targetType === REPORT_TARGET_TYPES.TEAM_CHAT_MESSAGE
        ? (teamChatMessageById.get(report.targetId) ?? null)
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

const hideEventChatMessage = async (
  db: ReportRouterDb,
  input: {
    messageId: string;
    reportId?: string;
    reviewerId: string;
  },
) => {
  const message = await db.eventChatMessage.findUnique({
    where: { id: input.messageId },
    select: { id: true },
  });

  if (!message) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Сообщение не найдено.",
    });
  }

  await db.$transaction(async (tx) => {
    await tx.eventChatMessage.update({
      where: {
        id: input.messageId,
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

const hideTeamChatMessage = async (
  db: ReportRouterDb,
  input: {
    messageId: string;
    reportId?: string;
    reviewerId: string;
  },
) => {
  const message = await db.teamChatMessage.findUnique({
    where: { id: input.messageId },
    select: { id: true },
  });

  if (!message) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Сообщение не найдено.",
    });
  }

  await db.$transaction(async (tx) => {
    await tx.teamChatMessage.update({
      where: {
        id: input.messageId,
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

const hideEventLogisticsPost = async (
  db: ReportRouterDb,
  input: {
    postId: string;
    reportId?: string;
    reviewerId: string;
  },
) => {
  const post = await db.eventLogisticsPost.findUnique({
    where: { id: input.postId },
    select: { id: true },
  });

  if (!post) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Запись не найдена.",
    });
  }

  await db.$transaction(async (tx) => {
    await tx.eventLogisticsPost.update({
      where: {
        id: input.postId,
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
      in: [
        ReportStatus.REVIEWED,
        ReportStatus.RESOLVED,
        ReportStatus.DISMISSED,
      ],
    };
  }

  return undefined;
};

const getReportOrderBy = (sort: ReportListSort) => ({
  createdAt: sort === "createdAtAsc" ? ("asc" as const) : ("desc" as const),
});

const getReportSafetyWhere = (): Prisma.ReportWhereInput => ({
  OR: moderationSafetyKeywords.flatMap((keyword) => [
    {
      reason: {
        contains: keyword,
        mode: "insensitive" as const,
      },
    },
    {
      details: {
        contains: keyword,
        mode: "insensitive" as const,
      },
    },
  ]),
});

export const reportRouter = createTRPCRouter({
  create: protectedProcedure
    .input(reportCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ensureProfile(ctx.db, ctx.session.user.id);
      await ensureReportableTarget(
        ctx.db,
        input.targetType,
        input.targetId,
        ctx.session.user.id,
      );
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
      const safety = input?.safety ?? false;
      const sort = input?.sort ?? "createdAtDesc";
      const statusWhere = getReportStatusWhere(status);
      const where: Prisma.ReportWhereInput = {
        ...(statusWhere ? { status: statusWhere } : {}),
        ...(targetType ? { targetType } : {}),
        ...(safety ? getReportSafetyWhere() : {}),
      };

      const [reports, open, reviewed, resolved, dismissed, all] =
        await Promise.all([
          ctx.db.report.findMany({
            where,
            orderBy: getReportOrderBy(sort),
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
          safety,
          sort,
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

      if (input.targetType === REPORT_TARGET_TYPES.EVENT_CHAT_MESSAGE) {
        return hideEventChatMessage(ctx.db, {
          messageId: input.targetId,
          reviewerId: ctx.session.user.id,
        });
      }

      if (input.targetType === REPORT_TARGET_TYPES.EVENT_LOGISTICS_POST) {
        return hideEventLogisticsPost(ctx.db, {
          postId: input.targetId,
          reviewerId: ctx.session.user.id,
        });
      }

      if (input.targetType === REPORT_TARGET_TYPES.TEAM_CHAT_MESSAGE) {
        return hideTeamChatMessage(ctx.db, {
          messageId: input.targetId,
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

  hideEventChatMessage: protectedProcedure
    .input(hideChatMessageInputSchema)
    .mutation(async ({ ctx, input }) => {
      requireModerator(ctx);

      return hideEventChatMessage(ctx.db, {
        messageId: input.messageId,
        reportId: input.reportId,
        reviewerId: ctx.session.user.id,
      });
    }),

  hideEventLogisticsPost: protectedProcedure
    .input(hideEventLogisticsPostInputSchema)
    .mutation(async ({ ctx, input }) => {
      requireModerator(ctx);

      return hideEventLogisticsPost(ctx.db, {
        postId: input.postId,
        reportId: input.reportId,
        reviewerId: ctx.session.user.id,
      });
    }),

  hideTeamChatMessage: protectedProcedure
    .input(hideChatMessageInputSchema)
    .mutation(async ({ ctx, input }) => {
      requireModerator(ctx);

      return hideTeamChatMessage(ctx.db, {
        messageId: input.messageId,
        reportId: input.reportId,
        reviewerId: ctx.session.user.id,
      });
    }),
});
