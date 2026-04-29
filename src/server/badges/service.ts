import { Prisma } from "@/generated/prisma/client";
import type { db as database } from "@/server/db";

import { automaticBadgeDefinitions } from "./definitions";

type BadgeServiceDb = typeof database;

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

export const recalculateUserBadges = async (
  db: BadgeServiceDb,
  userId: string,
  awardedById?: string,
) => {
  await ensureBadgeCatalog(db);

  const participations = await db.eventParticipation.findMany({
    where: {
      userId,
    },
    select: {
      event: {
        select: {
          objectId: true,
          object: {
            select: {
              heightMeters: true,
            },
          },
        },
      },
    },
  });

  const participationCount = participations.length;
  const uniqueObjectIds = new Set(
    participations
      .map((participation) => participation.event.objectId)
      .filter((objectId): objectId is string => Boolean(objectId)),
  );
  const maxHeightMeters = participations.reduce((maxHeight, participation) => {
    return Math.max(maxHeight, participation.event.object?.heightMeters ?? 0);
  }, 0);

  const eligibleDefinitions = automaticBadgeDefinitions.filter((badge) => {
    if (badge.type === "participation") {
      return participationCount >= badge.threshold;
    }

    if (badge.type === "objects") {
      return uniqueObjectIds.size >= badge.threshold;
    }

    return maxHeightMeters >= badge.threshold;
  });

  if (eligibleDefinitions.length === 0) {
    return [];
  }

  const eligibleCodes = eligibleDefinitions.map((badge) => badge.code);
  const badges = await db.badge.findMany({
    where: {
      code: {
        in: eligibleCodes,
      },
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

  const missingBadges = badges.filter((badge) => !existingBadgeIds.has(badge.id));

  const createdBadges = await Promise.all(
    missingBadges.map(async (badge) => {
      try {
        return await db.userBadge.create({
          data: {
            userId,
            badgeId: badge.id,
            awardedById,
            reason: "Автоматически по подтверждённой истории участия.",
          },
          include: {
            badge: true,
          },
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          return null;
        }

        throw error;
      }
    }),
  );

  return createdBadges.filter((badge) => badge !== null);
};
