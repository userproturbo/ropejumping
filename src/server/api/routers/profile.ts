import { TRPCError } from "@trpc/server";

import { TeamStatus } from "@/generated/prisma/enums";
import {
  profileInputSchema,
  profileUsernameLookupSchema,
} from "@/lib/validation/profile";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { publicEventStatuses } from "@/server/events/statuses";
import { deleteMediaIfUnreferenced } from "@/server/media/cleanup";
import { resolveImageMediaForUpdate } from "@/server/media/usage";

const publicTeamStatuses = [TeamStatus.REGULAR, TeamStatus.VERIFIED];

export const profileRouter = createTRPCRouter({
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
      },
      orderBy: {
        confirmedAt: "desc",
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startsAt: true,
            endsAt: true,
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
    .query(({ ctx, input }) => {
      return ctx.db.profile.findUnique({
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
                    status: {
                      in: publicEventStatuses,
                    },
                    team: {
                      status: {
                        in: publicTeamStatuses,
                      },
                    },
                  },
                },
                orderBy: {
                  confirmedAt: "desc",
                },
                include: {
                  event: {
                    select: {
                      id: true,
                      title: true,
                      slug: true,
                      startsAt: true,
                      endsAt: true,
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
    }),
});
