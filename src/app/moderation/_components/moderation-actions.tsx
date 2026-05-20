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
  const hideObjectImpression = api.report.hideObjectImpression.useMutation({
    onSuccess: () => router.refresh(),
  });
  const hideEventChatMessage = api.report.hideEventChatMessage.useMutation({
    onSuccess: () => router.refresh(),
  });
  const hideEventLogisticsPost = api.report.hideEventLogisticsPost.useMutation({
    onSuccess: () => router.refresh(),
  });
  const hideTeamChatMessage = api.report.hideTeamChatMessage.useMutation({
    onSuccess: () => router.refresh(),
  });
  const resolve = api.report.resolve.useMutation({
    onSuccess: () => router.refresh(),
  });
  const dismiss = api.report.dismiss.useMutation({
    onSuccess: () => router.refresh(),
  });

  const isPending =
    hideTarget.isPending ||
    hideObjectImpression.isPending ||
    hideEventChatMessage.isPending ||
    hideEventLogisticsPost.isPending ||
    hideTeamChatMessage.isPending ||
    resolve.isPending ||
    dismiss.isPending;
  const error =
    hideTarget.error ??
    hideObjectImpression.error ??
    hideEventChatMessage.error ??
    hideEventLogisticsPost.error ??
    hideTeamChatMessage.error ??
    resolve.error ??
    dismiss.error;
  const hideButtonLabel = getHideButtonLabel(targetType);
  const handleHide = () => {
    const confirmed = window.confirm(
      "Скрыть этот материал? Это действие изменит публичную видимость.",
    );

    if (!confirmed) return;

    if (targetType === "OBJECT_IMPRESSION") {
      hideObjectImpression.mutate({ impressionId: targetId, reportId });
      return;
    }

    if (targetType === "EVENT_CHAT_MESSAGE") {
      hideEventChatMessage.mutate({ messageId: targetId, reportId });
      return;
    }

    if (targetType === "EVENT_LOGISTICS_POST") {
      hideEventLogisticsPost.mutate({ postId: targetId, reportId });
      return;
    }

    if (targetType === "TEAM_CHAT_MESSAGE") {
      hideTeamChatMessage.mutate({ messageId: targetId, reportId });
      return;
    }

    hideTarget.mutate({ targetType, targetId });
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={isPending}
        onClick={handleHide}
        title={hideButtonLabel}
        aria-label={hideButtonLabel}
        className="border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
      >
        {isPending ? "Выполняется..." : hideButtonLabel}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => resolve.mutate({ reportId })}
        title="Закрыть жалобу как решённую"
        aria-label="Закрыть жалобу как решённую"
        className="border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
      >
        {isPending ? "Выполняется..." : "Закрыть как решённую"}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => dismiss.mutate({ reportId })}
        title="Отклонить жалобу"
        aria-label="Отклонить жалобу"
        className="border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
      >
        {isPending ? "Выполняется..." : "Отклонить жалобу"}
      </button>
      {error ? <p className="text-sm text-red-700">{error.message}</p> : null}
    </div>
  );
}

const getHideButtonLabel = (targetType: ReportTargetType) => {
  if (targetType === "POST") return "Скрыть пост";
  if (targetType === "COMMENT") return "Скрыть комментарий";
  if (targetType === "OBJECT_IMPRESSION") return "Скрыть впечатление";
  if (targetType === "EVENT_LOGISTICS_POST") return "Скрыть запись";
  if (
    targetType === "EVENT_CHAT_MESSAGE" ||
    targetType === "TEAM_CHAT_MESSAGE"
  ) {
    return "Скрыть сообщение";
  }

  return "Скрыть объект";
};
