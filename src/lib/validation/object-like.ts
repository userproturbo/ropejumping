import { z } from "zod";

export const objectLikeInputSchema = z.object({
  objectId: z.string().cuid(),
});
