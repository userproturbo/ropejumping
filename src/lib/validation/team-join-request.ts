import { z } from "zod";

import { teamSlugSchema } from "@/lib/validation/team";

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const nullableString = (schema: z.ZodString) =>
  z.preprocess(emptyToNull, schema.nullable().optional()).transform(
    (value) => value ?? null,
  );

export const teamJoinRequestCreateInputSchema = z.object({
  teamSlug: teamSlugSchema,
  message: nullableString(z.string().max(1000)),
});

export const teamJoinRequestActionInputSchema = z.object({
  requestId: z.string().cuid(),
});

export const teamJoinRequestTeamSlugInputSchema = teamSlugSchema;

export type TeamJoinRequestCreateInput = z.infer<
  typeof teamJoinRequestCreateInputSchema
>;
