import { describe, expect, it } from "vitest";

import { ObjectVisibility } from "@/generated/prisma/enums";
import { summarizeParticipationHistory } from "@/server/events/participation-history";

const createParticipation = ({
  objectId,
  heightMeters,
  visibility = ObjectVisibility.PUBLIC,
}: {
  objectId: string | null;
  heightMeters: number | null;
  visibility?: ObjectVisibility;
}) => ({
  event: {
    objectId,
    object:
      objectId === null
        ? null
        : {
            heightMeters,
            visibility,
          },
  },
});

describe("participation history summary", () => {
  it("counts confirmed participations", () => {
    expect(
      summarizeParticipationHistory([
        createParticipation({ objectId: "object-1", heightMeters: 45 }),
        createParticipation({ objectId: "object-2", heightMeters: 60 }),
      ]).confirmedEventsCount,
    ).toBe(2);
  });

  it("counts unique objects", () => {
    expect(
      summarizeParticipationHistory([
        createParticipation({ objectId: "object-1", heightMeters: 45 }),
        createParticipation({ objectId: "object-1", heightMeters: 45 }),
        createParticipation({ objectId: "object-2", heightMeters: 60 }),
      ]).uniqueObjectsCount,
    ).toBe(2);
  });

  it("ignores null objects", () => {
    expect(
      summarizeParticipationHistory([
        createParticipation({ objectId: null, heightMeters: null }),
        createParticipation({ objectId: "object-1", heightMeters: 45 }),
      ]).uniqueObjectsCount,
    ).toBe(1);
  });

  it("does not count hidden objects", () => {
    expect(
      summarizeParticipationHistory([
        createParticipation({ objectId: "object-1", heightMeters: 45 }),
        createParticipation({
          objectId: "object-2",
          heightMeters: 80,
          visibility: ObjectVisibility.HIDDEN,
        }),
      ]).uniqueObjectsCount,
    ).toBe(1);
  });

  it("computes max height", () => {
    expect(
      summarizeParticipationHistory([
        createParticipation({ objectId: "object-1", heightMeters: 45 }),
        createParticipation({ objectId: "object-2", heightMeters: null }),
        createParticipation({ objectId: "object-3", heightMeters: 80 }),
      ]).maxHeightMeters,
    ).toBe(80);
  });

  it("ignores hidden object height for max height", () => {
    expect(
      summarizeParticipationHistory([
        createParticipation({ objectId: "object-1", heightMeters: 45 }),
        createParticipation({
          objectId: "object-2",
          heightMeters: 120,
          visibility: ObjectVisibility.HIDDEN,
        }),
      ]).maxHeightMeters,
    ).toBe(45);
  });

  it("handles empty history", () => {
    expect(summarizeParticipationHistory([])).toEqual({
      confirmedEventsCount: 0,
      uniqueObjectsCount: 0,
      maxHeightMeters: null,
    });
  });
});
