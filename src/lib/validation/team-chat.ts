import { z } from "zod";

const teamChatBodySchema = z
  .string()
  .trim()
  .min(1, "Сообщение не должно быть пустым.")
  .max(2000, "Сообщение не должно быть длиннее 2000 символов.");

export const teamChatListInputSchema = z.object({
  teamId: z.string().cuid(),
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(50).optional().default(30),
});

export const teamChatSendInputSchema = z.object({
  teamId: z.string().cuid(),
  body: teamChatBodySchema,
  replyToMessageId: z.string().cuid().optional(),
});

export const teamChatUpdateInputSchema = z.object({
  messageId: z.string().cuid(),
  body: teamChatBodySchema,
});

export const teamChatDeleteInputSchema = z.object({
  messageId: z.string().cuid(),
});

export const teamChatMarkReadInputSchema = z.object({
  teamId: z.string().cuid(),
});
