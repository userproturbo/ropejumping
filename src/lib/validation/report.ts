import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const detailsSchema = z
  .preprocess(emptyToNull, z.string().max(1000).nullable().optional())
  .transform((value) => value ?? null);

export const reportTargetTypeSchema = z.enum(["POST", "COMMENT"]);

export const reportCreateInputSchema = z.object({
  targetType: reportTargetTypeSchema,
  targetId: z.string().cuid(),
  reason: z.string().trim().min(3).max(120),
  details: detailsSchema,
});

export const reportActionInputSchema = z.object({
  reportId: z.string().cuid(),
});

export const hideTargetInputSchema = z.object({
  targetType: reportTargetTypeSchema,
  targetId: z.string().cuid(),
});

export type ReportTargetType = z.infer<typeof reportTargetTypeSchema>;
