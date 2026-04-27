import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const nullableString = (schema: z.ZodString) =>
  z.preprocess(emptyToNull, schema.nullable().optional());

export const usernameSchema = z
  .preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z
      .string()
      .min(3)
      .max(32)
      .regex(/^[a-z0-9_-]+$/)
      .nullable()
      .optional(),
  )
  .transform((value) => value ?? null);

export const profileInputSchema = z.object({
  username: usernameSchema,
  displayName: nullableString(z.string().max(80)).transform(
    (value) => value ?? null,
  ),
  bio: nullableString(z.string().max(500)).transform((value) => value ?? null),
  city: nullableString(z.string().max(80)).transform((value) => value ?? null),
  avatarUrl: nullableString(z.string().url()).transform(
    (value) => value ?? null,
  ),
  externalExperience: nullableString(z.string().max(1000)).transform(
    (value) => value ?? null,
  ),
});

export const profileUsernameLookupSchema = usernameSchema.refine(
  (value) => value !== null,
  "Имя пользователя обязательно",
);

export type ProfileInput = z.infer<typeof profileInputSchema>;
