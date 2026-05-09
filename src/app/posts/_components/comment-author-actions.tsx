"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { api } from "@/trpc/react";

type CommentAuthorActionsProps = {
  commentId: string;
  initialContent: string;
};

export function CommentAuthorActions({
  commentId,
  initialContent,
}: CommentAuthorActionsProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);

  const updateComment = api.post.updateCommentMine.useMutation({
    onSuccess: () => {
      setIsEditing(false);
      router.refresh();
    },
  });
  const deleteComment = api.post.deleteCommentMine.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    updateComment.mutate({
      commentId,
      content,
    });
  };

  const handleCancel = () => {
    setContent(initialContent);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!window.confirm("Удалить комментарий?")) return;

    deleteComment.mutate({ commentId });
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="mt-3 grid gap-3">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          required
          maxLength={1000}
          rows={4}
          className="resize-y border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
        />

        {updateComment.error ? (
          <p className="text-sm text-red-700">{updateComment.error.message}</p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={updateComment.isPending}
            className="bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {updateComment.isPending ? "Сохранение..." : "Сохранить"}
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
    <div className="mt-3 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-xs text-zinc-500 hover:text-zinc-950"
      >
        Редактировать
      </button>
      <button
        type="button"
        disabled={deleteComment.isPending}
        onClick={handleDelete}
        className="text-xs text-red-700 hover:text-red-900 disabled:cursor-not-allowed disabled:text-red-300"
      >
        {deleteComment.isPending ? "Удаление..." : "Удалить"}
      </button>
      {deleteComment.error ? (
        <p className="basis-full text-sm text-red-700">
          {deleteComment.error.message}
        </p>
      ) : null}
    </div>
  );
}
