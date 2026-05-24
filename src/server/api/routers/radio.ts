import type { Prisma } from "@/generated/prisma/client";
import {
  radioMoodSchema,
  radioTrackActiveInputSchema,
  radioTrackIdInputSchema,
  radioTrackInputSchema,
  radioTrackUpdateInputSchema,
} from "@/lib/validation/radio";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { requireModerator } from "@/server/moderation/permissions";

const radioTrackSelect = {
  id: true,
  title: true,
  artist: true,
  mood: true,
  audioUrl: true,
  coverUrl: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} as const;

const radioTrackOrderBy: Prisma.RadioTrackOrderByWithRelationInput[] = [
  { sortOrder: "asc" },
  { createdAt: "asc" },
];

export const radioRouter = createTRPCRouter({
  listActive: publicProcedure
    .input(radioMoodSchema.optional())
    .query(({ ctx, input }) =>
      ctx.db.radioTrack.findMany({
        where: {
          isActive: true,
          ...(input ? { mood: input } : {}),
        },
        orderBy: radioTrackOrderBy,
        select: radioTrackSelect,
      }),
    ),

  listForAdmin: protectedProcedure.query(({ ctx }) => {
    requireModerator(ctx);

    return ctx.db.radioTrack.findMany({
      orderBy: radioTrackOrderBy,
      select: radioTrackSelect,
    });
  }),

  create: protectedProcedure
    .input(radioTrackInputSchema)
    .mutation(({ ctx, input }) => {
      requireModerator(ctx);

      return ctx.db.radioTrack.create({
        data: input,
        select: radioTrackSelect,
      });
    }),

  update: protectedProcedure
    .input(radioTrackUpdateInputSchema)
    .mutation(({ ctx, input }) => {
      requireModerator(ctx);

      const { id, ...data } = input;

      return ctx.db.radioTrack.update({
        where: { id },
        data,
        select: radioTrackSelect,
      });
    }),

  setActive: protectedProcedure
    .input(radioTrackActiveInputSchema)
    .mutation(({ ctx, input }) => {
      requireModerator(ctx);

      return ctx.db.radioTrack.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
        select: radioTrackSelect,
      });
    }),

  disable: protectedProcedure
    .input(radioTrackIdInputSchema)
    .mutation(({ ctx, input }) => {
      requireModerator(ctx);

      return ctx.db.radioTrack.update({
        where: { id: input.id },
        data: { isActive: false },
        select: radioTrackSelect,
      });
    }),
});
