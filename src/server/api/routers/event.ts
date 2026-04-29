import { TRPCError } from "@trpc/server";

import {
  ApplicationStatus,
  EventStatus,
  ObjectVisibility,
  TeamRole,
  TeamStatus,
} from "@/generated/prisma/enums";
import {
  eventCompletionInputSchema,
  eventCreateInputSchema,
  eventSlugLookupSchema,
  eventUpdateInputSchema,
} from "@/lib/validation/event";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import type { db as database } from "@/server/db";
import {
  canCreateEventForTeam,
  canManageEvent,
} from "@/server/events/permissions";
import { publicEventStatuses } from "@/server/events/statuses";

const manageableTeamRoles = [
  TeamRole.OWNER,
  TeamRole.ADMIN,
  TeamRole.ORGANIZER,
];

const publicTeamStatuses = [TeamStatus.REGULAR, TeamStatus.VERIFIED];

const isUniqueConstraintError = (error: unknown) =>
  error instanceof Error && error.message.includes("Unique constraint failed");

type EventRouterDb = typeof database;

const ensurePublicObject = async ({
  db,
  objectId,
}: {
  db: EventRouterDb;
  objectId: string | null;
}) => {
  if (!objectId) return;

  const object = await db.jumpObject.findFirst({
    where: {
      id: objectId,
      visibility: ObjectVisibility.PUBLIC,
      createdByTeam: {
        is: {
          status: {
            in: publicTeamStatuses,
          },
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!object) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Выберите публичный объект из каталога.",
    });
  }
};

const getEventForManagement = async ({
  db,
  slug,
  userId,
}: {
  db: EventRouterDb;
  slug: string;
  userId: string;
}) => {
  const event = await db.event.findUnique({
    where: { slug },
    select: {
      id: true,
    },
  });

  if (!event) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Мероприятие не найдено.",
    });
  }

  const canManage = await canManageEvent({
    db,
    eventId: event.id,
    userId,
  });

  if (!canManage) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "У вас нет прав на управление этим мероприятием.",
    });
  }

  return event;
};

const ensureCanManageEventBySlug = async ({
  db,
  slug,
  userId,
}: {
  db: EventRouterDb;
  slug: string;
  userId: string;
}) => {
  const event = await db.event.findUnique({
    where: { slug },
    select: {
      id: true,
      status: true,
    },
  });

  if (!event) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Мероприятие не найдено.",
    });
  }

  const canManage = await canManageEvent({
    db,
    eventId: event.id,
    userId,
  });

  if (!canManage) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "У вас нет прав на управление этим мероприятием.",
    });
  }

  return event;
};

