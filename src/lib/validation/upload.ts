import { z } from "zod";

export const allowedImageContentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AllowedImageContentType = (typeof allowedImageContentTypes)[number];

export const allowedRadioAudioContentTypes = [
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/ogg",
] as const;

export type AllowedRadioAudioContentType =
  (typeof allowedRadioAudioContentTypes)[number];

export const maxImageUploadSizeBytes = 10 * 1024 * 1024;
export const maxRadioAudioUploadSizeBytes = 80 * 1024 * 1024;

export const imageUploadCreateInputSchema = z.object({
  fileName: z.string().trim().max(200).optional(),
  contentType: z.enum(allowedImageContentTypes, {
    errorMap: () => ({
      message: "Поддерживаются JPEG, PNG, WebP и GIF.",
    }),
  }),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(maxImageUploadSizeBytes, "Файл слишком большой. Максимум 10 МБ."),
});

export type ImageUploadCreateInput = z.infer<
  typeof imageUploadCreateInputSchema
>;

const radioUploadBaseSchema = z.object({
  fileName: z.string().trim().max(200).optional(),
  sizeBytes: z.number().int().positive(),
});

export const radioAudioUploadCreateInputSchema = radioUploadBaseSchema.extend({
  contentType: z.enum(allowedRadioAudioContentTypes, {
    errorMap: () => ({
      message: "Поддерживаются MP3, M4A, WAV и OGG.",
    }),
  }),
  sizeBytes: radioUploadBaseSchema.shape.sizeBytes.max(
    maxRadioAudioUploadSizeBytes,
    "Файл слишком большой. Максимум 80 МБ.",
  ),
});

export const radioCoverUploadCreateInputSchema = radioUploadBaseSchema.extend({
  contentType: z.enum(allowedImageContentTypes, {
    errorMap: () => ({
      message: "Поддерживаются JPEG, PNG, WebP и GIF.",
    }),
  }),
  sizeBytes: radioUploadBaseSchema.shape.sizeBytes.max(
    maxImageUploadSizeBytes,
    "Файл слишком большой. Максимум 10 МБ.",
  ),
});

export const mediaIdInputSchema = z.string().cuid();
