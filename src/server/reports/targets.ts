export const REPORT_TARGET_TYPES = {
  POST: "POST",
  COMMENT: "COMMENT",
  OBJECT: "OBJECT",
  OBJECT_IMPRESSION: "OBJECT_IMPRESSION",
} as const;

export type ReportTargetType =
  (typeof REPORT_TARGET_TYPES)[keyof typeof REPORT_TARGET_TYPES];
