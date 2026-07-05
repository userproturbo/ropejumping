"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { api } from "@/trpc/react";

type CommentAuthorActionsProps = {
  canManage: boolean;
  canReply: boolean;
  commentId: string;
  initialContent: string;
  postId: string;
};

export function CommentAuthorActions({
  canManage,
  canReply,
  commentId,
  initialContent,
  postId,
}: CommentAuthorActionsProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [replyContent, setReplyContent] = useState("");
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isReplying) replyTextareaRef.current?.focus();
  }, [isReplying]);

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
  const addReply = api.post.addComment.useMutation({
    onSuccess: () => {
      setReplyContent("");
      setIsReplying(false);
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

  const handleReplySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    addReply.mutate({
      postId,
      parentId: commentId,
      content: replyContent,
    });
  };

  const handleEditStart = () => {
    setIsReplying(false);
    setIsEditing(true);
  };

  const handleReplyStart = () => {
    setIsEditing(false);
    setIsReplying(true);
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
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-1">
        <Link
          href={`/reports/new?targetType=COMMENT&targetId=${commentId}`}
          aria-label="Пожаловаться на комментарий"
          className="group inline-flex h-8 w-8 items-center justify-center text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
        >
          <CommentActionIcon src="/svg/complain.svg" />
        </Link>
        {canReply ? (
          <button
            type="button"
            aria-label="Ответить на комментарий"
            aria-expanded={isReplying}
            onClick={handleReplyStart}
            className="group inline-flex h-8 w-8 items-center justify-center text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
          >
            <CommentActionIcon src="/svg/answer.svg" />
          </button>
        ) : null}
        {canManage ? (
          <>
            <button
              type="button"
              aria-label="Редактировать комментарий"
              onClick={handleEditStart}
              className="group inline-flex h-8 w-8 items-center justify-center text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
            >
              <CommentActionIcon src="/svg/edit-comment.svg" />
            </button>
            <button
              type="button"
              aria-label="Удалить комментарий"
              disabled={deleteComment.isPending}
              onClick={handleDelete}
              className="group inline-flex h-8 w-8 items-center justify-center text-[var(--app-muted)] transition hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CommentActionIcon src="/svg/delete.svg" />
            </button>
          </>
        ) : null}
      </div>

      {isReplying ? (
        <form onSubmit={handleReplySubmit} className="mt-3 grid gap-3">
          <label
            htmlFor={`reply-${commentId}`}
            className="text-sm font-medium text-zinc-950"
          >
            Ответить на комментарий
          </label>
          <textarea
            ref={replyTextareaRef}
            id={`reply-${commentId}`}
            value={replyContent}
            onChange={(event) => setReplyContent(event.target.value)}
            required
            maxLength={1000}
            rows={3}
            className="resize-y border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
          />
          {addReply.error ? (
            <p className="text-sm text-red-700">{addReply.error.message}</p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={addReply.isPending}
              className="bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {addReply.isPending ? "Отправка..." : "Ответить"}
            </button>
            <button
              type="button"
              onClick={() => setIsReplying(false)}
              className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
            >
              Отмена
            </button>
          </div>
        </form>
      ) : null}

      {deleteComment.error ? (
        <p className="mt-2 text-sm text-red-700">
          {deleteComment.error.message}
        </p>
      ) : null}
    </div>
  );
}

function CommentActionIcon({ src }: { src: string }) {
  return (
    <Image
      src={src}
      alt=""
      aria-hidden="true"
      width={18}
      height={18}
      className="feed-icon h-[18px] w-[18px] shrink-0 opacity-90 transition group-hover:opacity-100"
    />
  );
}
