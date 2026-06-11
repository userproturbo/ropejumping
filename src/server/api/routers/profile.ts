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
import { publicReadablePostWhere } from "@/server/api/routers/post";
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
              _count: {
                select: {
                  badges: true,
                  createdObjects: {
                    where: {
                      visibility: ObjectVisibility.PUBLIC,
                    },
                  },
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
                select: {
                  id: true,
                  awardedAt: true,
                  reason: true,
                  badge: {
                    select: {
                      code: true,
                      name: true,
                      description: true,
                      category: true,
                      iconUrl: true,
                      isManual: true,
                    },
                  },
                },
              },
              posts: {
                where: publicReadablePostWhere,
                orderBy: {
                  createdAt: "desc",
                },
                take: 5,
                select: {
                  id: true,
                  content: true,
                  imageUrl: true,
                  viewsCount: true,
                  imageMedia: {
                    select: {
                      alt: true,
                    },
                  },
                  createdAt: true,
                  author: {
                    select: {
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
                      name: true,
                    },
                  },
                  event: {
                    select: {
                      title: true,
                    },
                  },
                  object: {
                    select: {
                      name: true,
                      visibility: true,
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
                },
              },
              teamMemberships: {
                where: {
                  team: {
                    status: {
                      in: publicTeamStatuses,
                    },
                  },
                },
                orderBy: {
                  createdAt: "desc",
                },
                select: {
                  id: true,
                  role: true,
                  team: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                    },
                  },
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
          posts: profile.user.posts.map((post) => ({
            ...post,
            object:
              post.object?.visibility === ObjectVisibility.PUBLIC
                ? { name: post.object.name }
                : null,
          })),
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
