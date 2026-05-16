import { describe, expect, it } from "vitest";

import {
  followObjectInputSchema,
  followTeamInputSchema,
} from "@/lib/validation/follow";

const cuid = "clx0a1b2c0000abcd1234efgh";

describe("follow validation", () => {
  it("accepts valid team ids", () => {
    const result = followTeamInputSchema.parse({ teamId: cuid });

    expect(result.teamId).toBe(cuid);
  });

  it("rejects invalid team ids", () => {
    expect(followTeamInputSchema.safeParse({ teamId: "bad-id" }).success).toBe(
      false,
    );
  });

  it("accepts valid object ids", () => {
    const result = followObjectInputSchema.parse({ objectId: cuid });

    expect(result.objectId).toBe(cuid);
  });

  it("rejects invalid object ids", () => {
    expect(
      followObjectInputSchema.safeParse({ objectId: "bad-id" }).success,
    ).toBe(false);
  });
});
