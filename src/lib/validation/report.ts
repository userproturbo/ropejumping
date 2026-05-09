import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const detailsSchema = z
  .preprocess(emptyToNull, z.string().max(1000).nullable().optional())
  .transform((value) => value ?? null);

const getFirstString = (value: unknown) => {
  if (typeof value === "string") return value;

  if (!Array.isArray(value)) return undefined;

  const firstValue: unknown = value[0];
  return typeof firstValue === "string" ? firstValue : undefined;
};

const moderationStatusValues = [
  "OPEN",
  "REVIEWED",
  "RESOLVED",
  "DISMISSED",
  "ALL",
] as const;

const reportListStatusSchema = z.preprocess((value) => {
  const rawValue = getFirstString(value);

  if (typeof rawValue !== "string") return "OPEN";

  const trimmed = rawValue.trim();
  return moderationStatusValues.includes(
    trimmed as (typeof moderationStatusValues)[number],
  )
    ? trimmed
    : "OPEN";
}, z.enum(moderationStatusValues));

export const reportTargetTypeSchema = z.enum(["POST", "COMMENT", "OBJECT"]);

const optionalReportTargetTypeSchema = z.preprocess((value) => {
  const rawValue = getFirstString(value);

  if (typeof rawValue !== "string") return undefined;

  const trimmed = rawValue.trim();
  return trimmed === "POST" || trimmed === "COMMENT" || trimmed === "OBJECT"
    ? trimmed
    : undefined;
}, reportTargetTypeSchema.optional());

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

export const reportListInputSchema = z.object({
  status: reportListStatusSchema.optional().default("OPEN"),
  targetType: optionalReportTargetTypeSchema,
});

export type ReportTargetType = z.infer<typeof reportTargetTypeSchema>;
export type ReportListStatus = z.infer<typeof reportListStatusSchema>;
