import { describe, expect, it } from "vitest";

import {
  objectImpressionCreateInputSchema,
  objectImpressionDeleteInputSchema,
  objectImpressionUpdateInputSchema,
} from "@/lib/validation/object-impression";

const cuid = "clx0a1b2c0000abcd1234efgh";
const validBody = "Очень красивое место, удобно смотреть со стороны.";

describe("object impression validation", () => {
  it("accepts valid body", () => {
    const result = objectImpressionCreateInputSchema.parse({
      objectId: cuid,
      body: validBody,
    });

    expect(result.body).toBe(validBody);
  });

  it("trims body", () => {
    const result = objectImpressionCreateInputSchema.parse({
      objectId: cuid,
      body: `  ${validBody}  `,
    });

    expect(result.body).toBe(validBody);
  });

  it("rejects too short body", () => {
    expect(
      objectImpressionCreateInputSchema.safeParse({
        objectId: cuid,
        body: "слишком коротко",
      }).success,
    ).toBe(false);
  });

  it("rejects too long body", () => {
    expect(
      objectImpressionCreateInputSchema.safeParse({
        objectId: cuid,
        body: "а".repeat(2001),
      }).success,
    ).toBe(false);
  });

  it("rejects invalid object ids", () => {
    expect(
      objectImpressionCreateInputSchema.safeParse({
        objectId: "bad-id",
        body: validBody,
      }).success,
    ).toBe(false);
  });

  it("rejects invalid impression ids", () => {
    expect(
      objectImpressionUpdateInputSchema.safeParse({
        impressionId: "bad-id",
        body: validBody,
      }).success,
    ).toBe(false);
    expect(
      objectImpressionDeleteInputSchema.safeParse({
        impressionId: "bad-id",
      }).success,
    ).toBe(false);
  });
});
