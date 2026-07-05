"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { api, type RouterOutputs } from "@/trpc/react";

type PinTarget = NonNullable<
  RouterOutputs["post"]["listPublic"]["currentPinTarget"]
>;

type PostPinButtonProps = {
  isPinned: boolean;
  postId: string;
  target: PinTarget;
};

export function PostPinButton({
  isPinned,
  postId,
  target,
}: PostPinButtonProps) {
  const router = useRouter();
  const pin = api.post.pin.useMutation({
    onSuccess: () => router.refresh(),
  });
  const unpin = api.post.unpin.useMutation({
    onSuccess: () => router.refresh(),
  });
  const mutation = isPinned ? unpin : pin;
  const error = pin.error ?? unpin.error;

  const handleClick = () => {
    const confirmed = window.confirm(
      isPinned ? "Открепить этот пост?" : "Закрепить этот пост?",
    );

    if (!confirmed) return;

    mutation.mutate({
      postId,
      targetType: target.targetType,
      targetId: target.targetId,
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={mutation.isPending}
        onClick={handleClick}
        className="text-sm text-[var(--app-text-secondary)] hover:text-[var(--app-text)] disabled:cursor-not-allowed disabled:text-[var(--app-muted)]"
      >
        {mutation.isPending
          ? "Сохранение..."
          : isPinned
            ? "Открепить"
            : "Закрепить"}
      </button>
      {error ? <p className="text-sm text-red-700">{error.message}</p> : null}
    </div>
  );
}

type FeedLikeButtonProps = {
  initialLiked: boolean;
  initialLikesCount: number;
  isLoggedIn: boolean;
  postId: string;
};

export function FeedLikeButton({
  initialLiked,
  initialLikesCount,
  isLoggedIn,
  postId,
}: FeedLikeButtonProps) {
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
      <FeedHeartIcon liked={liked} />
      <span aria-hidden="true">{likesCount}</span>
      <span id={countDescriptionId} className="sr-only">
        Лайки: {likesCount}
      </span>
    </>
  );
  const className =
    "group inline-flex items-center gap-1.5 text-[var(--app-muted)] transition hover:text-[var(--app-text)] disabled:cursor-wait disabled:opacity-60";

  if (!isLoggedIn) {
    return (
      <Link
        href="/login"
        aria-label="Войти, чтобы поставить лайк"
        aria-describedby={countDescriptionId}
        className={className}
      >
        {content}
      </Link>
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

function FeedHeartIcon({ liked }: { liked: boolean }) {
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
