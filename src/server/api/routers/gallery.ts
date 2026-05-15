import { TRPCError } from "@trpc/server";

import { MediaStatus, MediaType } from "@/generated/prisma/enums";
import {
  eventGalleryAddInputSchema,
  eventGalleryRemoveInputSchema,
  objectGalleryAddInputSchema,
  objectGalleryRemoveInputSchema,
} from "@/lib/validation/gallery";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { db as database } from "@/server/db";
import { deleteMediaIfUnreferenced } from "@/server/media/cleanup";
import { hasTeamOwnerAdminOrOrganizerRole } from "@/server/teams/permissions";

type GalleryRouterDb = typeof database;

const galleryImageSelect = {
  id: true,
  sortOrder: true,
  createdAt: true,
  media: {
    select: {
      id: true,
      url: true,
      alt: true,
      createdAt: true,
    },
  },
};

const ensureOwnUploadedImageMedia = async ({
  db,
  mediaId,
  userId,
}: {
  db: GalleryRouterDb;
  mediaId: string;
  userId: string;
}) => {
  const media = await db.media.findFirst({
    where: {
      deletedAt: null,
      id: mediaId,
      ownerId: userId,
      status: MediaStatus.UPLOADED,
      type: MediaType.IMAGE,
    },
    select: {
      id: true,
    },
  });

  if (!media) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Загрузите изображение через форму загрузки.",
    });
  }
};

const ensureCanManageEventGallery = async ({
  db,
  eventId,
  userId,
}: {
  db: GalleryRouterDb;
  eventId: string;
  userId: string;
}) => {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      teamId: true,
    },
  });

  if (!event) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Мероприятие не найдено.",
    });
  }

  const canManage = await hasTeamOwnerAdminOrOrganizerRole({
    db,
    teamId: event.teamId,
    userId,
  });

  if (!canManage) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "У вас нет прав на управление галереей мероприятия.",
    });
  }

  return event;
};

const ensureCanManageObjectGallery = async ({
  db,
  objectId,
  userId,
}: {
  db: GalleryRouterDb;
  objectId: string;
  userId: string;
}) => {
  const object = await db.jumpObject.findUnique({
    where: { id: objectId },
    select: {
      createdById: true,
      createdByTeamId: true,
      id: true,
    },
  });

  if (!object) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Объект не найден.",
    });
  }

  const canManage = object.createdByTeamId
    ? await hasTeamOwnerAdminOrOrganizerRole({
        db,
        teamId: object.createdByTeamId,
        userId,
      })
    : object.createdById === userId;

  if (!canManage) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "У вас нет прав на управление галереей объекта.",
    });
  }

  return object;
};

export const galleryRouter = createTRPCRouter({
  eventAddImage: protectedProcedure
    .input(eventGalleryAddInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ensureCanManageEventGallery({
        db: ctx.db,
        eventId: input.eventId,
        userId: ctx.session.user.id,
      });
      await ensureOwnUploadedImageMedia({
        db: ctx.db,
        mediaId: input.mediaId,
        userId: ctx.session.user.id,
      });

      const existingImage = await ctx.db.eventGalleryImage.findUnique({
        where: {
          eventId_mediaId: {
            eventId: input.eventId,
            mediaId: input.mediaId,
          },
        },
        select: { id: true },
      });

      if (existingImage) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Это изображение уже есть в галерее.",
        });
      }

      const maxSortOrder = await ctx.db.eventGalleryImage.aggregate({
        where: { eventId: input.eventId },
        _max: { sortOrder: true },
      });

      return ctx.db.eventGalleryImage.create({
        data: {
          eventId: input.eventId,
          mediaId: input.mediaId,
          sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
        },
        select: galleryImageSelect,
      });
    }),

  eventRemoveImage: protectedProcedure
    .input(eventGalleryRemoveInputSchema)
    .mutation(async ({ ctx, input }) => {
      const galleryImage = await ctx.db.eventGalleryImage.findUnique({
        where: { id: input.galleryImageId },
        select: {
          eventId: true,
          mediaId: true,
        },
      });

      if (!galleryImage) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Изображение галереи не найдено.",
        });
      }

      await ensureCanManageEventGallery({
        db: ctx.db,
        eventId: galleryImage.eventId,
        userId: ctx.session.user.id,
      });

      await ctx.db.eventGalleryImage.delete({
        where: { id: input.galleryImageId },
      });

      try {
        await deleteMediaIfUnreferenced({
          db: ctx.db,
          mediaId: galleryImage.mediaId,
        });
      } catch {
        // Best effort: scheduled cleanup can retry storage failures.
      }

      return { success: true };
    }),

  objectAddImage: protectedProcedure
    .input(objectGalleryAddInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ensureCanManageObjectGallery({
        db: ctx.db,
        objectId: input.objectId,
        userId: ctx.session.user.id,
      });
      await ensureOwnUploadedImageMedia({
        db: ctx.db,
        mediaId: input.mediaId,
        userId: ctx.session.user.id,
      });

      const existingImage = await ctx.db.objectGalleryImage.findUnique({
        where: {
          objectId_mediaId: {
            objectId: input.objectId,
            mediaId: input.mediaId,
          },
        },
        select: { id: true },
      });

      if (existingImage) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Это изображение уже есть в галерее.",
        });
      }

      const maxSortOrder = await ctx.db.objectGalleryImage.aggregate({
        where: { objectId: input.objectId },
        _max: { sortOrder: true },
      });

      return ctx.db.objectGalleryImage.create({
        data: {
          objectId: input.objectId,
          mediaId: input.mediaId,
          sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
        },
        select: galleryImageSelect,
      });
    }),

  objectRemoveImage: protectedProcedure
    .input(objectGalleryRemoveInputSchema)
    .mutation(async ({ ctx, input }) => {
      const galleryImage = await ctx.db.objectGalleryImage.findUnique({
        where: { id: input.galleryImageId },
        select: {
          mediaId: true,
          objectId: true,
        },
      });

      if (!galleryImage) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Изображение галереи не найдено.",
        });
      }

      await ensureCanManageObjectGallery({
        db: ctx.db,
        objectId: galleryImage.objectId,
        userId: ctx.session.user.id,
      });

      await ctx.db.objectGalleryImage.delete({
        where: { id: input.galleryImageId },
      });

      try {
        await deleteMediaIfUnreferenced({
          db: ctx.db,
          mediaId: galleryImage.mediaId,
        });
      } catch {
        // Best effort: scheduled cleanup can retry storage failures.
      }

      return { success: true };
    }),
});
