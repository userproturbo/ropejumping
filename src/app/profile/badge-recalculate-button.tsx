"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/trpc/react";

export function BadgeRecalculateButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const recalculate = api.badge.recalculateMine.useMutation({
    onSuccess: (result) => {
      const awardedCount = result.awardedBadgeCodes.length;
      setMessage(
        awardedCount > 0
          ? `Новых бейджей: ${awardedCount}.`
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
        className="border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988] disabled:cursor-not-allowed disabled:text-[#aab497]"
      >
        {recalculate.isPending ? "Пересчёт..." : "Пересчитать бейджи"}
      </button>
      {message ? <p className="text-sm text-[#aab497]">{message}</p> : null}
      {recalculate.error ? (
        <p className="text-sm text-red-300">{recalculate.error.message}</p>
      ) : null}
    </div>
  );
}
