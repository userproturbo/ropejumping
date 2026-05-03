import { z } from "zod";

import { TeamRole } from "@/generated/prisma/enums";
import { teamSlugSchema } from "@/lib/validation/team";

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

export const teamMemberAddInputSchema = z.object({
  teamSlug: teamSlugSchema,
  username: usernameRequiredSchema,
  role: manageableTeamMemberRoleSchema,
});

export const teamMemberUpdateRoleInputSchema = z.object({
  membershipId: z.string().cuid(),
  role: manageableTeamMemberRoleSchema,
});

export const teamMemberRemoveInputSchema = z.object({
  membershipId: z.string().cuid(),
});

export type TeamMemberAddInput = z.infer<typeof teamMemberAddInputSchema>;
export type TeamMemberUpdateRoleInput = z.infer<
  typeof teamMemberUpdateRoleInputSchema
>;
