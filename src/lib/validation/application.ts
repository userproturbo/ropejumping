import { z } from "zod";

import { eventSlugSchema } from "@/lib/validation/event";

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const nullableString = (schema: z.ZodString) =>
  z.preprocess(emptyToNull, schema.nullable().optional()).transform(
    (value) => value ?? null,
  );

export const applicationCreateInputSchema = z.object({
  eventSlug: eventSlugSchema,
  message: nullableString(z.string().max(1000)),
});

export const applicationDecisionInputSchema = z.object({
  applicationId: z.string().cuid(),
  organizerNote: nullableString(z.string().max(1000)),
});

export const applicationCancelInputSchema = z.object({
  applicationId: z.string().cuid(),
});

export const applicationEventSlugInputSchema = eventSlugSchema;

export type ApplicationCreateInput = z.infer<
  typeof applicationCreateInputSchema
>;
