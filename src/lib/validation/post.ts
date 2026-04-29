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

export const postCreateInputSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  imageUrl: optionalUrl,
  teamId: optionalCuid,
  eventId: optionalCuid,
  objectId: optionalCuid,
});

export const postIdInputSchema = z.string().cuid();

export const commentCreateInputSchema = z.object({
  postId: z.string().cuid(),
  content: z.string().trim().min(1).max(1000),
});

export type PostCreateInput = z.infer<typeof postCreateInputSchema>;
export type CommentCreateInput = z.infer<typeof commentCreateInputSchema>;
