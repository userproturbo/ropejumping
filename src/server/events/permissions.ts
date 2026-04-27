import "server-only";

import type { db } from "@/server/db";
import { hasTeamOwnerAdminOrOrganizerRole } from "@/server/teams/permissions";

type EventPermissionDb = Pick<typeof db, "event" | "teamMember">;

type EventPermissionInput = {
  db: EventPermissionDb;
  userId: string;
};

export const canCreateEventForTeam = ({
  db,
  teamId,
  userId,
}: EventPermissionInput & { teamId: string }) => {
  return hasTeamOwnerAdminOrOrganizerRole({
    db,
    teamId,
    userId,
  });
};

export const canManageEvent = async ({
  db,
  eventId,
  userId,
}: EventPermissionInput & { eventId: string }) => {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      createdById: true,
      teamId: true,
    },
  });

  if (!event) return false;
  if (event.createdById === userId) return true;

  return hasTeamOwnerAdminOrOrganizerRole({
    db,
    teamId: event.teamId,
    userId,
  });
};
