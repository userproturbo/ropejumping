import { describe, expect, it } from "vitest";

import { ObjectType } from "@/generated/prisma/enums";
import { eventCreateInputSchema } from "@/lib/validation/event";
import { objectCreateInputSchema } from "@/lib/validation/object";
import { postCreateInputSchema } from "@/lib/validation/post";
import { profileInputSchema } from "@/lib/validation/profile";
import { teamCreateInputSchema } from "@/lib/validation/team";

const cuid = "clx0a1b2c0000abcd1234efgh";

describe("media relation validation", () => {
  it("accepts profile avatar media ids", () => {
    const result = profileInputSchema.parse({
      avatarMediaId: cuid,
      avatarUrl: "https://example.com/avatar.jpg",
      bio: "",
      city: "",
      displayName: "Jumper",
      externalExperience: "",
      username: "jumper",
    });

    expect(result.avatarMediaId).toBe(cuid);
  });

  it("accepts team logo media ids", () => {
    const result = teamCreateInputSchema.parse({
      description: "",
      logoMediaId: cuid,
      logoUrl: "https://example.com/logo.jpg",
      name: "Team",
      region: "",
      slug: "team",
    });

    expect(result.logoMediaId).toBe(cuid);
  });

  it("accepts event cover media ids", () => {
    const result = eventCreateInputSchema.parse({
      capacity: "",
      coverImageUrl: "https://example.com/cover.jpg",
      coverMediaId: cuid,
      description: "",
      endsAt: "",
      levelText: "",
      objectId: "",
      priceText: "",
      region: "",
      requirementsText: "",
      slug: "event",
      startsAt: "2026-06-01T10:00:00.000Z",
      teamId: cuid,
      title: "Event title",
    });

    expect(result.coverMediaId).toBe(cuid);
  });

  it("accepts object cover media ids", () => {
    const result = objectCreateInputSchema.parse({
      coverImageUrl: "https://example.com/object.jpg",
      coverMediaId: cuid,
      description: "",
      heightMeters: "",
      name: "Bridge",
      region: "",
      slug: "bridge",
      teamId: cuid,
      type: ObjectType.BRIDGE,
    });

    expect(result.coverMediaId).toBe(cuid);
  });

  it("accepts post image media ids", () => {
    const result = postCreateInputSchema.parse({
      content: "post",
      imageMediaId: cuid,
      imageUrl: "https://example.com/post.jpg",
    });

    expect(result.imageMediaId).toBe(cuid);
  });

  it("rejects invalid media ids", () => {
    expect(
      postCreateInputSchema.safeParse({
        content: "post",
        imageMediaId: "not-a-cuid",
        imageUrl: "https://example.com/post.jpg",
      }).success,
    ).toBe(false);
  });
});
