import { TRPCError } from "@trpc/server";

import {
  profileInputSchema,
  profileUsernameLookupSchema,
} from "@/lib/validation/profile";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";

export const profileRouter = createTRPCRouter({
  getMine: protectedProcedure.query(({ ctx }) => {
    return ctx.db.profile.findUnique({
      where: { userId: ctx.session.user.id },
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
      try {
        return await ctx.db.profile.upsert({
          where: { userId: ctx.session.user.id },
          create: {
            ...input,
            userId: ctx.session.user.id,
          },
          update: input,
        });
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
          user: {
            select: {
              eventParticipations: {
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
