import { TRPCError } from "@trpc/server";

import type { Prisma } from "@/generated/prisma/client";
import {
  EventStatus,
  ObjectVisibility,
  TeamStatus,
} from "@/generated/prisma/enums";
import {
  profileInputSchema,
  profilePublicListInputSchema,
  profileUsernameLookupSchema,
} from "@/lib/validation/profile";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { deleteMediaIfUnreferenced } from "@/server/media/cleanup";
import { resolveImageMediaForUpdate } from "@/server/media/usage";

const publicTeamStatuses = [TeamStatus.REGULAR, TeamStatus.VERIFIED];

export const profileRouter = createTRPCRouter({
  listPublic: publicProcedure
    .input(profilePublicListInputSchema.optional())
    .query(async ({ ctx, input }) => {
      const q = input?.q ?? "";
      const city = input?.city ?? "";
      const where: Prisma.ProfileWhereInput = {
        username: {
          not: null,
        },
      };

      if (city) {
        where.city = {
          contains: city,
          mode: "insensitive",
        };
      }

      if (q) {
        where.OR = [
          {
            username: {
              contains: q,
              mode: "insensitive",
            },
          },
          {
            displayName: {
              contains: q,
              mode: "insensitive",
            },
          },
          {
            bio: {
              contains: q,
              mode: "insensitive",
            },
          },
          {
            city: {
              contains: q,
              mode: "insensitive",
            },
          },
        ];
      }

      const profiles = await ctx.db.profile.findMany({
        where,
        orderBy: {
          updatedAt: "desc",
        },
        take: 50,
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          city: true,
          bio: true,
          selfReportedJumpCount: true,
          selfReportedMaxHeightMeters: true,
          createdAt: true,
          avatarMedia: {
            select: {
              alt: true,
            },
          },
          user: {
            select: {
              name: true,
              badges: {
                take: 3,
                orderBy: {
                  awardedAt: "desc",
                },
                include: {
                  badge: true,
                },
              },
            },
          },
        },
      });

      return {
        profiles,
        filters: {
          q,
          city,
        },
      };
    }),

  getMine: protectedProcedure.query(({ ctx }) => {
    return ctx.db.profile.findUnique({
      where: { userId: ctx.session.user.id },
      include: {
        avatarMedia: {
          select: {
            id: true,
            alt: true,
          },
        },
      },
    });
  }),

  getMyParticipations: protectedProcedure.query(({ ctx }) => {
    return ctx.db.eventParticipation.findMany({
      where: {
        userId: ctx.session.user.id,
        event: {
          status: EventStatus.COMPLETED,
        },
      },
      orderBy: {
        event: {
          startsAt: "desc",
        },
      },
      include: {
        event: {
          select: {
            id: true,
            objectId: true,
            title: true,
            slug: true,
            startsAt: true,
            endsAt: true,
            object: {
              select: {
                id: true,
                name: true,
                slug: true,
                type: true,
                visibility: true,
                heightMeters: true,
                region: true,
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
        },
      },
    });
  }),

  upsertMine: protectedProcedure
    .input(profileInputSchema)
    .mutation(async ({ ctx, input }) => {
      const currentProfile = await ctx.db.profile.findUnique({
        where: { userId: ctx.session.user.id },
        select: { avatarMediaId: true, avatarUrl: true },
      });
      const avatar = await resolveImageMediaForUpdate({
        db: ctx.db,
        existingMediaId: currentProfile?.avatarMediaId,
        existingUrl: currentProfile?.avatarUrl,
        input: {
          mediaId: input.avatarMediaId,
          url: input.avatarUrl,
        },
        userId: ctx.session.user.id,
      });
      const profileInput = {
        ...input,
        avatarMediaId: avatar.mediaId,
        avatarUrl: avatar.url,
      };

      try {
        const updatedProfile = await ctx.db.profile.upsert({
          where: { userId: ctx.session.user.id },
          create: {
            ...profileInput,
            userId: ctx.session.user.id,
          },
          update: profileInput,
        });

        if (
          currentProfile?.avatarMediaId &&
          currentProfile.avatarMediaId !== avatar.mediaId
        ) {
          try {
            await deleteMediaIfUnreferenced({
              db: ctx.db,
              mediaId: currentProfile.avatarMediaId,
            });
          } catch {
            // Best effort: scheduled cleanup can retry storage failures.
          }
        }

        return updatedProfile;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("Unique constraint failed")
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Такое имя пользователя уже занято.",
          });
        }

        throw error;
      }
    }),

  getByUsername: publicProcedure
    .input(profileUsernameLookupSchema)
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.profile.findUnique({
        where: { username: input },
        include: {
          avatarMedia: {
            select: {
              id: true,
              alt: true,
            },
          },
          user: {
            select: {
              badges: {
                orderBy: {
                  awardedAt: "desc",
                },
                include: {
                  badge: true,
                },
              },
              eventParticipations: {
                where: {
                  event: {
                    status: EventStatus.COMPLETED,
                    team: {
                      status: {
                        in: publicTeamStatuses,
                      },
                    },
                  },
                },
                orderBy: {
                  event: {
                    startsAt: "desc",
                  },
                },
                include: {
                  event: {
                    select: {
                      id: true,
                      objectId: true,
                      title: true,
                      slug: true,
                      startsAt: true,
                      endsAt: true,
                      object: {
                        select: {
                          id: true,
                          name: true,
                          slug: true,
                          type: true,
                          visibility: true,
                          heightMeters: true,
                          region: true,
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
                  },
                },
              },
            },
          },
        },
      });

      if (!profile) return null;

      return {
        ...profile,
        user: {
          ...profile.user,
          eventParticipations: profile.user.eventParticipations.map(
            (participation) => ({
              ...participation,
              event: {
                ...participation.event,
                object:
                  participation.event.object?.visibility ===
                  ObjectVisibility.PUBLIC
                    ? participation.event.object
                    : null,
              },
            }),
          ),
        },
      };
    }),
});
