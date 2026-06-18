"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/trpc/react";

type FollowButtonProps = {
  targetId: string;
  targetType: "team" | "object";
  initialFollowing: boolean;
};

export function FollowButton({
  targetId,
  targetType,
  initialFollowing,
}: FollowButtonProps) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);

  const toggleTeamFollow = api.follow.toggleTeamFollow.useMutation({
    onSuccess: (result) => {
      setFollowing(result.following);
      router.refresh();
    },
  });
  const toggleObjectFollow = api.follow.toggleObjectFollow.useMutation({
    onSuccess: (result) => {
      setFollowing(result.following);
      router.refresh();
    },
  });
  const isPending = toggleTeamFollow.isPending || toggleObjectFollow.isPending;

  const handleClick = () => {
    const previousFollowing = following;
    const optimisticFollowing = !following;
    setFollowing(optimisticFollowing);

    if (targetType === "team") {
      toggleTeamFollow.mutate(
        { teamId: targetId },
        {
          onError: () => setFollowing(previousFollowing),
        },
      );
      return;
    }

    toggleObjectFollow.mutate(
      { objectId: targetId },
      {
        onError: () => setFollowing(previousFollowing),
      },
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400"
    >
      {following ? "Вы подписаны" : "Подписаться"}
    </button>
  );
}
