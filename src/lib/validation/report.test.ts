import { describe, expect, it } from "vitest";

import { reportListInputSchema } from "@/lib/validation/report";

describe("report list validation", () => {
  it("accepts supported moderation statuses", () => {
    for (const status of [
      "OPEN",
      "REVIEWED",
      "RESOLVED",
      "DISMISSED",
      "ALL",
    ]) {
      expect(reportListInputSchema.parse({ status }).status).toBe(status);
    }
  });

  it("normalizes unknown status to open", () => {
    expect(reportListInputSchema.parse({ status: "BAD_VALUE" }).status).toBe(
      "OPEN",
    );
  });

  it("accepts supported target types", () => {
    for (const targetType of ["POST", "COMMENT", "OBJECT"]) {
      expect(reportListInputSchema.parse({ targetType }).targetType).toBe(
        targetType,
      );
    }
  });

  it("ignores unknown target type", () => {
    expect(
      reportListInputSchema.parse({ targetType: "TEAM" }).targetType,
    ).toBeUndefined();
  });
});
