import Link from "next/link";

import type { ReportTargetType } from "@/lib/validation/report";
import type { RouterOutputs } from "@/trpc/react";

import { ModerationActions } from "./moderation-actions";

type ModerationReport =
  RouterOutputs["report"]["listForModeration"]["reports"][number];

type ReportCardProps = {
  report: ModerationReport;
  showActions?: boolean;
};

type ModerationUserPreview = {
  name?: string | null;
  email?: string | null;
  profile?: {
    displayName?: string | null;
    username?: string | null;
  } | null;
};

export function ReportCard({ report, showActions = false }: ReportCardProps) {
  const targetType = getReportTargetType(report.targetType);
  const targetTitle = getTargetTitle(report);

  return (
    <article className="border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">
            {getTargetTypeLabel(report.targetType)}: {targetTitle}
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
        {report.reviewedBy ? (
          <div>
            <dt className="font-medium text-zinc-950">Проверил</dt>
            <dd className="mt-1 text-zinc-600">
              {getUserName(report.reviewedBy)}
              {report.reviewedBy.email ? ` (${report.reviewedBy.email})` : ""}
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
      {report.targetType === "OBJECT" && report.targetObject ? (
        report.targetObject.visibility === "PUBLIC" ? (
          <Link
            href={`/objects/${report.targetObject.slug}`}
            className="mt-4 inline-flex text-sm text-zinc-600 hover:text-zinc-950"
          >
            Открыть объект
          </Link>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">Объект уже скрыт.</p>
        )
      ) : null}
      {report.targetType === "OBJECT_IMPRESSION" &&
      report.targetObjectImpression ? (
        <div className="mt-4 grid gap-2 text-sm">
          <p className="text-zinc-600">
            Автор: {getUserName(report.targetObjectImpression.author)}
          </p>
          <p className="line-clamp-3 whitespace-pre-wrap text-zinc-600">
            {report.targetObjectImpression.body}
          </p>
          {report.targetObjectImpression.object.visibility === "PUBLIC" ? (
            <Link
              href={`/objects/${report.targetObjectImpression.object.slug}`}
              className="inline-flex text-zinc-600 hover:text-zinc-950"
            >
              Открыть объект: {report.targetObjectImpression.object.name}
            </Link>
          ) : (
            <p className="text-zinc-500">Объект уже скрыт.</p>
          )}
          {report.targetObjectImpression.hiddenAt ? (
            <p className="text-zinc-500">Впечатление уже скрыто.</p>
          ) : null}
        </div>
      ) : null}
      {report.targetType === "EVENT_CHAT_MESSAGE" &&
      report.targetEventChatMessage ? (
        <div className="mt-4 grid gap-2 text-sm">
          <p className="text-zinc-600">
            Автор: {getUserName(report.targetEventChatMessage.author)}
          </p>
          <p className="line-clamp-3 whitespace-pre-wrap text-zinc-600">
            {report.targetEventChatMessage.body}
          </p>
          <Link
            href={`/events/${report.targetEventChatMessage.event.slug}#event-chat`}
            className="inline-flex text-zinc-600 hover:text-zinc-950"
          >
            Открыть чат: {report.targetEventChatMessage.event.title}
          </Link>
          {report.targetEventChatMessage.hiddenAt ? (
            <p className="text-zinc-500">Сообщение уже скрыто.</p>
          ) : null}
          {report.targetEventChatMessage.deletedAt ? (
            <p className="text-zinc-500">Сообщение удалено автором.</p>
          ) : null}
        </div>
      ) : null}
      {report.targetType === "EVENT_LOGISTICS_POST" &&
      report.targetEventLogisticsPost ? (
        <div className="mt-4 grid gap-2 text-sm">
          <p className="text-zinc-600">
            Автор: {getUserName(report.targetEventLogisticsPost.author)}
          </p>
          <p className="text-zinc-600">
            Тип: {getLogisticsTypeLabel(report.targetEventLogisticsPost.type)}
          </p>
          <p className="line-clamp-3 whitespace-pre-wrap text-zinc-600">
            {report.targetEventLogisticsPost.body}
          </p>
          <Link
            href={`/events/${report.targetEventLogisticsPost.event.slug}#event-logistics`}
            className="inline-flex text-zinc-600 hover:text-zinc-950"
          >
            Открыть мероприятие: {report.targetEventLogisticsPost.event.title}
          </Link>
          {report.targetEventLogisticsPost.hiddenAt ? (
            <p className="text-zinc-500">Запись уже скрыта.</p>
          ) : null}
        </div>
      ) : null}
      {report.targetType === "TEAM_CHAT_MESSAGE" &&
      report.targetTeamChatMessage ? (
        <div className="mt-4 grid gap-2 text-sm">
          <p className="text-zinc-600">
            Автор: {getUserName(report.targetTeamChatMessage.author)}
          </p>
          <p className="line-clamp-3 whitespace-pre-wrap text-zinc-600">
            {report.targetTeamChatMessage.body}
          </p>
          <Link
            href={`/teams/${report.targetTeamChatMessage.team.slug}#team-chat`}
            className="inline-flex text-zinc-600 hover:text-zinc-950"
          >
            Открыть чат: {report.targetTeamChatMessage.team.name}
          </Link>
          {report.targetTeamChatMessage.hiddenAt ? (
            <p className="text-zinc-500">Сообщение уже скрыто.</p>
          ) : null}
          {report.targetTeamChatMessage.deletedAt ? (
            <p className="text-zinc-500">Сообщение удалено автором.</p>
          ) : null}
        </div>
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
  if (
    value === "POST" ||
    value === "COMMENT" ||
    value === "OBJECT" ||
    value === "OBJECT_IMPRESSION" ||
    value === "EVENT_CHAT_MESSAGE" ||
    value === "EVENT_LOGISTICS_POST" ||
    value === "TEAM_CHAT_MESSAGE"
  ) {
    return value;
  }

  return null;
};

const getTargetTypeLabel = (targetType: string) => {
  if (targetType === "POST") return "Пост";
  if (targetType === "COMMENT") return "Комментарий";
  if (targetType === "OBJECT") return "Объект";
  if (targetType === "OBJECT_IMPRESSION") return "Впечатление об объекте";
  if (targetType === "EVENT_CHAT_MESSAGE")
    return "Сообщение в чате мероприятия";
  if (targetType === "EVENT_LOGISTICS_POST")
    return "Запись в логистике мероприятия";
  if (targetType === "TEAM_CHAT_MESSAGE") return "Сообщение в чате команды";

  return targetType;
};

const getTargetTitle = (report: ModerationReport) => {
  if (report.targetType === "OBJECT" && report.targetObject) {
    return report.targetObject.name;
  }

  if (
    report.targetType === "OBJECT_IMPRESSION" &&
    report.targetObjectImpression
  ) {
    return report.targetObjectImpression.object.name;
  }

  if (
    report.targetType === "EVENT_CHAT_MESSAGE" &&
    report.targetEventChatMessage
  ) {
    return report.targetEventChatMessage.event.title;
  }

  if (
    report.targetType === "EVENT_LOGISTICS_POST" &&
    report.targetEventLogisticsPost
  ) {
    return report.targetEventLogisticsPost.event.title;
  }

  if (
    report.targetType === "TEAM_CHAT_MESSAGE" &&
    report.targetTeamChatMessage
  ) {
    return report.targetTeamChatMessage.team.name;
  }

  return report.targetId;
};

const getReportStatusLabel = (status: string) => {
  if (status === "OPEN") return "Открыта";
  if (status === "RESOLVED") return "Решена";
  if (status === "DISMISSED") return "Отклонена";
  if (status === "REVIEWED") return "Проверена";

  return status;
};

const getUserName = (user: ModerationUserPreview) =>
  user.profile?.displayName ??
  user.profile?.username ??
  user.name ??
  user.email ??
  "Участник";

const getLogisticsTypeLabel = (type: string) => {
  if (type === "OFFER_SEAT") return "Предлагает место";
  if (type === "NEED_SEAT") return "Ищет место";

  return "Едет своим ходом / ищет компанию";
};

const formatModerationDate = (date: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
