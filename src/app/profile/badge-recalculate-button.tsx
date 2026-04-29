"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/trpc/react";

export function BadgeRecalculateButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const recalculate = api.badge.recalculateMine.useMutation({
    onSuccess: (badges) => {
      setMessage(
        badges.length > 0
          ? `Новых бейджей: ${badges.length}.`
          : "Новых бейджей нет.",
      );
      router.refresh();
    },
  });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={recalculate.isPending}
        onClick={() => recalculate.mutate()}
        className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
      >
        {recalculate.isPending ? "Пересчёт..." : "Пересчитать бейджи"}
      </button>
      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
      {recalculate.error ? (
        <p className="text-sm text-red-700">{recalculate.error.message}</p>
      ) : null}
    </div>
  );
}
