"use client";

import { useRouter } from "next/navigation";

import { api, type RouterOutputs } from "@/trpc/react";

type PinTarget = NonNullable<RouterOutputs["post"]["listPublic"]["currentPinTarget"]>;

type PostPinButtonProps = {
  isPinned: boolean;
  postId: string;
  target: PinTarget;
};

export function PostPinButton({ isPinned, postId, target }: PostPinButtonProps) {
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
