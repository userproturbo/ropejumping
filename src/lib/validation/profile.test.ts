import { describe, expect, it } from "vitest";

import { profileInputSchema } from "@/lib/validation/profile";

const validProfileInput = {
  avatarMediaId: "",
  avatarUrl: "",
  bio: "",
  city: "",
  displayName: "Jumper",
  externalExperience: "",
  selfReportedExperience: "",
  selfReportedJumpCount: "",
  selfReportedMaxHeightMeters: "",
  username: "jumper",
};

describe("profile validation", () => {
  it("accepts empty self-reported stats as null", () => {
    const result = profileInputSchema.parse(validProfileInput);

    expect(result.selfReportedJumpCount).toBeNull();
    expect(result.selfReportedMaxHeightMeters).toBeNull();
    expect(result.selfReportedExperience).toBeNull();
  });

  it("accepts valid self-reported jump count", () => {
    const result = profileInputSchema.parse({
      ...validProfileInput,
      selfReportedJumpCount: "120",
    });

    expect(result.selfReportedJumpCount).toBe(120);
  });

  it("rejects negative self-reported jump count", () => {
    expect(
      profileInputSchema.safeParse({
        ...validProfileInput,
        selfReportedJumpCount: "-1",
      }).success,
    ).toBe(false);
  });

  it("rejects too large self-reported jump count", () => {
    expect(
      profileInputSchema.safeParse({
        ...validProfileInput,
        selfReportedJumpCount: "100001",
      }).success,
    ).toBe(false);
  });

  it("rejects decimal self-reported jump count", () => {
    expect(
      profileInputSchema.safeParse({
        ...validProfileInput,
        selfReportedJumpCount: "1.5",
      }).success,
    ).toBe(false);
  });

  it("accepts valid self-reported max height", () => {
    const result = profileInputSchema.parse({
      ...validProfileInput,
      selfReportedMaxHeightMeters: "100",
    });

    expect(result.selfReportedMaxHeightMeters).toBe(100);
  });

  it("rejects negative self-reported max height", () => {
    expect(
      profileInputSchema.safeParse({
        ...validProfileInput,
        selfReportedMaxHeightMeters: "-1",
      }).success,
    ).toBe(false);
  });

  it("rejects too large self-reported max height", () => {
    expect(
      profileInputSchema.safeParse({
        ...validProfileInput,
        selfReportedMaxHeightMeters: "1001",
      }).success,
    ).toBe(false);
  });

  it("trims self-reported experience text", () => {
    const result = profileInputSchema.parse({
      ...validProfileInput,
      selfReportedExperience: "  Прыгаю с 2015 года.  ",
    });

    expect(result.selfReportedExperience).toBe("Прыгаю с 2015 года.");
  });

  it("rejects too long self-reported experience text", () => {
    expect(
      profileInputSchema.safeParse({
        ...validProfileInput,
        selfReportedExperience: "а".repeat(1001),
      }).success,
    ).toBe(false);
  });
});
