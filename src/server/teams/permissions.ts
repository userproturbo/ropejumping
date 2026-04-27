import "server-only";

import { TeamRole } from "@/generated/prisma/enums";
import type { db } from "@/server/db";

type TeamPermissionDb = Pick<typeof db, "teamMember">;

type TeamPermissionInput = {
  db: TeamPermissionDb;
  teamId: string;
  userId: string;
};

const getTeamMembership = ({ db, teamId, userId }: TeamPermissionInput) => {
  return db.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },
  });
};

const hasAnyTeamRole = async (
  input: TeamPermissionInput,
  allowedRoles: TeamRole[],
) => {
  const membership = await getTeamMembership(input);

  return membership ? allowedRoles.includes(membership.role) : false;
};

export const isTeamMember = async (input: TeamPermissionInput) => {
  const membership = await getTeamMembership(input);

  return Boolean(membership);
};

export const hasTeamOwnerOrAdminRole = (input: TeamPermissionInput) => {
  return hasAnyTeamRole(input, [TeamRole.OWNER, TeamRole.ADMIN]);
};

export const hasTeamOwnerAdminOrOrganizerRole = (
  input: TeamPermissionInput,
) => {
  return hasAnyTeamRole(input, [
    TeamRole.OWNER,
    TeamRole.ADMIN,
    TeamRole.ORGANIZER,
  ]);
};
