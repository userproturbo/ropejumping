import { describe, expect, it } from "vitest";

import { TeamFunctionRole, TeamRole } from "@/generated/prisma/enums";
import {
  teamLeaveInputSchema,
  teamMemberAddInputSchema,
  teamMemberUpdateFunctionRolesInputSchema,
  teamMemberUpdateRoleInputSchema,
  teamOwnershipTransferInputSchema,
} from "@/lib/validation/team-member";

const cuid = "clx0a1b2c0000abcd1234efgh";

describe("team member validation", () => {
  it("accepts manageable member roles", () => {
    for (const role of [TeamRole.ADMIN, TeamRole.ORGANIZER, TeamRole.MEMBER]) {
      const result = teamMemberAddInputSchema.safeParse({
        teamSlug: "team-slug",
        username: "jumper",
        role,
        functionRoles: [],
      });

      expect(result.success).toBe(true);
    }
  });

  it("rejects owner role in normal member add and update schemas", () => {
    expect(
      teamMemberAddInputSchema.safeParse({
        teamSlug: "team-slug",
        username: "jumper",
        role: TeamRole.OWNER,
        functionRoles: [],
      }).success,
    ).toBe(false);
    expect(
      teamMemberUpdateRoleInputSchema.safeParse({
        membershipId: cuid,
        role: TeamRole.OWNER,
      }).success,
    ).toBe(false);
  });

  it("deduplicates function roles", () => {
    const result = teamMemberUpdateFunctionRolesInputSchema.parse({
      membershipId: cuid,
      functionRoles: [
        TeamFunctionRole.OPERATOR,
        TeamFunctionRole.OPERATOR,
        TeamFunctionRole.MEDIC,
      ],
    });

    expect(result.functionRoles).toEqual([
      TeamFunctionRole.OPERATOR,
      TeamFunctionRole.MEDIC,
    ]);
  });

  it("validates leave input team slug", () => {
    expect(teamLeaveInputSchema.parse({ teamSlug: " Team-Slug " })).toEqual({
      teamSlug: "team-slug",
    });
    expect(teamLeaveInputSchema.safeParse({ teamSlug: "bad slug" }).success).toBe(
      false,
    );
  });

  it("requires a cuid for ownership transfer", () => {
    expect(
      teamOwnershipTransferInputSchema.safeParse({
        newOwnerMembershipId: cuid,
      }).success,
    ).toBe(true);
    expect(
      teamOwnershipTransferInputSchema.safeParse({
        newOwnerMembershipId: "not-a-cuid",
      }).success,
    ).toBe(false);
  });
});
