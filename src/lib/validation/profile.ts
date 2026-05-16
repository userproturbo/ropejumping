import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const nullableString = (schema: z.ZodString) =>
  z.preprocess(emptyToNull, schema.nullable().optional());

const nullableInteger = (max: number, message: string) =>
  z
    .preprocess(
      emptyToNull,
      z.coerce
        .number({
          invalid_type_error: message,
        })
        .int(message)
        .min(0, message)
        .max(max, message)
        .nullable()
        .optional(),
    )
    .transform((value) => value ?? null);

const optionalCuid = z
  .preprocess(emptyToNull, z.string().cuid().nullable().optional())
  .transform((value) => value ?? null);

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
  avatarMediaId: optionalCuid,
  externalExperience: nullableString(z.string().max(1000)).transform(
    (value) => value ?? null,
  ),
  selfReportedJumpCount: nullableInteger(
    100000,
    "Количество прыжков должно быть от 0 до 100000.",
  ),
  selfReportedMaxHeightMeters: nullableInteger(
    1000,
    "Максимальная высота должна быть от 0 до 1000 метров.",
  ),
  selfReportedExperience: nullableString(z.string().max(1000)).transform(
    (value) => value ?? null,
  ),
});

export const profileUsernameLookupSchema = usernameSchema.refine(
  (value) => value !== null,
  "Имя пользователя обязательно",
);

export type ProfileInput = z.infer<typeof profileInputSchema>;
