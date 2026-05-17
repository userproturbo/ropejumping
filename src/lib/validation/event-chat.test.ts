import { describe, expect, it } from "vitest";

import {
  eventChatDeleteInputSchema,
  eventChatListInputSchema,
  eventChatMarkReadInputSchema,
  eventChatSendInputSchema,
  eventChatUpdateInputSchema,
} from "@/lib/validation/event-chat";

const eventId = "clx0a1b2c0000abcd1234efgh";
const messageId = "clx0a1b2c0001abcd1234efgh";

describe("event chat validation", () => {
  it("accepts valid send input", () => {
    expect(
      eventChatSendInputSchema.parse({
        eventId,
        body: "Буду на месте к началу сбора.",
      }),
    ).toEqual({
      eventId,
      body: "Буду на месте к началу сбора.",
    });
  });

  it("accepts valid reply target", () => {
    expect(
      eventChatSendInputSchema.parse({
        eventId,
        body: "Отвечаю на вопрос выше.",
        replyToMessageId: messageId,
      }),
    ).toEqual({
      eventId,
      body: "Отвечаю на вопрос выше.",
      replyToMessageId: messageId,
    });
  });

  it("rejects invalid reply target", () => {
    expect(
      eventChatSendInputSchema.safeParse({
        eventId,
        body: "Отвечаю на вопрос выше.",
        replyToMessageId: "bad-id",
      }).success,
    ).toBe(false);
  });

  it("trims message body", () => {
    expect(
      eventChatSendInputSchema.parse({
        eventId,
        body: "  Встречаемся у обозначенной точки сбора.  ",
      }).body,
    ).toBe("Встречаемся у обозначенной точки сбора.");
  });

  it("rejects empty body", () => {
    expect(
      eventChatSendInputSchema.safeParse({
        eventId,
        body: "   ",
      }).success,
    ).toBe(false);
  });

  it("rejects body longer than 2000 characters", () => {
    expect(
      eventChatSendInputSchema.safeParse({
        eventId,
        body: "а".repeat(2001),
      }).success,
    ).toBe(false);
  });

  it("rejects invalid event id", () => {
    expect(
      eventChatSendInputSchema.safeParse({
        eventId: "bad-id",
        body: "Сообщение",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid message ids", () => {
    expect(
      eventChatUpdateInputSchema.safeParse({
        messageId: "bad-id",
        body: "Сообщение",
      }).success,
    ).toBe(false);
    expect(
      eventChatDeleteInputSchema.safeParse({
        messageId: "bad-id",
      }).success,
    ).toBe(false);
  });

  it("defaults and validates list limit", () => {
    expect(eventChatListInputSchema.parse({ eventId }).limit).toBe(30);
    expect(eventChatListInputSchema.parse({ eventId, limit: 50 }).limit).toBe(
      50,
    );
    expect(
      eventChatListInputSchema.safeParse({ eventId, limit: 51 }).success,
    ).toBe(false);
  });

  it("accepts valid cursor", () => {
    expect(
      eventChatListInputSchema.parse({ eventId, cursor: messageId }).cursor,
    ).toBe(messageId);
  });

  it("accepts valid mark-read input", () => {
    expect(eventChatMarkReadInputSchema.parse({ eventId })).toEqual({
      eventId,
    });
  });

  it("rejects invalid mark-read event id", () => {
    expect(
      eventChatMarkReadInputSchema.safeParse({ eventId: "bad-id" }).success,
    ).toBe(false);
  });
});
