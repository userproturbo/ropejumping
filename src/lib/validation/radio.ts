import { z } from "zod";

import { RadioMood } from "@/generated/prisma/enums";

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const optionalUrlSchema = z
  .preprocess(emptyToNull, z.string().trim().url().nullable().optional())
  .transform((value) => value ?? null);

export const radioMoodLabels: Record<RadioMood, string> = {
  [RadioMood.RELAX]: "Релакс",
  [RadioMood.ENERGETIC]: "Бодрое",
  [RadioMood.FUN]: "Весёлое",
};

export const radioMoodSchema = z.nativeEnum(RadioMood);

export const radioTrackInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  artist: z
    .preprocess(emptyToNull, z.string().trim().max(120).nullable().optional())
    .transform((value) => value ?? null),
  mood: radioMoodSchema,
  audioUrl: z.string().trim().url(),
  coverUrl: optionalUrlSchema,
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const radioTrackUpdateInputSchema = radioTrackInputSchema.extend({
  id: z.string().cuid(),
});

export const radioTrackIdInputSchema = z.object({
  id: z.string().cuid(),
});

export const radioTrackActiveInputSchema = radioTrackIdInputSchema.extend({
  isActive: z.boolean(),
});
