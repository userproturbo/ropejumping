import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const optionalCuid = z
  .preprocess(emptyToNull, z.string().cuid().nullable().optional())
  .transform((value) => value ?? null);

const optionalUrl = z
  .preprocess(emptyToNull, z.string().url().nullable().optional())
  .transform((value) => value ?? null);

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

const optionalSlugFilter = z.preprocess((value) => {
  const rawValue = getFirstString(value);

  if (typeof rawValue !== "string") return undefined;

  const trimmed = rawValue.trim();
  return /^[a-z0-9-]+$/.test(trimmed) ? trimmed : undefined;
}, z.string().optional());

export const postCreateInputSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  imageUrl: optionalUrl,
  teamId: optionalCuid,
  eventId: optionalCuid,
  objectId: optionalCuid,
});

export const postIdInputSchema = z.string().cuid();

export const postPublicListInputSchema = z.object({
  q: optionalFilterString,
  team: optionalSlugFilter,
  event: optionalSlugFilter,
  object: optionalSlugFilter,
});

export const commentCreateInputSchema = z.object({
  postId: z.string().cuid(),
  content: z.string().trim().min(1).max(1000),
});

export type PostCreateInput = z.infer<typeof postCreateInputSchema>;
export type CommentCreateInput = z.infer<typeof commentCreateInputSchema>;
