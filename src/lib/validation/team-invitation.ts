import { z } from "zod";

import { TeamFunctionRole, TeamRole } from "@/generated/prisma/enums";
import { teamSlugSchema } from "@/lib/validation/team";

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const manageableTeamMemberRoleSchema = z.nativeEnum(TeamRole).refine(
  (role) =>
    role === TeamRole.ADMIN ||
    role === TeamRole.ORGANIZER ||
    role === TeamRole.MEMBER,
  "Роль владельца защищена.",
);

const usernameRequiredSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9_-]+$/),
);

const teamFunctionRolesSchema = z.preprocess(
  (value) => (Array.isArray(value) ? Array.from(new Set(value)) : value),
  z.array(z.nativeEnum(TeamFunctionRole)).max(6).default([]),
);

export const teamInvitationCreateInputSchema = z.object({
  teamSlug: teamSlugSchema,
  username: usernameRequiredSchema,
  role: manageableTeamMemberRoleSchema,
  functionRoles: teamFunctionRolesSchema,
  message: z
    .preprocess(emptyToNull, z.string().max(1000).nullable().optional())
    .transform((value) => value ?? null),
});

export const teamInvitationActionInputSchema = z.object({
  invitationId: z.string().cuid(),
});
