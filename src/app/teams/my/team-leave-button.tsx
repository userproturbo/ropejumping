"use client";

import { useRouter } from "next/navigation";

import { api } from "@/trpc/react";

type TeamLeaveButtonProps = {
  teamSlug: string;
};

export function TeamLeaveButton({ teamSlug }: TeamLeaveButtonProps) {
  const router = useRouter();
  const leaveTeam = api.team.leaveMine.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={leaveTeam.isPending}
        onClick={() => {
          if (!window.confirm("Вы уверены, что хотите выйти из команды?")) {
            return;
          }

          leaveTeam.mutate({ teamSlug });
        }}
        className="border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
      >
        {leaveTeam.isPending ? "Выход..." : "Выйти из команды"}
      </button>
      {leaveTeam.error ? (
        <p className="text-sm text-red-700">{leaveTeam.error.message}</p>
      ) : null}
    </div>
  );
}
