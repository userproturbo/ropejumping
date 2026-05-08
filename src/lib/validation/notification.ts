import { z } from "zod";

export const notificationIdInputSchema = z.object({
  notificationId: z.string().cuid(),
});
