"use client";

import { useRouter } from "next/navigation";

import type { ReportTargetType } from "@/lib/validation/report";
import { api } from "@/trpc/react";

type ModerationActionsProps = {
  reportId: string;
  targetId: string;
  targetType: ReportTargetType;
};

export function ModerationActions({
  reportId,
  targetId,
  targetType,
}: ModerationActionsProps) {
  const router = useRouter();
  const hideTarget = api.report.hideTarget.useMutation({
    onSuccess: () => router.refresh(),
  });
  const resolve = api.report.resolve.useMutation({
    onSuccess: () => router.refresh(),
  });
  const dismiss = api.report.dismiss.useMutation({
    onSuccess: () => router.refresh(),
  });

  const isPending =
    hideTarget.isPending || resolve.isPending || dismiss.isPending;
  const error = hideTarget.error ?? resolve.error ?? dismiss.error;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={isPending}
        onClick={() => hideTarget.mutate({ targetType, targetId })}
        className="border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
      >
        Скрыть контент
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => resolve.mutate({ reportId })}
        className="border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
      >
        Закрыть как решённую
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => dismiss.mutate({ reportId })}
        className="border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
      >
        Отклонить жалобу
      </button>
      {error ? <p className="text-sm text-red-700">{error.message}</p> : null}
    </div>
  );
}
