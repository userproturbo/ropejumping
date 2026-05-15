"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";

import {
  ImageGalleryViewer,
  type GalleryViewerImage,
} from "@/app/_components/image-gallery-viewer";
import {
  allowedImageContentTypes,
  maxImageUploadSizeBytes,
} from "@/lib/validation/upload";
import { api } from "@/trpc/react";

type GalleryImage = {
  id: string;
  media: {
    id: string;
    url: string | null;
    alt: string | null;
  };
};

type ImageGalleryManagerProps = {
  images: GalleryImage[];
  mode: "event" | "object";
  targetId: string;
};

const maxImagesPerSelection = 10;
const supportedImageTypes = new Set<string>(allowedImageContentTypes);
const uploadFailedMessage =
  "Часть изображений не удалось загрузить. Проверьте файлы и попробуйте ещё раз.";

export function ImageGalleryManager({
  images,
  mode,
  targetId,
}: ImageGalleryManagerProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const createImageUpload = api.upload.createImageUpload.useMutation();
  const confirmImageUpload = api.upload.confirmImageUpload.useMutation();
  const markImageUploadFailed = api.upload.markImageUploadFailed.useMutation();
  const deleteMyMedia = api.upload.deleteMyMedia.useMutation();
  const eventAddImage = api.gallery.eventAddImage.useMutation();
  const eventRemoveImage = api.gallery.eventRemoveImage.useMutation();
  const objectAddImage = api.gallery.objectAddImage.useMutation();
  const objectRemoveImage = api.gallery.objectRemoveImage.useMutation();
  const isUploading = uploadProgress !== null;
  const removingId =
    mode === "event"
      ? eventRemoveImage.variables?.galleryImageId
      : objectRemoveImage.variables?.galleryImageId;
  const visibleImages = images.filter(
    (
      image,
    ): image is GalleryImage & {
      media: GalleryImage["media"] & { url: string };
    } => Boolean(image.media.url),
  );

  const addGalleryImage = async (mediaId: string) => {
    if (mode === "event") {
      await eventAddImage.mutateAsync({
        eventId: targetId,
        mediaId,
      });
      return;
    }

    await objectAddImage.mutateAsync({
      objectId: targetId,
      mediaId,
    });
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) return;

    setError(null);
    setSuccess(null);

    if (files.length > maxImagesPerSelection) {
      setError("Можно загрузить до 10 изображений за раз.");
      event.target.value = "";
      return;
    }

    const invalidFile = files.find(
      (file) => !supportedImageTypes.has(file.type),
    );
    if (invalidFile) {
      setError("Поддерживаются JPEG, PNG, WebP и GIF.");
      event.target.value = "";
      return;
    }

    const tooLargeFile = files.find(
      (file) => file.size > maxImageUploadSizeBytes,
    );
    if (tooLargeFile) {
      setError("Файл слишком большой. Максимум 10 МБ.");
      event.target.value = "";
      return;
    }

    let failed = false;
    let added = 0;

    for (const [index, file] of files.entries()) {
      let mediaId: string | null = null;

      setUploadProgress({
        current: index + 1,
        total: files.length,
      });

      try {
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

        await addGalleryImage(confirmedMedia.id);
        added += 1;
      } catch {
        failed = true;

        if (mediaId) {
          try {
            await markImageUploadFailed.mutateAsync(mediaId);
          } catch {
            // The visible error is the upload batch; marking failed is best effort.
          }

          try {
            await deleteMyMedia.mutateAsync(mediaId);
          } catch {
            // If gallery attach failed after confirmation, cleanup can retry later.
          }
        }
      }
    }

    setUploadProgress(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    if (added > 0) {
      setSuccess("Изображения загружены");
      router.refresh();
    }

    if (failed) {
      setError(uploadFailedMessage);
    }
  };

  const handleRemove = async (galleryImageId: string) => {
    setError(null);

    try {
      if (mode === "event") {
        await eventRemoveImage.mutateAsync({ galleryImageId });
      } else {
        await objectRemoveImage.mutateAsync({ galleryImageId });
      }

      router.refresh();
    } catch {
      setError("Не удалось обновить галерею. Попробуйте ещё раз.");
    }
  };

  return (
    <section className="mt-6 border border-zinc-200 bg-white p-6">
      <h2 className="text-xl font-semibold text-zinc-950">
        {mode === "event" ? "Галерея мероприятия" : "Галерея объекта"}
      </h2>

      {images.length > 0 ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleImages.map((image) => (
            <div key={image.id} className="border border-zinc-200 p-3">
              <ImageGalleryViewer
                images={[toViewerImage(image)]}
                imageClassName="h-36 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(image.id)}
                disabled={removingId === image.id}
                className="mt-3 text-sm text-zinc-600 hover:text-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-300"
              >
                {removingId === image.id ? "Удаление..." : "Удалить из галереи"}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-600">
          В галерее пока нет изображений.
        </p>
      )}

      <div className="mt-6">
        <p className="mb-3 text-sm font-medium text-zinc-950">
          Добавить изображения
        </p>
        <label
          htmlFor={`${mode}-gallery-upload`}
          aria-disabled={isUploading}
          className={`inline-flex items-center px-4 py-2 text-sm text-white ${
            isUploading
              ? "cursor-not-allowed bg-zinc-400"
              : "cursor-pointer bg-zinc-950 hover:bg-zinc-800"
          }`}
        >
          {isUploading
            ? `Загрузка ${uploadProgress.current} из ${uploadProgress.total}...`
            : "Загрузить изображения"}
        </label>
        <input
          ref={inputRef}
          id={`${mode}-gallery-upload`}
          type="file"
          multiple
          accept={allowedImageContentTypes.join(",")}
          disabled={isUploading}
          onChange={handleFileChange}
          className="sr-only"
        />
        <p className="mt-3 text-xs text-zinc-500">
          Поддерживаются JPEG, PNG, WebP и GIF. Максимум 10 МБ, до 10
          изображений за раз.
        </p>
      </div>

      {success ? (
        <p className="mt-4 text-sm text-emerald-700">{success}</p>
      ) : null}
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}

const toViewerImage = (
  image: GalleryImage & { media: GalleryImage["media"] & { url: string } },
): GalleryViewerImage => ({
  id: image.id,
  url: image.media.url,
  alt: image.media.alt ?? "Изображение галереи",
});
