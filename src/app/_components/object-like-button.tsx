"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/trpc/react";

type ObjectLikeButtonProps = {
  objectId: string;
  initialLiked: boolean;
  className?: string;
};

export function ObjectLikeButton({
  objectId,
  initialLiked,
  className,
}: ObjectLikeButtonProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const toggleObjectLike = api.objectLike.toggleObjectLike.useMutation({
    onSuccess: (result) => {
      setLiked(result.liked);
      router.refresh();
    },
  });

  const handleClick = () => {
    const previousLiked = liked;
    setLiked(!liked);

    toggleObjectLike.mutate(
      { objectId },
      {
        onError: () => setLiked(previousLiked),
      },
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={toggleObjectLike.isPending}
      className={
        className ??
        "border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400"
      }
    >
      {liked ? "Вам нравится" : "Нравится"}
    </button>
  );
}
