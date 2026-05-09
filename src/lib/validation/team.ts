import { z } from "zod";

import { TeamStatus } from "@/generated/prisma/enums";

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const nullableString = (schema: z.ZodString) =>
  z.preprocess(emptyToNull, schema.nullable().optional());

const getFirstString = (value: unknown) => {
  if (typeof value === "string") return value;

  if (!Array.isArray(value)) return undefined;

  const firstValue: unknown = value[0];
  return typeof firstValue === "string" ? firstValue : undefined;
};

const optionalFilterString = z.preprocess((value) => {
  const rawValue = getFirstString(value);

  if (typeof rawValue !== "string") return undefined;

  const trimmed = rawValue.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().optional());

const publicTeamStatusFilterValues = new Set<string>([
  TeamStatus.REGULAR,
  TeamStatus.VERIFIED,
]);

const optionalPublicTeamStatusFilter = z.preprocess((value) => {
  const rawValue = getFirstString(value);

  if (typeof rawValue !== "string") return undefined;

  const trimmed = rawValue.trim();
  return publicTeamStatusFilterValues.has(trimmed) ? trimmed : undefined;
}, z.nativeEnum(TeamStatus).optional());

export const teamSlugSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Используйте латинские строчные буквы, цифры и дефисы."),
);

const teamEditableFieldsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: nullableString(z.string().max(1000)).transform(
    (value) => value ?? null,
  ),
  region: nullableString(z.string().max(80)).transform(
    (value) => value ?? null,
  ),
  logoUrl: nullableString(z.string().url()).transform(
    (value) => value ?? null,
  ),
});

export const teamCreateInputSchema = teamEditableFieldsSchema.extend({
  slug: teamSlugSchema,
});

export const teamUpdateInputSchema = teamEditableFieldsSchema.extend({
  slug: teamSlugSchema,
});

export const teamSlugLookupSchema = teamSlugSchema;

export const teamPublicListInputSchema = z.object({
  q: optionalFilterString,
  region: optionalFilterString,
  status: optionalPublicTeamStatusFilter,
});

export type TeamCreateInput = z.infer<typeof teamCreateInputSchema>;
export type TeamUpdateInput = z.infer<typeof teamUpdateInputSchema>;
