import { describe, expect, it } from "vitest";

import { objectLikeInputSchema } from "@/lib/validation/object-like";

const cuid = "clx0a1b2c0000abcd1234efgh";

describe("object like validation", () => {
  it("accepts valid object ids", () => {
    const result = objectLikeInputSchema.parse({ objectId: cuid });

    expect(result.objectId).toBe(cuid);
  });

  it("rejects invalid object ids", () => {
    expect(objectLikeInputSchema.safeParse({ objectId: "bad-id" }).success).toBe(
      false,
    );
  });
});
