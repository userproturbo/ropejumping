import { z } from "zod";

export const allowedImageContentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AllowedImageContentType =
  (typeof allowedImageContentTypes)[number];

export const maxImageUploadSizeBytes = 10 * 1024 * 1024;

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
