"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { api } from "@/trpc/react";

type PostInteractionsProps = {
  canComment: boolean;
  isLoggedIn: boolean;
  postId: string;
};

export function PostInteractions({
  canComment,
  isLoggedIn,
  postId,
}: PostInteractionsProps) {
  const router = useRouter();
  const [content, setContent] = useState("");

  const addComment = api.post.addComment.useMutation({
    onSuccess: () => {
      setContent("");
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

  if (!isLoggedIn) return null;

  return (
    <section className="mt-6 border border-zinc-200 bg-white p-6">
      {canComment ? (
        <form onSubmit={handleCommentSubmit} className="grid gap-3">
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
      ) : (
        <p className="text-sm text-zinc-600">
          Заполните профиль, чтобы писать комментарии.
        </p>
      )}
    </section>
  );
}

type PostDetailLikeMetricProps = {
  initialLiked: boolean;
  initialLikesCount: number;
  isLoggedIn: boolean;
  postId: string;
};

export function PostDetailLikeMetric({
  initialLiked,
  initialLikesCount,
  isLoggedIn,
  postId,
}: PostDetailLikeMetricProps) {
  const countDescriptionId = useId();
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const toggleLike = api.post.toggleLike.useMutation({
    onMutate: () => {
      const previousState = { liked, likesCount };

      setLiked(!liked);
      setLikesCount((current) => Math.max(0, current + (liked ? -1 : 1)));

      return previousState;
    },
    onError: (_error, _postId, previousState) => {
      if (!previousState) return;

      setLiked(previousState.liked);
      setLikesCount(previousState.likesCount);
    },
    onSuccess: (result, _postId, previousState) => {
      setLiked(result.liked);

      if (!previousState) return;

      setLikesCount(
        Math.max(
          0,
          previousState.likesCount +
            (result.liked === previousState.liked ? 0 : result.liked ? 1 : -1),
        ),
      );
    },
  });
  const content = (
    <>
      <PostDetailHeartIcon liked={liked} />
      <span aria-hidden="true">{likesCount}</span>
      <span id={countDescriptionId} className="sr-only">
        Лайки: {likesCount}
      </span>
    </>
  );
  const className =
    "inline-flex items-center gap-1.5 text-zinc-500 transition hover:text-zinc-950 disabled:cursor-wait disabled:opacity-60";

  if (!isLoggedIn) {
    return (
      <span
        aria-label={`Лайки: ${likesCount}`}
        className="inline-flex items-center gap-1.5 text-zinc-500"
      >
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-label={liked ? "Убрать лайк" : "Поставить лайк"}
      aria-describedby={countDescriptionId}
      aria-pressed={liked}
      disabled={toggleLike.isPending}
      onClick={() => toggleLike.mutate(postId)}
      className={className}
    >
      {content}
      {toggleLike.error ? (
        <span role="alert" className="sr-only">
          {toggleLike.error.message}
        </span>
      ) : null}
    </button>
  );
}

function PostDetailHeartIcon({ liked }: { liked: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px] shrink-0 transition"
    >
      <path
        d="M12 21s-6.7-4.35-9.4-8.2C.35 9.6 1.35 5.3 5.1 4.25c2.1-.6 4.1.2 5.25 1.75L12 8.2l1.65-2.2c1.15-1.55 3.15-2.35 5.25-1.75 3.75 1.05 4.75 5.35 2.5 8.55C18.7 16.65 12 21 12 21z"
        fill={liked ? "var(--rp-like)" : "none"}
        stroke={liked ? "var(--rp-like)" : "currentColor"}
        strokeWidth={liked ? 0 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
