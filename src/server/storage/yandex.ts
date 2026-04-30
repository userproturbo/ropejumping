import "server-only";

import { randomBytes } from "node:crypto";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/env";
import type { AllowedImageContentType } from "@/lib/validation/upload";

const imageExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} satisfies Record<AllowedImageContentType, string>;

type YandexStorageConfig = {
  accessKeyId: string;
  bucket: string;
  endpoint: string;
  publicUrl: string;
  region: string;
  secretAccessKey: string;
};

const getYandexStorageConfig = (): YandexStorageConfig | null => {
  const accessKeyId = env.YANDEX_OBJECT_STORAGE_ACCESS_KEY_ID;
  const bucket = env.YANDEX_OBJECT_STORAGE_BUCKET;
  const endpoint = env.YANDEX_OBJECT_STORAGE_ENDPOINT;
  const publicUrl = env.YANDEX_OBJECT_STORAGE_PUBLIC_URL;
  const region = env.YANDEX_OBJECT_STORAGE_REGION;
  const secretAccessKey = env.YANDEX_OBJECT_STORAGE_SECRET_ACCESS_KEY;

  if (
    !accessKeyId ||
    !bucket ||
    !endpoint ||
    !publicUrl ||
    !region ||
    !secretAccessKey
  ) {
    return null;
  }

  return {
    accessKeyId,
    bucket,
    endpoint,
    publicUrl,
    region,
    secretAccessKey,
  };
};

export const isYandexStorageConfigured = () =>
  getYandexStorageConfig() !== null;

const getConfiguredYandexStorage = () => {
  const config = requireYandexStorageConfig();

  const client = new S3Client({
    endpoint: config.endpoint,
    forcePathStyle: true,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return { client, config };
};

const requireYandexStorageConfig = () => {
  const config = getYandexStorageConfig();

  if (!config) {
    throw new Error("Хранилище изображений не настроено.");
  }

  return config;
};

const sanitizeKeySegment = (value: string) =>
  value.replace(/[^a-zA-Z0-9_-]/g, "_");

export const createImageObjectKey = (
  userId: string,
  contentType: AllowedImageContentType,
  date = new Date(),
) => {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const random = randomBytes(16).toString("hex");
  const extension = imageExtensions[contentType];

  return `uploads/${sanitizeKeySegment(userId)}/${year}/${month}/${random}.${extension}`;
};

export const buildYandexStoragePublicUrl = (key: string) => {
  const config = requireYandexStorageConfig();
  const baseUrl = config.publicUrl.replace(/\/+$/, "");
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");

  return `${baseUrl}/${encodedKey}`;
};

export const createPresignedImagePutUrl = async ({
  contentType,
  key,
}: {
  contentType: AllowedImageContentType;
  key: string;
}) => {
  const { client, config } = getConfiguredYandexStorage();
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });

  return {
    bucket: config.bucket,
    publicUrl: buildYandexStoragePublicUrl(key),
    uploadUrl,
  };
};
