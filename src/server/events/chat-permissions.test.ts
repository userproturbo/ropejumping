import { describe, expect, it, vi } from "vitest";

import { canAccessEventChat } from "@/server/events/chat-permissions";

vi.mock("server-only", () => ({}));

const eventId = "event-1";
const userId = "user-1";

type EventAccessShape = {
  createdById: string;
  team: {
    members: { id: string }[];
  };
  applications: { id: string }[];
  participations: { id: string }[];
};

const createEvent = (overrides: Partial<EventAccessShape> = {}) => ({
  createdById: "creator-1",
  team: {
    members: [],
  },
  applications: [],
  participations: [],
  ...overrides,
});

const createDb = (event: EventAccessShape | null) =>
  ({
    event: {
      findUnique: vi.fn().mockResolvedValue(event),
    },
  }) as never;

describe("event chat permissions", () => {
  it("allows event creator", async () => {
    await expect(
      canAccessEventChat({
        db: createDb(createEvent({ createdById: userId })),
        eventId,
        userId,
      }),
    ).resolves.toEqual({ allowed: true });
  });

  it("allows event team owner/admin/organizer membership returned by query", async () => {
    await expect(
      canAccessEventChat({
        db: createDb(
          createEvent({
            team: {
              members: [{ id: "member-1" }],
            },
          }),
        ),
        eventId,
        userId,
      }),
    ).resolves.toEqual({ allowed: true });
  });

  it("allows accepted or confirmed applications returned by query", async () => {
    await expect(
      canAccessEventChat({
        db: createDb(
          createEvent({
            applications: [{ id: "application-1" }],
          }),
        ),
        eventId,
        userId,
      }),
    ).resolves.toEqual({ allowed: true });
  });

  it("allows confirmed participations returned by query", async () => {
    await expect(
      canAccessEventChat({
        db: createDb(
          createEvent({
            participations: [{ id: "participation-1" }],
          }),
        ),
        eventId,
        userId,
      }),
    ).resolves.toEqual({ allowed: true });
  });

  it("denies pending or rejected applicants because the query returns no application", async () => {
    await expect(
      canAccessEventChat({
        db: createDb(createEvent()),
        eventId,
        userId,
      }),
    ).resolves.toEqual({ allowed: false, reason: "forbidden" });
  });

  it("denies random users", async () => {
    await expect(
      canAccessEventChat({
        db: createDb(createEvent()),
        eventId,
        userId,
      }),
    ).resolves.toEqual({ allowed: false, reason: "forbidden" });
  });

  it("marks missing event as not found", async () => {
    await expect(
      canAccessEventChat({
        db: createDb(null),
        eventId,
        userId,
      }),
    ).resolves.toEqual({ allowed: false, reason: "not_found" });
  });
});
