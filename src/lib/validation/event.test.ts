import { describe, expect, it } from "vitest";

import { eventCompleteInputSchema } from "@/lib/validation/event";

const eventId = "clx0a1b2c0000abcd1234efgh";
const applicationId = "clx0a1b2c0001abcd1234efgh";

describe("event validation", () => {
  it("accepts valid completion input", () => {
    expect(
      eventCompleteInputSchema.parse({
        eventId,
        confirmedApplicationIds: [applicationId],
        markUnselectedAcceptedAsNoShow: true,
      }),
    ).toEqual({
      eventId,
      confirmedApplicationIds: [applicationId],
      markUnselectedAcceptedAsNoShow: true,
    });
  });

  it("rejects invalid event id", () => {
    expect(
      eventCompleteInputSchema.safeParse({
        eventId: "bad-id",
        confirmedApplicationIds: [applicationId],
      }).success,
    ).toBe(false);
  });

  it("rejects invalid application ids", () => {
    expect(
      eventCompleteInputSchema.safeParse({
        eventId,
        confirmedApplicationIds: ["bad-id"],
      }).success,
    ).toBe(false);
  });

  it("applies completion defaults", () => {
    expect(eventCompleteInputSchema.parse({ eventId })).toEqual({
      eventId,
      confirmedApplicationIds: [],
      markUnselectedAcceptedAsNoShow: false,
    });
  });
});
