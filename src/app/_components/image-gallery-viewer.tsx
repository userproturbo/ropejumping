"use client";

import { useCallback, useEffect, useState } from "react";

export type GalleryViewerImage = {
  alt: string;
  caption?: string | null;
  id: string;
  url: string;
};

type ImageGalleryViewerProps = {
  captionClassName?: string;
  className?: string;
  imageClassName?: string;
  images: GalleryViewerImage[];
};

export function ImageGalleryViewer({
  captionClassName = "mt-2 block text-sm leading-5 text-zinc-600",
  className = "grid grid-cols-2 gap-4 lg:grid-cols-3",
  imageClassName = "h-40 w-full border border-zinc-200 object-cover sm:h-52",
  images,
}: ImageGalleryViewerProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedImage =
    selectedIndex === null ? null : (images[selectedIndex] ?? null);
  const hasMultipleImages = images.length > 1;

  const close = useCallback(() => setSelectedIndex(null), []);
  const showPrevious = useCallback(() => {
    setSelectedIndex((currentIndex) =>
      currentIndex === null
        ? currentIndex
        : (currentIndex - 1 + images.length) % images.length,
    );
  }, [images.length]);
  const showNext = useCallback(() => {
    setSelectedIndex((currentIndex) =>
      currentIndex === null ? currentIndex : (currentIndex + 1) % images.length,
    );
  }, [images.length]);

  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }

      if (event.key === "ArrowLeft" && hasMultipleImages) {
        showPrevious();
      }

      if (event.key === "ArrowRight" && hasMultipleImages) {
        showNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [close, hasMultipleImages, selectedIndex, showNext, showPrevious]);

  if (images.length === 0) return null;

  return (
    <>
      <div className={className}>
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setSelectedIndex(index)}
            aria-label={`Открыть изображение ${index + 1}`}
            className="block text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt={image.alt} className={imageClassName} />
            {image.caption ? (
              <span className={captionClassName}>{image.caption}</span>
            ) : null}
          </button>
        ))}
      </div>

      {selectedImage ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={close}
        >
          <div
            className="flex max-h-full max-w-full flex-col items-center gap-4"
            onClick={(event) => event.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage.url}
              alt={selectedImage.alt}
              className="max-h-[calc(100vh-8rem)] max-w-[calc(100vw-2rem)] object-contain"
            />
            <div className="flex flex-wrap justify-center gap-3">
              {selectedImage.caption ? (
                <p className="w-full text-center text-sm leading-6 text-white">
                  {selectedImage.caption}
                </p>
              ) : null}
              {hasMultipleImages ? (
                <button
                  type="button"
                  onClick={showPrevious}
                  className="bg-white px-4 py-2 text-sm text-zinc-950 hover:bg-zinc-200"
                >
                  Предыдущее
                </button>
              ) : null}
              {hasMultipleImages ? (
                <button
                  type="button"
                  onClick={showNext}
                  className="bg-white px-4 py-2 text-sm text-zinc-950 hover:bg-zinc-200"
                >
                  Следующее
                </button>
              ) : null}
              <a
                href={selectedImage.url}
                target="_blank"
                rel="noreferrer"
                className="bg-white px-4 py-2 text-sm text-zinc-950 hover:bg-zinc-200"
              >
                Открыть оригинал
              </a>
              <button
                type="button"
                onClick={close}
                className="bg-white px-4 py-2 text-sm text-zinc-950 hover:bg-zinc-200"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
