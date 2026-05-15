import { z } from "zod";

export const eventGalleryAddInputSchema = z.object({
  eventId: z.string().cuid(),
  mediaId: z.string().cuid(),
});

export const eventGalleryRemoveInputSchema = z.object({
  galleryImageId: z.string().cuid(),
});

export const objectGalleryAddInputSchema = z.object({
  objectId: z.string().cuid(),
  mediaId: z.string().cuid(),
});

export const objectGalleryRemoveInputSchema = z.object({
  galleryImageId: z.string().cuid(),
});
