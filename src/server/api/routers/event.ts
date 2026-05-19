import { TRPCError } from "@trpc/server";

import {
  ApplicationStatus,
  EventStatus,
  MediaStatus,
  MediaType,
  NotificationType,
  ObjectVisibility,
  PostPinTargetType,
  TeamRole,
  TeamStatus,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { getEventStatusLabel } from "@/lib/display";
import {
  eventCompleteInputSchema,
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
import { publicPostWhere } from "@/server/api/routers/post";
import { recalculateAutomaticBadgesForUser } from "@/server/badges/service";
import type { db as database } from "@/server/db";
import {
  canCreateEventForTeam,
  canManageEvent,
} from "@/server/events/permissions";
import { publicEventStatuses } from "@/server/events/statuses";
import { deleteMediaIfUnreferenced } from "@/server/media/cleanup";
import {
  resolveImageMediaForCreate,
  resolveImageMediaForUpdate,
} from "@/server/media/usage";
import {
  createNotifications,
  notifyObjectFollowersAboutEvent,
  notifyTeamFollowersAboutEvent,
} from "@/server/notifications/service";

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

const eventCompletionApplicationStatuses = [
  ApplicationStatus.ACCEPTED,
  ApplicationStatus.CONFIRMED_PARTICIPATION,
  ApplicationStatus.NO_SHOW,
];

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

const activeDateOrderedStatuses = new Set<EventStatus>(
  upcomingPublicEventStatuses,
);
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
      eventStatusOrderGroups[left.status] -
      eventStatusOrderGroups[right.status];

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
      title: true,
      slug: true,
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
      const sort = input?.sort ?? "startsAtAsc";
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
          orderBy:
            sort === "startsAtDesc"
              ? { startsAt: "desc" }
              : sort === "createdAtDesc"
                ? { createdAt: "desc" }
                : { startsAt: "asc" },
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
                visibility: true,
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
        events,
        availableRegions,
        filters: {
          status: normalizedStatus,
          region,
          q,
          applicationsOpen,
          sort,
        },
      };
    }),

  getBySlug: publicProcedure
    .input(eventSlugLookupSchema)
    .query(async ({ ctx, input }) => {
      const event = await ctx.db.event.findFirst({
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
          coverMedia: {
            select: {
              id: true,
              alt: true,
            },
          },
          galleryImages: {
            where: {
              media: {
                deletedAt: null,
                status: MediaStatus.UPLOADED,
                type: MediaType.IMAGE,
                url: { not: null },
              },
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              sortOrder: true,
              media: {
                select: {
                  id: true,
                  url: true,
                  alt: true,
                },
              },
            },
          },
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

      if (!event) return null;

      const eventPinWhere = {
        targetType: PostPinTargetType.EVENT,
        targetId: event.id,
      };
      const postSelect = {
        id: true,
        content: true,
        imageUrl: true,
        viewsCount: true,
        imageMedia: {
          select: {
            id: true,
            alt: true,
          },
        },
        createdAt: true,
        author: {
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
          },
        },
        pins: {
          where: eventPinWhere,
          select: {
            id: true,
            targetId: true,
            targetType: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: {
              where: {
                hiddenAt: null,
              },
            },
          },
        },
      } satisfies Prisma.PostSelect;

      const [pinnedPosts, latestPosts] = await Promise.all([
        ctx.db.post.findMany({
          where: {
            ...publicPostWhere,
            eventId: event.id,
            pins: {
              some: eventPinWhere,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
          select: postSelect,
        }),
        ctx.db.post.findMany({
          where: {
            ...publicPostWhere,
            eventId: event.id,
            pins: {
              none: eventPinWhere,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
          select: postSelect,
        }),
      ]);

      return {
        ...event,
        posts: [...pinnedPosts, ...latestPosts].slice(0, 5),
      };
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
          coverMedia: {
            select: {
              id: true,
              alt: true,
            },
          },
          galleryImages: {
            where: {
              media: {
                deletedAt: null,
                status: MediaStatus.UPLOADED,
                type: MediaType.IMAGE,
                url: { not: null },
              },
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              sortOrder: true,
              media: {
                select: {
                  id: true,
                  url: true,
                  alt: true,
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

      const cover = await resolveImageMediaForCreate({
        db: ctx.db,
        input: {
          mediaId: input.coverMediaId,
          url: input.coverImageUrl,
        },
        userId: ctx.session.user.id,
      });

      try {
        const createdEvent = await ctx.db.event.create({
          data: {
            ...input,
            coverImageUrl: cover.url,
            coverMediaId: cover.mediaId,
            createdById: ctx.session.user.id,
            status: EventStatus.PUBLISHED,
          },
        });

        try {
          const notifiedUserIds = await notifyTeamFollowersAboutEvent(ctx.db, {
            teamId: createdEvent.teamId,
            eventTitle: createdEvent.title,
            eventSlug: createdEvent.slug,
            actorUserId: ctx.session.user.id,
          });

          if (createdEvent.objectId) {
            await notifyObjectFollowersAboutEvent(ctx.db, {
              objectId: createdEvent.objectId,
              teamId: createdEvent.teamId,
              eventTitle: createdEvent.title,
              eventSlug: createdEvent.slug,
              actorUserId: ctx.session.user.id,
              excludeUserIds: notifiedUserIds,
            });
          }
        } catch {
          // Best effort: event creation must not fail because notifications did.
        }

        return createdEvent;
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

      const currentEvent = await ctx.db.event.findUniqueOrThrow({
        where: { id: event.id },
        select: { coverImageUrl: true, coverMediaId: true },
      });
      const cover = await resolveImageMediaForUpdate({
        db: ctx.db,
        existingMediaId: currentEvent.coverMediaId,
        existingUrl: currentEvent.coverImageUrl,
        input: {
          mediaId: input.coverMediaId,
          url: input.coverImageUrl,
        },
        userId: ctx.session.user.id,
      });

      const updatedEvent = await ctx.db.event.update({
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
          coverImageUrl: cover.url,
          coverMediaId: cover.mediaId,
          objectId: input.objectId,
        },
      });

      if (
        currentEvent.coverMediaId &&
        currentEvent.coverMediaId !== cover.mediaId
      ) {
        try {
          await deleteMediaIfUnreferenced({
            db: ctx.db,
            mediaId: currentEvent.coverMediaId,
          });
        } catch {
          // Best effort: scheduled cleanup can retry storage failures.
        }
      }

      return updatedEvent;
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

      const recipients = await ctx.db.eventApplication.findMany({
        where: {
          eventId: event.id,
          status: {
            in: [
              ApplicationStatus.ACCEPTED,
              ApplicationStatus.CONFIRMED_PARTICIPATION,
            ],
          },
          userId: {
            not: ctx.session.user.id,
          },
        },
        select: {
          userId: true,
        },
      });

      return ctx.db.$transaction(async (tx) => {
        const updatedEvent = await tx.event.update({
          where: { id: event.id },
          data: {
            status: input.status,
          },
        });

        await createNotifications(
          tx,
          recipients.map((recipient) => ({
            userId: recipient.userId,
            type: NotificationType.EVENT_STATUS_CHANGED,
            title: "Статус мероприятия изменён",
            body: `Статус мероприятия «${event.title}» изменён: ${getEventStatusLabel(input.status)}.`,
            href: `/events/${event.slug}`,
          })),
        );

        return updatedEvent;
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
            },
          },
          applications: {
            where: {
              status: {
                in: eventCompletionApplicationStatuses,
              },
            },
            orderBy: {
              createdAt: "asc",
            },
            select: {
              id: true,
              message: true,
              status: true,
              userId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  profile: {
                    select: {
                      username: true,
                      displayName: true,
                      city: true,
                      externalExperience: true,
                      selfReportedJumpCount: true,
                      selfReportedMaxHeightMeters: true,
                      selfReportedExperience: true,
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
    .input(eventCompleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.db.event.findUnique({
        where: { id: input.eventId },
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
        db: ctx.db,
        eventId: event.id,
        userId: ctx.session.user.id,
      });

      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "У вас нет прав завершать это мероприятие.",
        });
      }

      if (
        event.status === EventStatus.CANCELLED ||
        event.status === EventStatus.ARCHIVED
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Это мероприятие нельзя завершить.",
        });
      }

      const confirmedApplicationIds = Array.from(
        new Set(input.confirmedApplicationIds),
      );
      const completedAt = new Date();
      let confirmedUserIds: string[] = [];

      await ctx.db.$transaction(async (tx) => {
        const eligibleApplications = await tx.eventApplication.findMany({
          where: {
            eventId: event.id,
            status: {
              in: eventCompletionApplicationStatuses,
            },
          },
          select: {
            id: true,
            userId: true,
          },
        });

        const eligibleApplicationIds = new Set(
          eligibleApplications.map((application) => application.id),
        );
        const invalidApplicationIds = confirmedApplicationIds.filter(
          (applicationId) => !eligibleApplicationIds.has(applicationId),
        );

        if (invalidApplicationIds.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Некоторые заявки не найдены или не относятся к этому мероприятию.",
          });
        }

        await tx.event.update({
          where: { id: event.id },
          data: {
            status: EventStatus.COMPLETED,
            completedAt,
          },
        });

        await tx.eventApplication.updateMany({
          where: {
            eventId: event.id,
            id: {
              in: confirmedApplicationIds,
            },
            status: {
              in: eventCompletionApplicationStatuses,
            },
          },
          data: {
            status: ApplicationStatus.CONFIRMED_PARTICIPATION,
            decidedById: ctx.session.user.id,
            decidedAt: completedAt,
          },
        });

        const confirmedApplications = eligibleApplications.filter(
          (application) => confirmedApplicationIds.includes(application.id),
        );
        confirmedUserIds = confirmedApplications.map(
          (application) => application.userId,
        );

        await Promise.all(
          confirmedApplications.map((application) =>
            tx.eventParticipation.upsert({
              where: {
                eventId_userId: {
                  eventId: event.id,
                  userId: application.userId,
                },
              },
              create: {
                eventId: event.id,
                userId: application.userId,
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

        if (input.markUnselectedAcceptedAsNoShow) {
          await tx.eventApplication.updateMany({
            where: {
              eventId: event.id,
              id: {
                notIn: confirmedApplicationIds,
              },
              status: ApplicationStatus.ACCEPTED,
            },
            data: {
              status: ApplicationStatus.NO_SHOW,
              decidedById: ctx.session.user.id,
              decidedAt: completedAt,
            },
          });
        }
      });

      await Promise.all(
        confirmedUserIds.map((userId) =>
          recalculateAutomaticBadgesForUser({
            db: ctx.db,
            userId,
            awardedById: ctx.session.user.id,
          }),
        ),
      );

      return {
        success: true,
      };
    }),
});
