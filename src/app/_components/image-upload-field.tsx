"use client";

import { useRef, useState, type ChangeEvent } from "react";

import {
  allowedImageContentTypes,
  maxImageUploadSizeBytes,
} from "@/lib/validation/upload";
import { api } from "@/trpc/react";

export type ImageUploadValue = {
  mediaId: string | null;
  url: string;
};

type ImageUploadFieldProps = {
  id?: string;
  onChange: (value: ImageUploadValue) => void;
  value: ImageUploadValue;
};

const supportedImageTypes = new Set<string>(allowedImageContentTypes);
const uploadFailedMessage =
  "Не удалось загрузить изображение. Попробуйте ещё раз.";

export function ImageUploadField({
  id = "imageUpload",
  onChange,
  value,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploaded, setIsUploaded] = useState(false);
  const [uploadedMediaId, setUploadedMediaId] = useState<string | null>(null);
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);
  const [isPuttingFile, setIsPuttingFile] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const createImageUpload = api.upload.createImageUpload.useMutation();
  const confirmImageUpload = api.upload.confirmImageUpload.useMutation();
  const markImageUploadFailed = api.upload.markImageUploadFailed.useMutation();
  const deleteMyMedia = api.upload.deleteMyMedia.useMutation();
  const isUploading =
    createImageUpload.isPending ||
    confirmImageUpload.isPending ||
    isPuttingFile;
  const isBusy = isUploading || isDeleting;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setError(null);
    setIsUploaded(false);

    if (!supportedImageTypes.has(file.type)) {
      setError("Поддерживаются JPEG, PNG, WebP и GIF.");
      event.target.value = "";
      return;
    }

    if (file.size > maxImageUploadSizeBytes) {
      setError("Файл слишком большой. Максимум 10 МБ.");
      event.target.value = "";
      return;
    }

    let mediaId: string | null = null;

    try {
      setIsPuttingFile(true);

      const upload = await createImageUpload.mutateAsync({
        contentType: file.type as (typeof allowedImageContentTypes)[number],
        fileName: file.name,
        sizeBytes: file.size,
      });
      mediaId = upload.mediaId;

      const response = await fetch(upload.uploadUrl, {
        body: file,
        headers: upload.headers,
        method: upload.method,
      });

      if (!response.ok) {
        throw new Error(uploadFailedMessage);
      }

      const confirmedMedia = await confirmImageUpload.mutateAsync(
        upload.mediaId,
      );

      if (!confirmedMedia.url) {
        throw new Error(uploadFailedMessage);
      }

      onChange({ mediaId: confirmedMedia.id, url: confirmedMedia.url });
      setUploadedMediaId(confirmedMedia.id);
      setUploadedMediaUrl(confirmedMedia.url);
      setIsUploaded(true);
    } catch (uploadError) {
      if (mediaId) {
        try {
          await markImageUploadFailed.mutateAsync(mediaId);
        } catch {
          // The user-facing failure is the upload itself; marking failed is best effort.
        }
      }

      setError(getUploadErrorMessage(uploadError));
    } finally {
      setIsPuttingFile(false);
      event.target.value = "";
    }
  };

  const clearImage = async () => {
    setError(null);
    setIsUploaded(false);

    try {
      if (
        uploadedMediaId &&
        uploadedMediaId === value.mediaId &&
        uploadedMediaUrl === value.url
      ) {
        setIsDeleting(true);
        await deleteMyMedia.mutateAsync(uploadedMediaId);
      }

      onChange({ mediaId: null, url: "" });
      setUploadedMediaId(null);
      setUploadedMediaUrl(null);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (deleteError) {
      setError(getDeleteErrorMessage(deleteError));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor={id}
          aria-disabled={isBusy}
          className={`inline-flex items-center px-4 py-2 text-sm text-white ${
            isBusy
              ? "cursor-not-allowed bg-zinc-400"
              : "cursor-pointer bg-zinc-950 hover:bg-zinc-800"
          }`}
        >
          {isUploading ? "Изображение загружается..." : "Загрузить изображение"}
        </label>
        {value.url ? (
          <button
            type="button"
            onClick={clearImage}
            disabled={isBusy}
            className="text-sm text-zinc-600 hover:text-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-300"
          >
            {isDeleting ? "Удаление..." : "Удалить изображение"}
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={allowedImageContentTypes.join(",")}
        disabled={isBusy}
        onChange={handleFileChange}
        className="sr-only"
      />

      <p className="text-xs text-zinc-500">
        Поддерживаются JPEG, PNG, WebP и GIF. Максимум 10 МБ.
      </p>

      {isUploaded ? (
        <p className="text-sm text-emerald-700">Изображение загружено</p>
      ) : null}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {value.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value.url}
          alt="Предпросмотр изображения"
          className="max-h-80 w-full border border-zinc-200 object-contain"
        />
      ) : null}
    </div>
  );
}

const getUploadErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return uploadFailedMessage;
};

const getDeleteErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Не удалось удалить изображение. Попробуйте ещё раз.";
};
