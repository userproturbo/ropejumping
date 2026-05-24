import "server-only";

import { randomBytes } from "node:crypto";

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/env";
import type {
  AllowedImageContentType,
  AllowedRadioAudioContentType,
} from "@/lib/validation/upload";

const imageExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} satisfies Record<AllowedImageContentType, string>;

const radioAudioExtensions = {
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
} satisfies Record<AllowedRadioAudioContentType, string>;

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

export const createPendingImageObjectKey = (userId: string) => {
  const random = randomBytes(16).toString("hex");

  return `pending/${sanitizeKeySegment(userId)}/${random}`;
};

export const createImageObjectKey = ({
  contentType,
  date = new Date(),
  mediaId,
  userId,
}: {
  contentType: AllowedImageContentType;
  date?: Date;
  mediaId: string;
  userId: string;
}) => {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const extension = imageExtensions[contentType];

  return [
    "media",
    "images",
    sanitizeKeySegment(userId),
    year,
    month,
    sanitizeKeySegment(mediaId),
    `original.${extension}`,
  ].join("/");
};

export const createRadioAudioObjectKey = ({
  contentType,
  date = new Date(),
  fileName,
}: {
  contentType: AllowedRadioAudioContentType;
  date?: Date;
  fileName?: string;
}) => {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const random = randomBytes(16).toString("hex");
  const extension = radioAudioExtensions[contentType];
  const safeName = fileName
    ? sanitizeKeySegment(fileName.replace(/\.[^.]+$/, "")).slice(0, 80)
    : "track";

  return [
    "radio",
    "audio",
    year,
    month,
    `${safeName || "track"}-${random}.${extension}`,
  ].join("/");
};

export const createRadioCoverObjectKey = ({
  contentType,
  date = new Date(),
  fileName,
}: {
  contentType: AllowedImageContentType;
  date?: Date;
  fileName?: string;
}) => {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const random = randomBytes(16).toString("hex");
  const extension = imageExtensions[contentType];
  const safeName = fileName
    ? sanitizeKeySegment(fileName.replace(/\.[^.]+$/, "")).slice(0, 80)
    : "cover";

  return [
    "radio",
    "covers",
    year,
    month,
    `${safeName || "cover"}-${random}.${extension}`,
  ].join("/");
};

export const getYandexStorageBucket = () => {
  const config = requireYandexStorageConfig();

  return config.bucket;
};

export const isManagedMediaKey = (key: string) =>
  (key.startsWith("media/images/") || key.startsWith("uploads/")) &&
  !key.includes("..") &&
  !key.startsWith("/") &&
  !key.endsWith("/") &&
  !key.split("/").some((segment) => segment.length === 0);

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

export const createPresignedObjectPutUrl = async ({
  contentType,
  key,
}: {
  contentType: string;
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

export const deleteYandexStorageObject = async ({
  bucket,
  key,
}: {
  bucket: string;
  key: string;
}) => {
  const { client } = getConfiguredYandexStorage();
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await client.send(command);
};
