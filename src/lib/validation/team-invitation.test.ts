import { describe, expect, it } from "vitest";

import { TeamFunctionRole, TeamRole } from "@/generated/prisma/enums";
import {
  teamInvitationActionInputSchema,
  teamInvitationCreateInputSchema,
} from "@/lib/validation/team-invitation";

const cuid = "clx0a1b2c0000abcd1234efgh";

const validInvitation = {
  teamSlug: "team-slug",
  username: "jumper",
  role: TeamRole.MEMBER,
  functionRoles: [],
  message: "",
};

describe("team invitation validation", () => {
  it("trims and lowercases usernames", () => {
    const result = teamInvitationCreateInputSchema.parse({
      ...validInvitation,
      username: " Jumper_One ",
    });

    expect(result.username).toBe("jumper_one");
  });

  it("rejects invalid usernames", () => {
    expect(
      teamInvitationCreateInputSchema.safeParse({
        ...validInvitation,
        username: "@jumper",
      }).success,
    ).toBe(false);
    expect(
      teamInvitationCreateInputSchema.safeParse({
        ...validInvitation,
        username: "ab",
      }).success,
    ).toBe(false);
  });

  it("rejects owner role and accepts manageable roles", () => {
    expect(
      teamInvitationCreateInputSchema.safeParse({
        ...validInvitation,
        role: TeamRole.OWNER,
      }).success,
    ).toBe(false);

    for (const role of [TeamRole.ADMIN, TeamRole.ORGANIZER, TeamRole.MEMBER]) {
      expect(
        teamInvitationCreateInputSchema.safeParse({
          ...validInvitation,
          role,
        }).success,
      ).toBe(true);
    }
  });

  it("deduplicates function roles", () => {
    const result = teamInvitationCreateInputSchema.parse({
      ...validInvitation,
      functionRoles: [
        TeamFunctionRole.PHOTOGRAPHER,
        TeamFunctionRole.PHOTOGRAPHER,
        TeamFunctionRole.MEDIC,
      ],
    });

    expect(result.functionRoles).toEqual([
      TeamFunctionRole.PHOTOGRAPHER,
      TeamFunctionRole.MEDIC,
    ]);
  });

  it("requires a cuid for action input", () => {
    expect(
      teamInvitationActionInputSchema.safeParse({ invitationId: cuid }).success,
    ).toBe(true);
    expect(
      teamInvitationActionInputSchema.safeParse({ invitationId: "bad-id" })
        .success,
    ).toBe(false);
  });
});
