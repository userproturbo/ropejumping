import { z } from "zod";

const eventChatBodySchema = z
  .string()
  .trim()
  .min(1, "Сообщение не должно быть пустым.")
  .max(2000, "Сообщение не должно быть длиннее 2000 символов.");

export const eventChatListInputSchema = z.object({
  eventId: z.string().cuid(),
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(50).optional().default(30),
});

export const eventChatSendInputSchema = z.object({
  eventId: z.string().cuid(),
  body: eventChatBodySchema,
  replyToMessageId: z.string().cuid().optional(),
});

export const eventChatUpdateInputSchema = z.object({
  messageId: z.string().cuid(),
  body: eventChatBodySchema,
});

export const eventChatDeleteInputSchema = z.object({
  messageId: z.string().cuid(),
});
