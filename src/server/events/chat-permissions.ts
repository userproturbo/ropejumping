import "server-only";

import { TRPCError } from "@trpc/server";

import { ApplicationStatus, TeamRole } from "@/generated/prisma/enums";
import type { db as database } from "@/server/db";

type EventChatPermissionDb = Pick<typeof database, "event">;

type EventChatPermissionInput = {
  db: EventChatPermissionDb;
  eventId: string;
  userId: string;
};

const managerRoles = [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.ORGANIZER];
const chatApplicationStatuses = [
  ApplicationStatus.ACCEPTED,
  ApplicationStatus.CONFIRMED_PARTICIPATION,
];

export const canAccessEventChat = async ({
  db,
  eventId,
  userId,
}: EventChatPermissionInput) => {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      createdById: true,
      team: {
        select: {
          members: {
            where: {
              userId,
              role: {
                in: managerRoles,
              },
            },
            select: {
              id: true,
            },
            take: 1,
          },
        },
      },
      applications: {
        where: {
          userId,
          status: {
            in: chatApplicationStatuses,
          },
        },
        select: {
          id: true,
        },
        take: 1,
      },
      participations: {
        where: {
          userId,
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!event) {
    return {
      allowed: false,
      reason: "not_found",
    };
  }

  if (event.createdById === userId) {
    return { allowed: true };
  }

  if (event.team.members.length > 0) {
    return { allowed: true };
  }

  if (event.applications.length > 0) {
    return { allowed: true };
  }

  if (event.participations.length > 0) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "forbidden",
  };
};

export const assertCanAccessEventChat = async (
  input: EventChatPermissionInput,
) => {
  const access = await canAccessEventChat(input);

  if (access.allowed) return;

  if (access.reason === "not_found") {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Мероприятие не найдено.",
    });
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "У вас нет доступа к чату этого мероприятия.",
  });
};
