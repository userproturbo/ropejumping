import Link from "next/link";

import type { ReportTargetType } from "@/lib/validation/report";
import type { RouterOutputs } from "@/trpc/react";

import { ModerationActions } from "./moderation-actions";

type OpenReport = RouterOutputs["report"]["listOpen"][number];

type ReportCardProps = {
  report: OpenReport;
  showActions?: boolean;
};

export function ReportCard({ report, showActions = false }: ReportCardProps) {
  const targetType = getReportTargetType(report.targetType);

  return (
    <article className="border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">
            {getTargetTypeLabel(report.targetType)}: {report.targetId}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {formatModerationDate(report.createdAt)}
          </p>
        </div>
        <span className="text-xs font-medium text-zinc-500">
          {getReportStatusLabel(report.status)}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm">
        <div>
          <dt className="font-medium text-zinc-950">Причина</dt>
          <dd className="mt-1 text-zinc-600">{report.reason}</dd>
        </div>
        {report.details ? (
          <div>
            <dt className="font-medium text-zinc-950">Подробности</dt>
            <dd className="mt-1 whitespace-pre-wrap text-zinc-600">
              {report.details}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="font-medium text-zinc-950">Отправил</dt>
          <dd className="mt-1 text-zinc-600">
            {getUserName(report.reporter)}
            {report.reporter.email ? ` (${report.reporter.email})` : ""}
          </dd>
        </div>
        {report.reviewedAt ? (
          <div>
            <dt className="font-medium text-zinc-950">Проверено</dt>
            <dd className="mt-1 text-zinc-600">
              {formatModerationDate(report.reviewedAt)}
            </dd>
          </div>
        ) : null}
      </dl>

      {report.targetType === "POST" ? (
        <Link
          href={`/posts/${report.targetId}`}
          className="mt-4 inline-flex text-sm text-zinc-600 hover:text-zinc-950"
        >
          Открыть пост
        </Link>
      ) : null}

      {showActions && targetType ? (
        <ModerationActions
          reportId={report.id}
          targetId={report.targetId}
          targetType={targetType}
        />
      ) : null}
    </article>
  );
}

const getReportTargetType = (value: string): ReportTargetType | null => {
  if (value === "POST" || value === "COMMENT") return value;

  return null;
};

const getTargetTypeLabel = (targetType: string) => {
  if (targetType === "POST") return "Пост";
  if (targetType === "COMMENT") return "Комментарий";

  return targetType;
};

const getReportStatusLabel = (status: string) => {
  if (status === "OPEN") return "Открыта";
  if (status === "RESOLVED") return "Решена";
  if (status === "DISMISSED") return "Отклонена";
  if (status === "REVIEWED") return "Проверена";

  return status;
};

const getUserName = (user: OpenReport["reporter"]) =>
  user.profile?.displayName ??
  user.profile?.username ??
  user.name ??
  user.email ??
  "Участник";

const formatModerationDate = (date: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
