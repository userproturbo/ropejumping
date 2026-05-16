import { z } from "zod";

export const followTeamInputSchema = z.object({
  teamId: z.string().cuid(),
});

export const followObjectInputSchema = z.object({
  objectId: z.string().cuid(),
});

export const followListInputSchema = z.object({
  limit: z.number().int().min(1).max(50).default(50).optional(),
});
