"use client";

import { useRef, useState, type ChangeEvent } from "react";

import {
  allowedImageContentTypes,
  maxImageUploadSizeBytes,
} from "@/lib/validation/upload";
import { api } from "@/trpc/react";

type ImageUploadFieldProps = {
  id?: string;
  onChange: (value: string) => void;
  value: string;
};

const supportedImageTypes = new Set<string>(allowedImageContentTypes);

export function ImageUploadField({
  id = "imageUpload",
  onChange,
  value,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploaded, setIsUploaded] = useState(false);
  const [isPuttingFile, setIsPuttingFile] = useState(false);

  const createImageUpload = api.upload.createImageUpload.useMutation();
  const isUploading = createImageUpload.isPending || isPuttingFile;

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
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

    try {
      setIsPuttingFile(true);

      const upload = await createImageUpload.mutateAsync({
        contentType: file.type as (typeof allowedImageContentTypes)[number],
        fileName: file.name,
        sizeBytes: file.size,
      });

      const response = await fetch(upload.uploadUrl, {
        body: file,
        headers: upload.headers,
        method: upload.method,
      });

      if (!response.ok) {
        throw new Error("Не удалось загрузить изображение.");
      }

      onChange(upload.publicUrl);
      setIsUploaded(true);
    } catch (uploadError) {
      setError(getUploadErrorMessage(uploadError));
    } finally {
      setIsPuttingFile(false);
      event.target.value = "";
    }
  };

  const clearImage = () => {
    onChange("");
    setError(null);
    setIsUploaded(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor={id}
          className="inline-flex cursor-pointer items-center bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-800"
        >
          {isUploading ? "Изображение загружается..." : "Загрузить изображение"}
        </label>
        {value ? (
          <button
            type="button"
            onClick={clearImage}
            className="text-sm text-zinc-600 hover:text-zinc-950"
          >
            Удалить изображение
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={allowedImageContentTypes.join(",")}
        disabled={isUploading}
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

      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
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

  return "Не удалось загрузить изображение.";
};
