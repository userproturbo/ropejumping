import { beforeAll, describe, expect, it, vi } from "vitest";

import { TeamRole } from "@/generated/prisma/enums";
import type {
  canAccessTeamChat as CanAccessTeamChat,
  canModerateTeamChat as CanModerateTeamChat,
} from "@/server/teams/chat-permissions";

process.env.DATABASE_URL ??= "postgresql://user:password@localhost:5432/test";
process.env.MODERATOR_EMAILS = "moderator@example.com";

vi.mock("server-only", () => ({}));

const teamId = "team-1";
const userId = "user-1";

type TeamAccessShape = {
  members: { id: string }[];
};

const createTeam = (members: { id: string }[] = [{ id: "member-1" }]) => ({
  members,
});

const createDb = (team: TeamAccessShape | null) =>
  ({
    team: {
      findUnique: vi.fn().mockResolvedValue(team),
    },
  });

const asPermissionDb = (db: ReturnType<typeof createDb>) => db as never;

describe("team chat permissions", () => {
  let canAccessTeamChat: typeof CanAccessTeamChat;
  let canModerateTeamChat: typeof CanModerateTeamChat;

  beforeAll(async () => {
    ({ canAccessTeamChat, canModerateTeamChat } = await import(
      "@/server/teams/chat-permissions"
    ));
  });

  it.each([
    TeamRole.OWNER,
    TeamRole.ADMIN,
    TeamRole.ORGANIZER,
    TeamRole.MEMBER,
  ])("allows %s to read and write", async () => {
    const db = createDb(createTeam());

    await expect(
      canAccessTeamChat({
        db: asPermissionDb(db),
        teamId,
        userId,
      }),
    ).resolves.toEqual({ allowed: true });

    expect(db.team.findUnique).toHaveBeenCalledWith({
      where: { id: teamId },
      select: {
        members: {
          where: {
            userId,
            role: {
              in: [
                TeamRole.OWNER,
                TeamRole.ADMIN,
                TeamRole.ORGANIZER,
                TeamRole.MEMBER,
              ],
            },
          },
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });
  });

  it.each([TeamRole.OWNER, TeamRole.ADMIN, TeamRole.ORGANIZER])(
    "allows %s to moderate",
    async () => {
      await expect(
        canModerateTeamChat({
          db: asPermissionDb(createDb(createTeam())),
          teamId,
          userId,
        }),
      ).resolves.toEqual({ allowed: true });
    },
  );

  it("denies MEMBER moderation because the manager query returns no membership", async () => {
    await expect(
      canModerateTeamChat({
        db: asPermissionDb(createDb(createTeam([]))),
        teamId,
        userId,
      }),
    ).resolves.toEqual({ allowed: false, reason: "forbidden" });
  });

  it("allows configured global moderators to moderate", async () => {
    await expect(
      canModerateTeamChat({
        db: asPermissionDb(createDb(createTeam([]))),
        teamId,
        userId,
        user: {
          email: "moderator@example.com",
        },
      }),
    ).resolves.toEqual({ allowed: true });
  });

  it("denies random users", async () => {
    await expect(
      canAccessTeamChat({
        db: asPermissionDb(createDb(createTeam([]))),
        teamId,
        userId,
      }),
    ).resolves.toEqual({ allowed: false, reason: "forbidden" });
  });

  it("denies pending join requests because they are not team members", async () => {
    await expect(
      canAccessTeamChat({
        db: asPermissionDb(createDb(createTeam([]))),
        teamId,
        userId,
      }),
    ).resolves.toEqual({ allowed: false, reason: "forbidden" });
  });

  it("marks missing team as not found", async () => {
    await expect(
      canAccessTeamChat({
        db: asPermissionDb(createDb(null)),
        teamId,
        userId,
      }),
    ).resolves.toEqual({ allowed: false, reason: "not_found" });
  });
});
