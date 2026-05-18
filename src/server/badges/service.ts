import { Prisma } from "@/generated/prisma/client";
import { EventStatus, ObjectVisibility } from "@/generated/prisma/enums";
import type { db as database } from "@/server/db";

import { automaticBadgeDefinitions } from "./definitions";

type BadgeServiceDb = Pick<
  typeof database,
  "badge" | "eventParticipation" | "userBadge"
>;

const automaticBadgeReason =
  "Автоматически выдано за подтверждённую историю участия.";

const isUniqueConstraintError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

export const ensureBadgeCatalog = async (db: BadgeServiceDb) => {
  await Promise.all(
    automaticBadgeDefinitions.map((badge) =>
      db.badge.upsert({
        where: {
          code: badge.code,
        },
        create: {
          code: badge.code,
          name: badge.name,
          description: badge.description,
          category: badge.category,
          isManual: false,
        },
        update: {
          name: badge.name,
          description: badge.description,
          category: badge.category,
          isManual: false,
        },
      }),
    ),
  );
};

export const recalculateAutomaticBadgesForUser = async ({
  db,
  userId,
  awardedById = null,
}: {
  db: BadgeServiceDb;
  userId: string;
  awardedById?: string | null;
}): Promise<{
  awardedBadgeCodes: string[];
}> => {
  await ensureBadgeCatalog(db);

  const participations = await db.eventParticipation.findMany({
    where: {
      userId,
      event: {
        status: EventStatus.COMPLETED,
      },
    },
    select: {
      event: {
        select: {
          objectId: true,
          object: {
            select: {
              id: true,
              visibility: true,
              heightMeters: true,
            },
          },
        },
      },
    },
  });

  const participationCount = participations.length;
  const publicObjectIds = new Set<string>();
  let maxPublicHeightMeters = 0;

  participations.forEach((participation) => {
    const object = participation.event.object;

    if (object?.visibility !== ObjectVisibility.PUBLIC) return;

    publicObjectIds.add(object.id);

    if (object.heightMeters !== null) {
      maxPublicHeightMeters = Math.max(
        maxPublicHeightMeters,
        object.heightMeters,
      );
    }
  });

  const eligibleDefinitions = automaticBadgeDefinitions.filter((badge) => {
    if (badge.type === "participation") {
      return participationCount >= badge.threshold;
    }

    if (badge.type === "objects") {
      return publicObjectIds.size >= badge.threshold;
    }

    return maxPublicHeightMeters >= badge.threshold;
  });

  if (eligibleDefinitions.length === 0) {
    return {
      awardedBadgeCodes: [],
    };
  }

  const eligibleCodes = eligibleDefinitions.map((badge) => badge.code);
  const badges = await db.badge.findMany({
    where: {
      code: {
        in: eligibleCodes,
      },
    },
    select: {
      id: true,
      code: true,
    },
  });
  const existingUserBadges = await db.userBadge.findMany({
    where: {
      userId,
      badgeId: {
        in: badges.map((badge) => badge.id),
      },
    },
    select: {
      badgeId: true,
    },
  });
  const existingBadgeIds = new Set(
    existingUserBadges.map((userBadge) => userBadge.badgeId),
  );
  const missingBadges = badges.filter(
    (badge) => !existingBadgeIds.has(badge.id),
  );
  const awardedBadgeCodes: string[] = [];

  for (const badge of missingBadges) {
    try {
      await db.userBadge.create({
        data: {
          userId,
          badgeId: badge.id,
          awardedById,
          reason: automaticBadgeReason,
        },
      });
      awardedBadgeCodes.push(badge.code);
    } catch (error) {
      if (isUniqueConstraintError(error)) continue;

      throw error;
    }
  }

  return {
    awardedBadgeCodes,
  };
};

export const recalculateUserBadges = (
  db: BadgeServiceDb,
  userId: string,
  awardedById?: string | null,
) =>
  recalculateAutomaticBadgesForUser({
    db,
    userId,
    awardedById,
  });
