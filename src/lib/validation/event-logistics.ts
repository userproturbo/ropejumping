import { z } from "zod";

import { EventLogisticsType } from "@/generated/prisma/enums";

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal("")])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (!value) return null;

      return value.trim() || null;
    });

export const eventLogisticsListInputSchema = z.object({
  eventId: z.string().cuid(),
});

export const eventLogisticsCreateInputSchema = z.object({
  eventId: z.string().cuid(),
  type: z.nativeEnum(EventLogisticsType),
  fromLocation: optionalText(120),
  departureTimeText: optionalText(120),
  seatsAvailable: z.number().int().min(0).max(20).optional().nullable(),
  baggageNote: optionalText(300),
  body: z
    .string()
    .trim()
    .min(10, "Описание должно быть не короче 10 символов.")
    .max(1000, "Описание не должно быть длиннее 1000 символов."),
});

export const eventLogisticsUpdateInputSchema = z.object({
  postId: z.string().cuid(),
  type: z.nativeEnum(EventLogisticsType).optional(),
  fromLocation: optionalText(120),
  departureTimeText: optionalText(120),
  seatsAvailable: z.number().int().min(0).max(20).optional().nullable(),
  baggageNote: optionalText(300),
  body: z
    .string()
    .trim()
    .min(10, "Описание должно быть не короче 10 символов.")
    .max(1000, "Описание не должно быть длиннее 1000 символов.")
    .optional(),
});

export const eventLogisticsPostIdInputSchema = z.object({
  postId: z.string().cuid(),
});
