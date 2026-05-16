import { z } from "zod";

import { REPORT_TARGET_TYPES } from "@/server/reports/targets";

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

const reportTargetTypeValues = [
  REPORT_TARGET_TYPES.POST,
  REPORT_TARGET_TYPES.COMMENT,
  REPORT_TARGET_TYPES.OBJECT,
  REPORT_TARGET_TYPES.OBJECT_IMPRESSION,
] as const;

export const reportTargetTypeSchema = z.enum(reportTargetTypeValues);

const optionalReportTargetTypeSchema = z.preprocess((value) => {
  const rawValue = getFirstString(value);

  if (typeof rawValue !== "string") return undefined;

  const trimmed = rawValue.trim();
  return reportTargetTypeValues.includes(
    trimmed as (typeof reportTargetTypeValues)[number],
  )
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

export const hideObjectImpressionInputSchema = z.object({
  impressionId: z.string().cuid(),
  reportId: z.string().cuid().optional(),
});

export const reportListInputSchema = z.object({
  status: reportListStatusSchema.optional().default("OPEN"),
  targetType: optionalReportTargetTypeSchema,
});

export type ReportTargetType = z.infer<typeof reportTargetTypeSchema>;
export type ReportListStatus = z.infer<typeof reportListStatusSchema>;
