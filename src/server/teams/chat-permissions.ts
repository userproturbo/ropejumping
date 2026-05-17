import "server-only";

import { TRPCError } from "@trpc/server";

import { TeamRole } from "@/generated/prisma/enums";
import type { db as database } from "@/server/db";
import { isModeratorUser } from "@/server/moderation/permissions";

type TeamChatPermissionDb = Pick<typeof database, "team">;

type TeamChatPermissionInput = {
  db: TeamChatPermissionDb;
  teamId: string;
  userId: string;
};

type TeamChatModerationInput = TeamChatPermissionInput & {
  user?: {
    email?: string | null;
  } | null;
};

const chatMemberRoles = [
  TeamRole.OWNER,
  TeamRole.ADMIN,
  TeamRole.ORGANIZER,
  TeamRole.MEMBER,
];
const managerRoles = [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.ORGANIZER];

export const canAccessTeamChat = async ({
  db,
  teamId,
  userId,
}: TeamChatPermissionInput) => {
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: {
      members: {
        where: {
          userId,
          role: {
            in: chatMemberRoles,
          },
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!team) {
    return {
      allowed: false,
      reason: "not_found",
    };
  }

  if (team.members.length > 0) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "forbidden",
  };
};

export const assertCanAccessTeamChat = async (
  input: TeamChatPermissionInput,
) => {
  const access = await canAccessTeamChat(input);

  if (access.allowed) return;

  if (access.reason === "not_found") {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Команда не найдена.",
    });
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "У вас нет доступа к чату этой команды.",
  });
};

export const canModerateTeamChat = async ({
  db,
  teamId,
  userId,
  user,
}: TeamChatModerationInput) => {
  const team = await db.team.findUnique({
    where: { id: teamId },
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
  });

  if (!team) {
    return {
      allowed: false,
      reason: "not_found",
    };
  }

  if (team.members.length > 0 || isModeratorUser(user)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "forbidden",
  };
};

export const assertCanModerateTeamChat = async (
  input: TeamChatModerationInput,
) => {
  const access = await canModerateTeamChat(input);

  if (access.allowed) return;

  if (access.reason === "not_found") {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Команда не найдена.",
    });
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "У вас нет прав модерировать чат этой команды.",
  });
};
