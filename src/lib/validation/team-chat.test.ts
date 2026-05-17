import { describe, expect, it } from "vitest";

import {
  teamChatDeleteInputSchema,
  teamChatListInputSchema,
  teamChatMarkReadInputSchema,
  teamChatSendInputSchema,
  teamChatUpdateInputSchema,
} from "@/lib/validation/team-chat";

const teamId = "clx0a1b2c0000abcd1234efgh";
const messageId = "clx0a1b2c0001abcd1234efgh";

describe("team chat validation", () => {
  it("accepts valid send input", () => {
    expect(
      teamChatSendInputSchema.parse({
        teamId,
        body: "Нужно распределить задачи на ближайший выезд.",
      }),
    ).toEqual({
      teamId,
      body: "Нужно распределить задачи на ближайший выезд.",
    });
  });

  it("trims message body", () => {
    expect(
      teamChatSendInputSchema.parse({
        teamId,
        body: "  Обновил список оборудования.  ",
      }).body,
    ).toBe("Обновил список оборудования.");
  });

  it("rejects empty body", () => {
    expect(
      teamChatSendInputSchema.safeParse({
        teamId,
        body: "   ",
      }).success,
    ).toBe(false);
  });

  it("rejects body longer than 2000 characters", () => {
    expect(
      teamChatSendInputSchema.safeParse({
        teamId,
        body: "а".repeat(2001),
      }).success,
    ).toBe(false);
  });

  it("accepts valid reply target", () => {
    expect(
      teamChatSendInputSchema.parse({
        teamId,
        body: "Отвечаю на сообщение выше.",
        replyToMessageId: messageId,
      }),
    ).toEqual({
      teamId,
      body: "Отвечаю на сообщение выше.",
      replyToMessageId: messageId,
    });
  });

  it("rejects invalid team id and message ids", () => {
    expect(
      teamChatSendInputSchema.safeParse({
        teamId: "bad-id",
        body: "Сообщение",
      }).success,
    ).toBe(false);
    expect(
      teamChatUpdateInputSchema.safeParse({
        messageId: "bad-id",
        body: "Сообщение",
      }).success,
    ).toBe(false);
    expect(
      teamChatDeleteInputSchema.safeParse({
        messageId: "bad-id",
      }).success,
    ).toBe(false);
    expect(
      teamChatSendInputSchema.safeParse({
        teamId,
        body: "Сообщение",
        replyToMessageId: "bad-id",
      }).success,
    ).toBe(false);
  });

  it("defaults and validates list limit", () => {
    expect(teamChatListInputSchema.parse({ teamId }).limit).toBe(30);
    expect(teamChatListInputSchema.parse({ teamId, limit: 50 }).limit).toBe(50);
    expect(
      teamChatListInputSchema.safeParse({ teamId, limit: 51 }).success,
    ).toBe(false);
  });

  it("accepts valid mark-read input", () => {
    expect(teamChatMarkReadInputSchema.parse({ teamId })).toEqual({
      teamId,
    });
  });

  it("rejects invalid mark-read team id", () => {
    expect(
      teamChatMarkReadInputSchema.safeParse({ teamId: "bad-id" }).success,
    ).toBe(false);
  });
});
