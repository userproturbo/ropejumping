"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { api } from "@/trpc/react";

type PostInteractionsProps = {
  canComment: boolean;
  initialCommentsCount: number;
  initialLiked: boolean;
  initialLikesCount: number;
  isLoggedIn: boolean;
  postId: string;
};

export function PostInteractions({
  canComment,
  initialCommentsCount,
  initialLiked,
  initialLikesCount,
  isLoggedIn,
  postId,
}: PostInteractionsProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);
  const [content, setContent] = useState("");

  const toggleLike = api.post.toggleLike.useMutation({
    onSuccess: (result) => {
      setLiked(result.liked);
      setLikesCount((current) => {
        if (result.liked && !liked) return current + 1;
        if (!result.liked && liked) return Math.max(0, current - 1);
        return current;
      });
      router.refresh();
    },
  });
  const addComment = api.post.addComment.useMutation({
    onSuccess: () => {
      setContent("");
      setCommentsCount((current) => current + 1);
      router.refresh();
    },
  });

  const handleCommentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    addComment.mutate({
      postId,
      content,
    });
  };

  return (
    <section className="mt-6 border border-zinc-200 bg-white p-6">
      <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600">
        <span>Лайков: {likesCount}</span>
        <span>Комментариев: {commentsCount}</span>
      </div>

      {isLoggedIn ? (
        <button
          type="button"
          disabled={toggleLike.isPending}
          onClick={() => toggleLike.mutate(postId)}
          className="mt-4 border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
        >
          {liked ? "Убрать лайк" : "Нравится"}
        </button>
      ) : null}

      {toggleLike.error ? (
        <p className="mt-3 text-sm text-red-700">{toggleLike.error.message}</p>
      ) : null}

      {canComment ? (
        <form onSubmit={handleCommentSubmit} className="mt-6 grid gap-3">
          <label
            htmlFor="comment"
            className="text-sm font-medium text-zinc-950"
          >
            Написать комментарий
          </label>
          <textarea
            id="comment"
            name="comment"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            required
            maxLength={1000}
            rows={4}
            className="resize-y border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
          />
          {addComment.error ? (
            <p className="text-sm text-red-700">{addComment.error.message}</p>
          ) : null}
          <button
            type="submit"
            disabled={addComment.isPending}
            className="w-fit bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {addComment.isPending ? "Отправка..." : "Отправить"}
          </button>
        </form>
      ) : isLoggedIn ? (
        <p className="mt-4 text-sm text-zinc-600">
          Заполните профиль, чтобы писать комментарии.
        </p>
      ) : null}
    </section>
  );
}
