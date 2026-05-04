import { TRPCError } from "@trpc/server";

import {
  ApplicationStatus,
  TeamStatus,
} from "@/generated/prisma/enums";
import {
  applicationCancelInputSchema,
  applicationCreateInputSchema,
  applicationDecisionInputSchema,
  applicationEventSlugInputSchema,
} from "@/lib/validation/application";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { db as database } from "@/server/db";
import { canManageEvent } from "@/server/events/permissions";
import { applicationOpenEventStatuses } from "@/server/events/statuses";

const publicTeamStatuses = [TeamStatus.REGULAR, TeamStatus.VERIFIED];

const cancellableApplicationStatuses: ApplicationStatus[] = [
  ApplicationStatus.PENDING,
  ApplicationStatus.ACCEPTED,
];

const isUniqueConstraintError = (error: unknown) =>
  error instanceof Error && error.message.includes("Unique constraint failed");

type ApplicationRouterDb = typeof database;

const ensureCanManageApplicationEvent = async ({
  applicationId,
  db,
  userId,
}: {
  applicationId: string;
  db: ApplicationRouterDb;
  userId: string;
}) => {
  const application = await db.eventApplication.findUnique({
    where: { id: applicationId },
    select: {
      eventId: true,
      status: true,
    },
  });

  if (!application) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Заявка не найдена.",
    });
  }

  const canManage = await canManageEvent({
    db,
    eventId: application.eventId,
    userId,
  });

  if (!canManage) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "У вас нет прав на управление заявками этого мероприятия.",
    });
  }

  if (application.status !== ApplicationStatus.PENDING) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Эту заявку уже нельзя изменить.",
    });
  }

  return application;
};

export const applicationRouter = createTRPCRouter({
  getMine: protectedProcedure.query(({ ctx }) => {
    return ctx.db.eventApplication.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startsAt: true,
            endsAt: true,
            status: true,
            team: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });
  }),

  getMineForEvent: protectedProcedure
    .input(applicationEventSlugInputSchema)
    .query(({ ctx, input }) => {
      return ctx.db.eventApplication.findFirst({
        where: {
          userId: ctx.session.user.id,
          event: {
            slug: input,
          },
        },
      });
    }),

  submit: protectedProcedure
    .input(applicationCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.db.event.findFirst({
        where: {
          slug: input.eventSlug,
          status: {
            in: applicationOpenEventStatuses,
          },
          team: {
            status: {
              in: publicTeamStatuses,
            },
          },
        },
        select: {
          id: true,
          createdById: true,
        },
      });

      if (!event) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Подача заявок на это мероприятие сейчас недоступна.",
        });
      }

      const canManage = await canManageEvent({
        db: ctx.db,
        eventId: event.id,
        userId: ctx.session.user.id,
      });

      if (event.createdById === ctx.session.user.id || canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Организаторы не могут подавать заявку на свое мероприятие.",
        });
      }

      const profile = await ctx.db.profile.findUnique({
        where: { userId: ctx.session.user.id },
        select: { id: true },
      });

      if (!profile) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Перед подачей заявки заполните профиль.",
        });
      }

      try {
        return await ctx.db.eventApplication.create({
          data: {
            eventId: event.id,
            userId: ctx.session.user.id,
            message: input.message,
            status: ApplicationStatus.PENDING,
          },
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Вы уже подали заявку на это мероприятие.",
          });
        }

        throw error;
      }
    }),

  cancelMine: protectedProcedure
    .input(applicationCancelInputSchema)
    .mutation(async ({ ctx, input }) => {
      const application = await ctx.db.eventApplication.findUnique({
        where: { id: input.applicationId },
        select: {
          id: true,
          userId: true,
          status: true,
        },
      });

      if (application?.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Заявка не найдена.",
        });
      }

      if (!cancellableApplicationStatuses.includes(application.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Эту заявку уже нельзя отменить.",
        });
      }

      return ctx.db.eventApplication.update({
        where: { id: application.id },
        data: {
          status: ApplicationStatus.CANCELLED_BY_USER,
        },
      });
    }),

  getForEventManagement: protectedProcedure
    .input(applicationEventSlugInputSchema)
    .query(async ({ ctx, input }) => {
      const event = await ctx.db.event.findUnique({
        where: { slug: input },
        select: {
          id: true,
          title: true,
        },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Мероприятие не найдено.",
        });
      }

      const canManage = await canManageEvent({
        db: ctx.db,
        eventId: event.id,
        userId: ctx.session.user.id,
      });

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "У вас нет прав на управление заявками этого мероприятия.",
        });
      }

      const applications = await ctx.db.eventApplication.findMany({
        where: {
          eventId: event.id,
        },
        orderBy: {
          createdAt: "asc",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              profile: {
                select: {
                  username: true,
                  displayName: true,
                  city: true,
                  avatarUrl: true,
                  externalExperience: true,
                },
              },
            },
          },
        },
      });

      return {
        event,
        applications,
      };
    }),

  accept: protectedProcedure
    .input(applicationDecisionInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ensureCanManageApplicationEvent({
        applicationId: input.applicationId,
        db: ctx.db,
        userId: ctx.session.user.id,
      });

      return ctx.db.eventApplication.update({
        where: { id: input.applicationId },
        data: {
          status: ApplicationStatus.ACCEPTED,
          decidedById: ctx.session.user.id,
          decidedAt: new Date(),
          organizerNote: input.organizerNote,
        },
      });
    }),

  reject: protectedProcedure
    .input(applicationDecisionInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ensureCanManageApplicationEvent({
        applicationId: input.applicationId,
        db: ctx.db,
        userId: ctx.session.user.id,
      });

      return ctx.db.eventApplication.update({
        where: { id: input.applicationId },
        data: {
          status: ApplicationStatus.REJECTED,
          decidedById: ctx.session.user.id,
          decidedAt: new Date(),
          organizerNote: input.organizerNote,
        },
      });
    }),
});
