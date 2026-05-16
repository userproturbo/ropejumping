import { z } from "zod";

const impressionBodySchema = z
  .string()
  .trim()
  .min(20, "Впечатление должно быть не короче 20 символов.")
  .max(2000, "Впечатление не должно быть длиннее 2000 символов.");

export const objectImpressionCreateInputSchema = z.object({
  objectId: z.string().cuid(),
  body: impressionBodySchema,
});

export const objectImpressionUpdateInputSchema = z.object({
  impressionId: z.string().cuid(),
  body: impressionBodySchema,
});

export const objectImpressionDeleteInputSchema = z.object({
  impressionId: z.string().cuid(),
});