export const eventRouter = createTRPCRouter({
  listPublic: publicProcedure.query(({ ctx }) => {
    return ctx.db.event.findMany({
      where: {
        status: {
          in: publicEventStatuses,
        },
        team: {
          status: {
            in: publicTeamStatuses,
          },
        },
      },
      orderBy: {
        startsAt: "asc",
      },
      include: {
        _count: {
          select: {
            applications: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        object: {
          select: {
            id: true,
            name: true,
            slug: true,
            heightMeters: true,
            region: true,
          },
        },
      },
    });
  }),

  getBySlug: publicProcedure
    .input(eventSlugLookupSchema)
    .query(({ ctx, input }) => {
      return ctx.db.event.findFirst({
        where: {
          slug: input,
          status: {
            in: publicEventStatuses,
          },
          team: {
            status: {
              in: publicTeamStatuses,
            },
          },
        },
        include: {
          _count: {
            select: {
              applications: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          object: {
            select: {
              id: true,
              name: true,
              slug: true,
              type: true,
              heightMeters: true,
              region: true,
            },
          },
          participations: {
            orderBy: {
              createdAt: "asc",
            },
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  profile: {
                    select: {
                      username: true,
                      displayName: true,
                      city: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }),

  getMine: protectedProcedure.query(({ ctx }) => {
    return ctx.db.event.findMany({
      where: {
        OR: [
          {
            createdById: ctx.session.user.id,
          },
          {
            team: {
              members: {
                some: {
                  userId: ctx.session.user.id,
                  role: {
                    in: manageableTeamRoles,
                  },
                },
              },
            },
          },
        ],
      },
      orderBy: {
        startsAt: "asc",
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }),

  getForEdit: protectedProcedure
    .input(eventSlugLookupSchema)
    .query(async ({ ctx, input }) => {
      const event = await getEventForManagement({
        db: ctx.db,
        slug: input,
        userId: ctx.session.user.id,
      });

      return ctx.db.event.findUnique({
        where: { id: event.id },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });
    }),

  create: protectedProcedure
    .input(eventCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const canCreate = await canCreateEventForTeam({
        db: ctx.db,
        teamId: input.teamId,
        userId: ctx.session.user.id,
      });

      if (!canCreate) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "У вас нет прав на создание мероприятий для этой команды.",
        });
      }

      const existingEvent = await ctx.db.event.findUnique({
        where: { slug: input.slug },
        select: { id: true },
      });

      if (existingEvent) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Такой slug мероприятия уже занят.",
        });
      }

      await ensurePublicObject({
        db: ctx.db,
        objectId: input.objectId,
      });

      try {
        return await ctx.db.event.create({
          data: {
            ...input,
            createdById: ctx.session.user.id,
            status: EventStatus.PUBLISHED,
          },
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Такой slug мероприятия уже занят.",
          });
        }

        throw error;
      }
    }),

  update: protectedProcedure
    .input(eventUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const event = await getEventForManagement({
        db: ctx.db,
        slug: input.slug,
        userId: ctx.session.user.id,
      });

      await ensurePublicObject({
        db: ctx.db,
        objectId: input.objectId,
      });

      return ctx.db.event.update({
        where: { id: event.id },
        data: {
          title: input.title,
          description: input.description,
          requirementsText: input.requirementsText,
          region: input.region,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          capacity: input.capacity,
          priceText: input.priceText,
          levelText: input.levelText,
          coverImageUrl: input.coverImageUrl,
          objectId: input.objectId,
        },
      });
    }),

  getForCompletion: protectedProcedure
    .input(eventSlugLookupSchema)
    .query(async ({ ctx, input }) => {
      const event = await ensureCanManageEventBySlug({
        db: ctx.db,
        slug: input,
        userId: ctx.session.user.id,
      });

      return ctx.db.event.findUnique({
        where: { id: event.id },
        select: {
          id: true,
          title: true,
          slug: true,
          startsAt: true,
          endsAt: true,
          status: true,
          completedAt: true,
          applications: {
            where: {
              status: ApplicationStatus.ACCEPTED,
            },
            orderBy: {
              createdAt: "asc",
            },
            select: {
              id: true,
              message: true,
              userId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profile: {
                    select: {
                      username: true,
                      displayName: true,
                      city: true,
                      externalExperience: true,
                    },
                  },
                },
              },
            },
          },
          participations: {
            orderBy: {
              createdAt: "asc",
            },
            select: {
              id: true,
              userId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profile: {
                    select: {
                      username: true,
                      displayName: true,
                      city: true,
                      externalExperience: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }),

  complete: protectedProcedure
    .input(eventCompletionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const event = await ensureCanManageEventBySlug({
        db: ctx.db,
        slug: input.eventSlug,
        userId: ctx.session.user.id,
      });

      if (
        event.status === EventStatus.DRAFT ||
        event.status === EventStatus.CANCELLED
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Это мероприятие нельзя завершить.",
        });
      }

      const confirmedUserIds = Array.from(new Set(input.confirmedUserIds));
      const completedAt = new Date();

      return ctx.db.$transaction(async (tx) => {
        const acceptedApplications = await tx.eventApplication.findMany({
          where: {
            eventId: event.id,
            status: ApplicationStatus.ACCEPTED,
          },
          select: {
            userId: true,
          },
        });
        const existingParticipations = await tx.eventParticipation.findMany({
          where: {
            eventId: event.id,
          },
          select: {
            userId: true,
          },
        });

        const acceptedUserIds = new Set(
          acceptedApplications.map((application) => application.userId),
        );
        const validConfirmedUserIds = new Set([
          ...acceptedUserIds,
          ...existingParticipations.map((participation) => participation.userId),
        ]);
        const invalidUserIds = confirmedUserIds.filter(
          (userId) => !validConfirmedUserIds.has(userId),
        );

        if (invalidUserIds.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Можно подтверждать только принятые заявки.",
          });
        }

        await tx.event.update({
          where: { id: event.id },
          data: {
            status: EventStatus.COMPLETED,
            completedAt,
          },
        });

        await Promise.all(
          confirmedUserIds.map((userId) =>
            tx.eventParticipation.upsert({
              where: {
                eventId_userId: {
                  eventId: event.id,
                  userId,
                },
              },
              create: {
                eventId: event.id,
                userId,
                confirmedById: ctx.session.user.id,
                confirmedAt: completedAt,
              },
              update: {
                confirmedById: ctx.session.user.id,
                confirmedAt: completedAt,
              },
            }),
          ),
        );

        await tx.eventApplication.updateMany({
          where: {
            eventId: event.id,
            userId: {
              in: confirmedUserIds,
            },
            status: ApplicationStatus.ACCEPTED,
          },
          data: {
            status: ApplicationStatus.CONFIRMED_PARTICIPATION,
          },
        });

        await tx.eventApplication.updateMany({
          where: {
            eventId: event.id,
            userId: {
              notIn: confirmedUserIds,
            },
            status: ApplicationStatus.ACCEPTED,
          },
          data: {
            status: ApplicationStatus.NO_SHOW,
          },
        });

        return tx.event.findUnique({
          where: { id: event.id },
        });
      });
    }),
});
