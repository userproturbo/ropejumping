import { describe, expect, it } from "vitest";

import {
  reportCreateInputSchema,
  reportListInputSchema,
} from "@/lib/validation/report";

const targetId = "clx0a1b2c0000abcd1234efgh";

describe("report list validation", () => {
  it("accepts supported moderation statuses", () => {
    for (const status of ["OPEN", "REVIEWED", "RESOLVED", "DISMISSED", "ALL"]) {
      expect(reportListInputSchema.parse({ status }).status).toBe(status);
    }
  });

  it("normalizes unknown status to open", () => {
    expect(reportListInputSchema.parse({ status: "BAD_VALUE" }).status).toBe(
      "OPEN",
    );
  });

  it("accepts supported target types", () => {
    for (const targetType of [
      "POST",
      "COMMENT",
      "OBJECT",
      "OBJECT_IMPRESSION",
      "EVENT_CHAT_MESSAGE",
      "EVENT_LOGISTICS_POST",
      "TEAM_CHAT_MESSAGE",
    ]) {
      expect(reportListInputSchema.parse({ targetType }).targetType).toBe(
        targetType,
      );
    }
  });

  it("ignores unknown target type", () => {
    expect(
      reportListInputSchema.parse({ targetType: "TEAM" }).targetType,
    ).toBeUndefined();
  });

  it("accepts object impression reports", () => {
    const result = reportCreateInputSchema.parse({
      targetType: "OBJECT_IMPRESSION",
      targetId,
      reason: "Нарушение правил безопасности или сообщества",
      details: "",
    });

    expect(result).toEqual({
      targetType: "OBJECT_IMPRESSION",
      targetId,
      reason: "Нарушение правил безопасности или сообщества",
      details: null,
    });
  });

  it("accepts event chat message reports", () => {
    expect(
      reportCreateInputSchema.parse({
        targetType: "EVENT_CHAT_MESSAGE",
        targetId,
        reason: "Нарушение правил безопасности или сообщества",
        details: null,
      }).targetType,
    ).toBe("EVENT_CHAT_MESSAGE");
  });

  it("accepts team chat message reports", () => {
    expect(
      reportCreateInputSchema.parse({
        targetType: "TEAM_CHAT_MESSAGE",
        targetId,
        reason: "Нарушение правил безопасности или сообщества",
        details: null,
      }).targetType,
    ).toBe("TEAM_CHAT_MESSAGE");
  });

  it("accepts event logistics post reports", () => {
    expect(
      reportCreateInputSchema.parse({
        targetType: "EVENT_LOGISTICS_POST",
        targetId,
        reason: "Нарушение правил безопасности или сообщества",
        details: null,
      }).targetType,
    ).toBe("EVENT_LOGISTICS_POST");
  });

  it("rejects invalid create target types", () => {
    expect(
      reportCreateInputSchema.safeParse({
        targetType: "TEAM",
        targetId,
        reason: "Спам",
        details: null,
      }).success,
    ).toBe(false);
  });

  it("keeps reason and details validation", () => {
    expect(
      reportCreateInputSchema.safeParse({
        targetType: "OBJECT_IMPRESSION",
        targetId,
        reason: "12",
        details: "а".repeat(1001),
      }).success,
    ).toBe(false);
  });
});
