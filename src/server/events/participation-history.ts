import { ObjectVisibility } from "@/generated/prisma/enums";

type ParticipationHistoryItem = {
  event: {
    objectId: string | null;
    object: {
      heightMeters: number | null;
      visibility: ObjectVisibility;
    } | null;
  };
};

export const summarizeParticipationHistory = (
  participations: ParticipationHistoryItem[],
): {
  confirmedEventsCount: number;
  uniqueObjectsCount: number;
  maxHeightMeters: number | null;
} => {
  const objectIds = new Set<string>();
  let maxHeightMeters: number | null = null;

  participations.forEach((participation) => {
    const { objectId, object } = participation.event;
    const isPublicObject = object?.visibility === ObjectVisibility.PUBLIC;

    if (objectId && isPublicObject) {
      objectIds.add(objectId);
    }

    if (
      isPublicObject &&
      object.heightMeters !== null &&
      object.heightMeters !== undefined
    ) {
      maxHeightMeters =
        maxHeightMeters === null
          ? object.heightMeters
          : Math.max(maxHeightMeters, object.heightMeters);
    }
  });

  return {
    confirmedEventsCount: participations.length,
    uniqueObjectsCount: objectIds.size,
    maxHeightMeters,
  };
};
