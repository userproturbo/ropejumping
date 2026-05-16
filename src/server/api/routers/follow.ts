import { TRPCError } from "@trpc/server";

import { ObjectVisibility, TeamStatus } from "@/generated/prisma/enums";
import {
  followListInputSchema,
  followObjectInputSchema,
  followTeamInputSchema,
} from "@/lib/validation/follow";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const publicTeamStatuses = [TeamStatus.REGULAR, TeamStatus.VERIFIED];

const isUniqueConstraintError = (error: unknown) =>
  error instanceof Error && error.message.includes("Unique constraint failed");

export const followRouter = createTRPCRouter({
  followTeam: protectedProcedure
    .input(followTeamInputSchema)
    .mutation(async ({ ctx, input }) => {
      const team = await ctx.db.team.findFirst({
        where: {
          id: input.teamId,
          status: {
            in: publicTeamStatuses,
          },
        },
        select: {
          id: true,
        },
      });

      if (!team) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Команда не найдена.",
        });
      }

      try {
        await ctx.db.teamFollow.create({
          data: {
            teamId: input.teamId,
            userId: ctx.session.user.id,
          },
        });
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
      }

      return { following: true };
    }),

  unfollowTeam: protectedProcedure
    .input(followTeamInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.teamFollow.deleteMany({
        where: {
          teamId: input.teamId,
          userId: ctx.session.user.id,
        },
      });

      return { following: false };
    }),

  toggleTeamFollow: protectedProcedure
    .input(followTeamInputSchema)
    .mutation(async ({ ctx, input }) => {
      const team = await ctx.db.team.findFirst({
        where: {
          id: input.teamId,
          status: {
            in: publicTeamStatuses,
          },
        },
        select: {
          id: true,
        },
      });

      if (!team) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Команда не найдена.",
        });
      }

      const existingFollow = await ctx.db.teamFollow.findUnique({
        where: {
          userId_teamId: {
            teamId: input.teamId,
            userId: ctx.session.user.id,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingFollow) {
        await ctx.db.teamFollow.delete({
          where: {
            id: existingFollow.id,
          },
        });

        return { following: false };
      }

      try {
        await ctx.db.teamFollow.create({
          data: {
            teamId: input.teamId,
            userId: ctx.session.user.id,
          },
        });
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
      }

      return { following: true };
    }),

  followObject: protectedProcedure
    .input(followObjectInputSchema)
    .mutation(async ({ ctx, input }) => {
      const object = await ctx.db.jumpObject.findFirst({
        where: {
          id: input.objectId,
          visibility: ObjectVisibility.PUBLIC,
        },
        select: {
          id: true,
        },
      });

      if (!object) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Объект не найден.",
        });
      }

      try {
        await ctx.db.objectFollow.create({
          data: {
            objectId: input.objectId,
            userId: ctx.session.user.id,
          },
        });
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
      }

      return { following: true };
    }),

  unfollowObject: protectedProcedure
    .input(followObjectInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.objectFollow.deleteMany({
        where: {
          objectId: input.objectId,
          userId: ctx.session.user.id,
        },
      });

      return { following: false };
    }),

  toggleObjectFollow: protectedProcedure
    .input(followObjectInputSchema)
    .mutation(async ({ ctx, input }) => {
      const object = await ctx.db.jumpObject.findFirst({
        where: {
          id: input.objectId,
          visibility: ObjectVisibility.PUBLIC,
        },
        select: {
          id: true,
        },
      });

      if (!object) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Объект не найден.",
        });
      }

      const existingFollow = await ctx.db.objectFollow.findUnique({
        where: {
          userId_objectId: {
            objectId: input.objectId,
            userId: ctx.session.user.id,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingFollow) {
        await ctx.db.objectFollow.delete({
          where: {
            id: existingFollow.id,
          },
        });

        return { following: false };
      }

      try {
        await ctx.db.objectFollow.create({
          data: {
            objectId: input.objectId,
            userId: ctx.session.user.id,
          },
        });
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
      }

      return { following: true };
    }),

  getMyFollows: protectedProcedure
    .input(followListInputSchema.optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const [teams, objects] = await Promise.all([
        ctx.db.teamFollow.findMany({
          where: {
            userId: ctx.session.user.id,
            team: {
              status: {
                in: publicTeamStatuses,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: limit,
          select: {
            id: true,
            createdAt: true,
            team: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                logoMedia: {
                  select: {
                    alt: true,
                  },
                },
                status: true,
              },
            },
          },
        }),
        ctx.db.objectFollow.findMany({
          where: {
            userId: ctx.session.user.id,
            object: {
              visibility: ObjectVisibility.PUBLIC,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: limit,
          select: {
            id: true,
            createdAt: true,
            object: {
              select: {
                id: true,
                name: true,
                slug: true,
                coverImageUrl: true,
                coverMedia: {
                  select: {
                    alt: true,
                  },
                },
                region: true,
                heightMeters: true,
                type: true,
              },
            },
          },
        }),
      ]);

      return {
        teams,
        objects,
      };
    }),
});
