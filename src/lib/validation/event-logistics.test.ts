import { describe, expect, it } from "vitest";

import { EventLogisticsType } from "@/generated/prisma/enums";
import {
  eventLogisticsCreateInputSchema,
  eventLogisticsPostIdInputSchema,
} from "@/lib/validation/event-logistics";

const eventId = "clx0a1b2c0000abcd1234efgh";
const postId = "clx0a1b2c0001abcd1234efgh";

describe("event logistics validation", () => {
  it("accepts a valid seat offer", () => {
    expect(
      eventLogisticsCreateInputSchema.parse({
        eventId,
        type: EventLogisticsType.OFFER_SEAT,
        fromLocation: "Москва",
        seatsAvailable: 2,
        body: "Есть два места в машине, детали обсудим в чате.",
      }).type,
    ).toBe(EventLogisticsType.OFFER_SEAT);
  });

  it("accepts a valid need-seat post", () => {
    expect(
      eventLogisticsCreateInputSchema.parse({
        eventId,
        type: EventLogisticsType.NEED_SEAT,
        body: "Ищу место от метро, готов разделить расходы.",
      }).type,
    ).toBe(EventLogisticsType.NEED_SEAT);
  });

  it("accepts a valid going-together post", () => {
    expect(
      eventLogisticsCreateInputSchema.parse({
        eventId,
        type: EventLogisticsType.GOING_TOGETHER,
        body: "Планирую добираться своим ходом, ищу компанию.",
      }).type,
    ).toBe(EventLogisticsType.GOING_TOGETHER);
  });

  it("trims body", () => {
    expect(
      eventLogisticsCreateInputSchema.parse({
        eventId,
        type: EventLogisticsType.NEED_SEAT,
        body: "  Ищу попутчиков до общего места сбора.  ",
      }).body,
    ).toBe("Ищу попутчиков до общего места сбора.");
  });

  it("rejects too short body", () => {
    expect(
      eventLogisticsCreateInputSchema.safeParse({
        eventId,
        type: EventLogisticsType.NEED_SEAT,
        body: "Кратко",
      }).success,
    ).toBe(false);
  });

  it("rejects too long body", () => {
    expect(
      eventLogisticsCreateInputSchema.safeParse({
        eventId,
        type: EventLogisticsType.NEED_SEAT,
        body: "а".repeat(1001),
      }).success,
    ).toBe(false);
  });

  it("rejects invalid event id", () => {
    expect(
      eventLogisticsCreateInputSchema.safeParse({
        eventId: "bad-id",
        type: EventLogisticsType.NEED_SEAT,
        body: "Ищу место от общего района сбора.",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid post id", () => {
    expect(
      eventLogisticsPostIdInputSchema.safeParse({ postId: "bad-id" }).success,
    ).toBe(false);
    expect(eventLogisticsPostIdInputSchema.parse({ postId }).postId).toBe(
      postId,
    );
  });

  it("rejects negative seats count", () => {
    expect(
      eventLogisticsCreateInputSchema.safeParse({
        eventId,
        type: EventLogisticsType.OFFER_SEAT,
        seatsAvailable: -1,
        body: "Есть место в машине от города.",
      }).success,
    ).toBe(false);
  });

  it("rejects too high seats count", () => {
    expect(
      eventLogisticsCreateInputSchema.safeParse({
        eventId,
        type: EventLogisticsType.OFFER_SEAT,
        seatsAvailable: 21,
        body: "Есть место в машине от города.",
      }).success,
    ).toBe(false);
  });
});
