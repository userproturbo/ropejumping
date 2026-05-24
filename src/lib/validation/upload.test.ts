import { describe, expect, it } from "vitest";

import {
  imageUploadCreateInputSchema,
  maxRadioAudioUploadSizeBytes,
  maxImageUploadSizeBytes,
  mediaIdInputSchema,
  radioAudioUploadCreateInputSchema,
  radioCoverUploadCreateInputSchema,
} from "@/lib/validation/upload";

const validUploadInput = {
  contentType: "image/jpeg",
  fileName: "jump.jpg",
  sizeBytes: 1024,
};

describe("upload validation", () => {
  it("accepts JPEG images", () => {
    expect(
      imageUploadCreateInputSchema.safeParse(validUploadInput).success,
    ).toBe(true);
  });

  it("accepts PNG images", () => {
    expect(
      imageUploadCreateInputSchema.safeParse({
        ...validUploadInput,
        contentType: "image/png",
      }).success,
    ).toBe(true);
  });

  it("accepts WebP images", () => {
    expect(
      imageUploadCreateInputSchema.safeParse({
        ...validUploadInput,
        contentType: "image/webp",
      }).success,
    ).toBe(true);
  });

  it("accepts GIF images", () => {
    expect(
      imageUploadCreateInputSchema.safeParse({
        ...validUploadInput,
        contentType: "image/gif",
      }).success,
    ).toBe(true);
  });

  it("rejects SVG images", () => {
    expect(
      imageUploadCreateInputSchema.safeParse({
        ...validUploadInput,
        contentType: "image/svg+xml",
      }).success,
    ).toBe(false);
  });

  it("rejects HTML files", () => {
    expect(
      imageUploadCreateInputSchema.safeParse({
        ...validUploadInput,
        contentType: "text/html",
      }).success,
    ).toBe(false);
  });

  it("rejects empty content type", () => {
    expect(
      imageUploadCreateInputSchema.safeParse({
        ...validUploadInput,
        contentType: "",
      }).success,
    ).toBe(false);
  });

  it("rejects zero size", () => {
    expect(
      imageUploadCreateInputSchema.safeParse({
        ...validUploadInput,
        sizeBytes: 0,
      }).success,
    ).toBe(false);
  });

  it("rejects negative size", () => {
    expect(
      imageUploadCreateInputSchema.safeParse({
        ...validUploadInput,
        sizeBytes: -1,
      }).success,
    ).toBe(false);
  });

  it("rejects size above limit", () => {
    expect(
      imageUploadCreateInputSchema.safeParse({
        ...validUploadInput,
        sizeBytes: maxImageUploadSizeBytes + 1,
      }).success,
    ).toBe(false);
  });

  it("trims file names", () => {
    const result = imageUploadCreateInputSchema.parse({
      ...validUploadInput,
      fileName: "  jump.png  ",
    });

    expect(result.fileName).toBe("jump.png");
  });

  it("rejects very long file names", () => {
    expect(
      imageUploadCreateInputSchema.safeParse({
        ...validUploadInput,
        fileName: "a".repeat(201),
      }).success,
    ).toBe(false);
  });

  it("accepts valid media ids", () => {
    expect(
      mediaIdInputSchema.safeParse("clx0a1b2c0000abcd1234efgh").success,
    ).toBe(true);
  });

  it("rejects invalid media ids", () => {
    expect(mediaIdInputSchema.safeParse("not-a-cuid").success).toBe(false);
  });

  it("accepts radio MP3 uploads", () => {
    expect(
      radioAudioUploadCreateInputSchema.safeParse({
        contentType: "audio/mpeg",
        fileName: "track.mp3",
        sizeBytes: 1024,
      }).success,
    ).toBe(true);
  });

  it("accepts radio M4A uploads", () => {
    expect(
      radioAudioUploadCreateInputSchema.safeParse({
        contentType: "audio/x-m4a",
        fileName: "track.m4a",
        sizeBytes: 1024,
      }).success,
    ).toBe(true);
  });

  it("rejects non-audio radio uploads", () => {
    expect(
      radioAudioUploadCreateInputSchema.safeParse({
        contentType: "text/html",
        fileName: "track.html",
        sizeBytes: 1024,
      }).success,
    ).toBe(false);
  });

  it("rejects radio audio files above the size limit", () => {
    expect(
      radioAudioUploadCreateInputSchema.safeParse({
        contentType: "audio/mpeg",
        fileName: "track.mp3",
        sizeBytes: maxRadioAudioUploadSizeBytes + 1,
      }).success,
    ).toBe(false);
  });

  it("accepts radio cover image uploads", () => {
    expect(
      radioCoverUploadCreateInputSchema.safeParse({
        contentType: "image/webp",
        fileName: "cover.webp",
        sizeBytes: 1024,
      }).success,
    ).toBe(true);
  });
});
