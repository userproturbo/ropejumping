import { z } from "zod";

import { ObjectType } from "@/generated/prisma/enums";
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

const optionalHeightMeters = z
  .preprocess(
    emptyToNull,
    z.coerce.number().int().positive().max(10000).nullable().optional(),
  )
  .transform((value) => value ?? null);

const objectEditableFieldsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.nativeEnum(ObjectType),
  heightMeters: optionalHeightMeters,
  region: nullableString(z.string().max(80)),
  description: nullableString(z.string().max(2000)),
  coverImageUrl: nullableString(z.string().url()),
});

export const objectSlugSchema = eventSlugSchema;

export const objectCreateInputSchema = objectEditableFieldsSchema.extend({
  slug: objectSlugSchema,
  teamId: z.string().cuid(),
});

export const objectUpdateInputSchema = objectEditableFieldsSchema.extend({
  slug: objectSlugSchema,
});

export const objectSlugLookupSchema = objectSlugSchema;

export type ObjectCreateInput = z.infer<typeof objectCreateInputSchema>;
export type ObjectUpdateInput = z.infer<typeof objectUpdateInputSchema>;
