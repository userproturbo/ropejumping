import { TRPCError } from "@trpc/server";

import { EventStatus, TeamRole, TeamStatus } from "@/generated/prisma/enums";
import {
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
              region: true,
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
        },
      });
    }),
});
