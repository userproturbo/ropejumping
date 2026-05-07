import { TRPCError } from "@trpc/server";

import {
  ApplicationStatus,
  EventStatus,
  ObjectVisibility,
  TeamRole,
  TeamStatus,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import {
  eventCompletionInputSchema,
  eventCreateInputSchema,
  eventCrewMemberInputSchema,
  eventCrewMemberRemoveInputSchema,
  eventPublicListInputSchema,
  eventSlugLookupSchema,
  eventStatusUpdateInputSchema,
  eventUpdateInputSchema,
} from "@/lib/validation/event";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import type { db as database } from "@/server/db";
import { recalculateUserBadges } from "@/server/badges/service";
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
type EventForOrdering = {
  startsAt: Date;
  status: EventStatus;
};

const upcomingPublicEventStatuses = [
  EventStatus.PUBLISHED,
  EventStatus.APPLICATIONS_OPEN,
  EventStatus.FULL,
  EventStatus.APPLICATIONS_CLOSED,
  EventStatus.POSTPONED,
];

const publicEventStatusGroups = {
  all: publicEventStatuses,
  upcoming: upcomingPublicEventStatuses,
  "applications-open": [EventStatus.APPLICATIONS_OPEN],
  completed: [EventStatus.COMPLETED],
  archived: [EventStatus.ARCHIVED],
  cancelled: [EventStatus.CANCELLED],
} satisfies Record<string, EventStatus[]>;

const publicEventStatusFilterValues = new Set<string>([
  ...Object.keys(publicEventStatusGroups),
  ...publicEventStatuses,
]);

const directPublicEventStatuses = new Set<EventStatus>(publicEventStatuses);

const eventStatusOrderGroups = {
  [EventStatus.APPLICATIONS_OPEN]: 1,
  [EventStatus.PUBLISHED]: 2,
  [EventStatus.FULL]: 3,
  [EventStatus.APPLICATIONS_CLOSED]: 4,
  [EventStatus.POSTPONED]: 5,
  [EventStatus.CANCELLED]: 6,
  [EventStatus.COMPLETED]: 7,
  [EventStatus.ARCHIVED]: 8,
  [EventStatus.DRAFT]: 9,
} satisfies Record<EventStatus, number>;

const activeDateOrderedStatuses = new Set<EventStatus>(upcomingPublicEventStatuses);
const newestFirstDateOrderedStatuses = new Set<EventStatus>([
  EventStatus.CANCELLED,
  EventStatus.COMPLETED,
  EventStatus.ARCHIVED,
]);

const orderEventsByLifecycle = <TEvent extends EventForOrdering>(
  events: TEvent[],
) => {
  const now = Date.now();

  return events.sort((left, right) => {
    const groupDifference =
      eventStatusOrderGroups[left.status] - eventStatusOrderGroups[right.status];

    if (groupDifference !== 0) return groupDifference;

    const leftStartsAt = left.startsAt.getTime();
    const rightStartsAt = right.startsAt.getTime();

    if (activeDateOrderedStatuses.has(left.status)) {
      const leftIsFuture = leftStartsAt >= now;
      const rightIsFuture = rightStartsAt >= now;

      if (leftIsFuture !== rightIsFuture) return leftIsFuture ? -1 : 1;

      return leftIsFuture
        ? leftStartsAt - rightStartsAt
        : rightStartsAt - leftStartsAt;
    }

    if (newestFirstDateOrderedStatuses.has(left.status)) {
      return rightStartsAt - leftStartsAt;
    }

    return leftStartsAt - rightStartsAt;
  });
};

const normalizePublicEventStatusFilter = (status: string | undefined) => {
  if (!status) return "all";

  return publicEventStatusFilterValues.has(status) ? status : "all";
};

const getPublicEventStatusesForFilter = ({
  status,
  applicationsOpen,
}: {
  status: string;
  applicationsOpen: boolean;
}) => {
  if (applicationsOpen) return [EventStatus.APPLICATIONS_OPEN];

  if (status in publicEventStatusGroups) {
    return publicEventStatusGroups[
      status as keyof typeof publicEventStatusGroups
    ];
  }

  if (directPublicEventStatuses.has(status as EventStatus)) {
    return [status as EventStatus];
  }

  return publicEventStatuses;
};

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
  listPublic: publicProcedure
    .input(eventPublicListInputSchema.optional())
    .query(async ({ ctx, input }) => {
      const normalizedStatus = normalizePublicEventStatusFilter(input?.status);
      const applicationsOpen = input?.applicationsOpen === "1";
      const region = input?.region ?? "";
      const q = input?.q ?? "";
      const statuses = getPublicEventStatusesForFilter({
        status: normalizedStatus,
        applicationsOpen,
      });
      const publicEventsWhere: Prisma.EventWhereInput = {
        status: {
          in: publicEventStatuses,
        },
        team: {
          status: {
            in: publicTeamStatuses,
          },
        },
      };
      const filteredEventsWhere: Prisma.EventWhereInput = {
        ...publicEventsWhere,
        status: {
          in: statuses,
        },
      };

      if (region) {
        filteredEventsWhere.region = region;
      }

      if (q) {
        filteredEventsWhere.OR = [
          {
            title: {
              contains: q,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: q,
              mode: "insensitive",
            },
          },
          {
            region: {
              contains: q,
              mode: "insensitive",
            },
          },
          {
            team: {
              name: {
                contains: q,
                mode: "insensitive",
              },
            },
          },
          {
            object: {
              is: {
                name: {
                  contains: q,
                  mode: "insensitive",
                },
              },
            },
          },
        ];
      }

      const [events, regionRows] = await Promise.all([
        ctx.db.event.findMany({
          where: filteredEventsWhere,
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
        }),
        ctx.db.event.findMany({
          where: {
            ...publicEventsWhere,
            region: {
              not: null,
            },
          },
          distinct: ["region"],
          select: {
            region: true,
          },
        }),
      ]);

      const availableRegions = Array.from(
        new Set(
          regionRows
            .map((event) => event.region?.trim())
            .filter((eventRegion): eventRegion is string =>
              Boolean(eventRegion),
            ),
        ),
      ).sort((left, right) => left.localeCompare(right, "ru"));

      return {
        events: orderEventsByLifecycle(events),
        availableRegions,
        filters: {
          status: normalizedStatus,
          region,
          q,
          applicationsOpen,
        },
      };
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
          applications: {
            where: {
              status: ApplicationStatus.ACCEPTED,
            },
            orderBy: {
              createdAt: "asc",
            },
            select: {
              id: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
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
          crewMembers: {
            orderBy: {
              createdAt: "asc",
            },
            select: {
              id: true,
              teamMemberId: true,
              functionRoles: true,
              note: true,
              teamMember: {
                select: {
                  id: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      image: true,
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
          },
        },
      });
    }),

  getMine: protectedProcedure.query(async ({ ctx }) => {
    const events = await ctx.db.event.findMany({
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

    return orderEventsByLifecycle(events);
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

  getCrewManagement: protectedProcedure
    .input(eventSlugLookupSchema)
    .query(async ({ ctx, input }) => {
      const manageableEvent = await getEventForManagement({
        db: ctx.db,
        slug: input,
        userId: ctx.session.user.id,
      });

      const event = await ctx.db.event.findUniqueOrThrow({
        where: { id: manageableEvent.id },
        select: {
          id: true,
          title: true,
          slug: true,
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
              members: {
                orderBy: {
                  createdAt: "asc",
                },
                select: {
                  id: true,
                  role: true,
                  functionRoles: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      image: true,
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
          },
          crewMembers: {
            orderBy: {
              createdAt: "asc",
            },
            select: {
              id: true,
              teamMemberId: true,
              functionRoles: true,
              note: true,
              teamMember: {
                select: {
                  id: true,
                  role: true,
                  functionRoles: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      image: true,
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
          },
        },
      });

      return {
        event: {
          id: event.id,
          title: event.title,
          slug: event.slug,
        },
        team: {
          id: event.team.id,
          name: event.team.name,
          slug: event.team.slug,
        },
        teamMembers: event.team.members,
        crewMembers: event.crewMembers,
      };
    }),

  upsertCrewMember: protectedProcedure
    .input(eventCrewMemberInputSchema)
    .mutation(async ({ ctx, input }) => {
      const manageableEvent = await getEventForManagement({
        db: ctx.db,
        slug: input.eventSlug,
        userId: ctx.session.user.id,
      });

      const event = await ctx.db.event.findUniqueOrThrow({
        where: { id: manageableEvent.id },
        select: {
          id: true,
          teamId: true,
        },
      });

      const teamMember = await ctx.db.teamMember.findFirst({
        where: {
          id: input.teamMemberId,
          teamId: event.teamId,
        },
        select: {
          id: true,
        },
      });

      if (!teamMember) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Можно добавить только участника команды этого мероприятия.",
        });
      }

      return ctx.db.eventCrewMember.upsert({
        where: {
          eventId_teamMemberId: {
            eventId: event.id,
            teamMemberId: teamMember.id,
          },
        },
        create: {
          eventId: event.id,
          teamMemberId: teamMember.id,
          functionRoles: input.functionRoles,
          note: input.note,
        },
        update: {
          functionRoles: input.functionRoles,
          note: input.note,
        },
        select: {
          id: true,
          teamMemberId: true,
          functionRoles: true,
          note: true,
        },
      });
    }),

  removeCrewMember: protectedProcedure
    .input(eventCrewMemberRemoveInputSchema)
    .mutation(async ({ ctx, input }) => {
      const event = await getEventForManagement({
        db: ctx.db,
        slug: input.eventSlug,
        userId: ctx.session.user.id,
      });

      const crewMember = await ctx.db.eventCrewMember.findFirst({
        where: {
          id: input.crewMemberId,
          eventId: event.id,
        },
        select: {
          id: true,
        },
      });

      if (!crewMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Участник состава не найден.",
        });
      }

      return ctx.db.eventCrewMember.delete({
        where: { id: crewMember.id },
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

  updateStatus: protectedProcedure
    .input(eventStatusUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const event = await ensureCanManageEventBySlug({
        db: ctx.db,
        slug: input.slug,
        userId: ctx.session.user.id,
      });

      if (event.status === EventStatus.COMPLETED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Завершённое мероприятие нельзя изменить через управление статусом.",
        });
      }

      return ctx.db.event.update({
        where: { id: event.id },
        data: {
          status: input.status,
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

      const completedEvent = await ctx.db.$transaction(async (tx) => {
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

      const awardedBadges = await Promise.all(
        confirmedUserIds.map(async (userId) => {
          const badges = await recalculateUserBadges(
            ctx.db,
            userId,
            ctx.session.user.id,
          );

          return {
            userId,
            badges,
          };
        }),
      );

      return {
        event: completedEvent,
        awardedBadges,
      };
    }),
});
