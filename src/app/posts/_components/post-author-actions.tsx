"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { ImageUploadField } from "@/app/_components/image-upload-field";
import { api } from "@/trpc/react";

type PostAuthorActionsProps = {
  initialContent: string;
  initialImageUrl: string | null;
  postId: string;
};

export function PostAuthorActions({
  initialContent,
  initialImageUrl,
  postId,
}: PostAuthorActionsProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [imageUrl, setImageUrl] = useState(initialImageUrl ?? "");

  const updatePost = api.post.updateMine.useMutation({
    onSuccess: () => {
      setIsEditing(false);
      router.refresh();
    },
  });
  const deletePost = api.post.deleteMine.useMutation({
    onSuccess: () => {
      router.push("/feed");
      router.refresh();
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    updatePost.mutate({
      postId,
      content,
      imageUrl,
    });
  };

  const handleCancel = () => {
    setContent(initialContent);
    setImageUrl(initialImageUrl ?? "");
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!window.confirm("Удалить пост?")) return;

    deletePost.mutate({ postId });
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="mt-5 grid gap-3">
        <label
          htmlFor={`post-content-${postId}`}
          className="text-sm font-medium text-zinc-950"
        >
          Текст поста
        </label>
        <textarea
          id={`post-content-${postId}`}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          required
          maxLength={2000}
          rows={6}
          className="resize-y border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
        />

        <div className="grid gap-3">
          <p className="text-sm font-medium text-zinc-950">Изображение</p>
          <ImageUploadField
            id={`post-image-upload-${postId}`}
            value={imageUrl}
            onChange={setImageUrl}
          />
        </div>

        <div className="grid gap-2">
          <label
            htmlFor={`post-image-${postId}`}
            className="text-sm font-medium text-zinc-950"
          >
            Ссылка на изображение вручную
          </label>
          <input
            id={`post-image-${postId}`}
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            type="url"
            className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
            placeholder="https://example.com/image.jpg"
          />
        </div>

        {updatePost.error ? (
          <p className="text-sm text-red-700">{updatePost.error.message}</p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={updatePost.isPending}
            className="bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {updatePost.isPending ? "Сохранение..." : "Сохранить"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
          >
            Отмена
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="mt-5 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
      >
        Редактировать
      </button>
      <button
        type="button"
        disabled={deletePost.isPending}
        onClick={handleDelete}
        className="border border-red-200 px-4 py-2 text-sm text-red-700 hover:border-red-700 disabled:cursor-not-allowed disabled:text-red-300"
      >
        {deletePost.isPending ? "Удаление..." : "Удалить"}
      </button>
      {deletePost.error ? (
        <p className="basis-full text-sm text-red-700">
          {deletePost.error.message}
        </p>
      ) : null}
    </div>
  );
}
