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

  delete: protectedProcedure
    .input(radioTrackIdInputSchema)
    .mutation(({ ctx, input }) => {
      requireModerator(ctx);

      return ctx.db.radioTrack.delete({
        where: { id: input.id },
        select: radioTrackSelect,
      });
    }),

  shufflePlaylist: protectedProcedure
    .input(radioMoodSchema)
    .mutation(async ({ ctx, input }) => {
      requireModerator(ctx);

      const tracks = await ctx.db.radioTrack.findMany({
        where: { mood: input },
        orderBy: radioTrackOrderBy,
        select: { id: true },
      });
      const shuffledTracks = shuffleTracks(tracks);

      return Promise.all(
        shuffledTracks.map((track, sortOrder) =>
          ctx.db.radioTrack.update({
            where: { id: track.id },
            data: { sortOrder },
            select: radioTrackSelect,
          }),
        ),
      );
    }),
});

function shuffleTracks<T>(tracks: T[]) {
  const shuffledTracks = [...tracks];

  for (let index = shuffledTracks.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const currentTrack = shuffledTracks[index];
    const randomTrack = shuffledTracks[randomIndex];

    if (currentTrack === undefined || randomTrack === undefined) continue;

    shuffledTracks[index] = randomTrack;
    shuffledTracks[randomIndex] = currentTrack;
  }

  return shuffledTracks;
}
