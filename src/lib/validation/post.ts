import { z } from "zod";

import { PostPinTargetType } from "@/generated/prisma/enums";

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
  imageMediaId: optionalCuid,
  teamId: optionalCuid,
  eventId: optionalCuid,
  objectId: optionalCuid,
});

export const postIdInputSchema = z.string().cuid();

export const postViewInputSchema = z.object({
  postId: z.string().cuid(),
  anonymousViewerId: z.string().min(16).max(120).optional(),
});

export const postUpdateInputSchema = z.object({
  postId: z.string().cuid(),
  content: z.string().trim().min(1).max(2000),
  imageUrl: optionalUrl,
  imageMediaId: optionalCuid,
});

export const postDeleteInputSchema = z.object({
  postId: z.string().cuid(),
});

export const postPinTargetTypeSchema = z.nativeEnum(PostPinTargetType);

export const postPinInputSchema = z.object({
  postId: z.string().cuid(),
  targetType: postPinTargetTypeSchema,
  targetId: z.string().cuid(),
});

export const postPinListInputSchema = z.object({
  targetType: postPinTargetTypeSchema,
  targetId: z.string().cuid(),
});

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

export const commentUpdateInputSchema = z.object({
  commentId: z.string().cuid(),
  content: z.string().trim().min(1).max(1000),
});

export const commentDeleteInputSchema = z.object({
  commentId: z.string().cuid(),
});

export type PostCreateInput = z.infer<typeof postCreateInputSchema>;
export type CommentCreateInput = z.infer<typeof commentCreateInputSchema>;
