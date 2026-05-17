import { describe, expect, it, vi } from "vitest";

import { EventStatus } from "@/generated/prisma/enums";
import { isEventChatReadOnlyStatus } from "@/server/events/chat-lifecycle";

vi.mock("server-only", () => ({}));

describe("event chat lifecycle", () => {
  it("treats completed events as read-only", () => {
    expect(isEventChatReadOnlyStatus(EventStatus.COMPLETED)).toBe(true);
  });

  it("treats archived events as read-only", () => {
    expect(isEventChatReadOnlyStatus(EventStatus.ARCHIVED)).toBe(true);
  });

  it("treats cancelled events as read-only", () => {
    expect(isEventChatReadOnlyStatus(EventStatus.CANCELLED)).toBe(true);
  });

  it("keeps applications-open events writable", () => {
    expect(isEventChatReadOnlyStatus(EventStatus.APPLICATIONS_OPEN)).toBe(false);
  });

  it("keeps published events writable", () => {
    expect(isEventChatReadOnlyStatus(EventStatus.PUBLISHED)).toBe(false);
  });

  it("keeps postponed events writable", () => {
    expect(isEventChatReadOnlyStatus(EventStatus.POSTPONED)).toBe(false);
  });
});
