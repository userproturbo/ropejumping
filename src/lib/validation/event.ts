import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const nullableString = (schema: z.ZodString) =>
  z.preprocess(emptyToNull, schema.nullable().optional());

const nullableDateTimeString = z
  .preprocess(emptyToNull, z.string().datetime().nullable().optional())
  .transform((value) => (value ? new Date(value) : null));

const requiredDateTimeString = z
  .string()
  .datetime()
  .transform((value) => new Date(value));

const optionalCapacity = z
  .preprocess(
    emptyToNull,
    z.coerce.number().int().positive().max(10000).nullable().optional(),
  )
  .transform((value) => value ?? null);

const optionalObjectId = z
  .preprocess(emptyToNull, z.string().cuid().nullable().optional())
  .transform((value) => value ?? null);

export const eventSlugSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Используйте латинские строчные буквы, цифры и дефисы."),
);

const eventEditableFieldsSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: nullableString(z.string().max(3000)).transform(
    (value) => value ?? null,
  ),
  requirementsText: nullableString(z.string().max(1500)).transform(
    (value) => value ?? null,
  ),
  region: nullableString(z.string().max(80)).transform(
    (value) => value ?? null,
  ),
  startsAt: requiredDateTimeString,
  endsAt: nullableDateTimeString,
  capacity: optionalCapacity,
  priceText: nullableString(z.string().max(120)).transform(
    (value) => value ?? null,
  ),
  levelText: nullableString(z.string().max(120)).transform(
    (value) => value ?? null,
  ),
  coverImageUrl: nullableString(z.string().url()).transform(
    (value) => value ?? null,
  ),
  objectId: optionalObjectId,
});

const eventDateRangeRefinement = (event: {
  startsAt: Date;
  endsAt: Date | null;
}) => !event.endsAt || event.endsAt > event.startsAt;

export const eventCreateInputSchema = eventEditableFieldsSchema.extend({
  teamId: z.string().cuid(),
  slug: eventSlugSchema,
}).refine(eventDateRangeRefinement, "Окончание должно быть позже начала.");

export const eventUpdateInputSchema = eventEditableFieldsSchema.extend({
  slug: eventSlugSchema,
}).refine(eventDateRangeRefinement, "Окончание должно быть позже начала.");

export const eventSlugLookupSchema = eventSlugSchema;

export const eventCompletionInputSchema = z.object({
  eventSlug: eventSlugSchema,
  confirmedUserIds: z.array(z.string().cuid()),
});

export type EventCreateInput = z.infer<typeof eventCreateInputSchema>;
export type EventUpdateInput = z.infer<typeof eventUpdateInputSchema>;
