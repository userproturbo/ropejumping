import Link from "next/link";

import {
  ApplicationStatus,
  EventStatus,
  type EventStatus as EventStatusType,
} from "@/generated/prisma/enums";
import { getEventStatusLabel } from "@/lib/display";

type ApplicationCounts = Record<ApplicationStatus, number>;

type EventOrganizerWorkspaceProps = {
  applicationCounts: ApplicationCounts;
  dateText: string;
  eventSlug: string;
  eventStatus: EventStatusType;
  objectName: string | null;
  teamName: string;
  totalApplications: number;
  isReadOnly: boolean;
};

const applicationStatusLabels = {
  [ApplicationStatus.PENDING]: "На рассмотрении",
  [ApplicationStatus.ACCEPTED]: "Принято",
  [ApplicationStatus.REJECTED]: "Отклонено",
  [ApplicationStatus.CANCELLED_BY_USER]: "Отменено участником",
  [ApplicationStatus.CONFIRMED_PARTICIPATION]: "Участие подтверждено",
  [ApplicationStatus.NO_SHOW]: "Не явился",
} satisfies Record<ApplicationStatus, string>;

const applicationStatuses = [
  ApplicationStatus.PENDING,
  ApplicationStatus.ACCEPTED,
  ApplicationStatus.REJECTED,
  ApplicationStatus.CANCELLED_BY_USER,
  ApplicationStatus.CONFIRMED_PARTICIPATION,
  ApplicationStatus.NO_SHOW,
] as const;

export function EventOrganizerWorkspace({
  applicationCounts,
  dateText,
  eventSlug,
  eventStatus,
  objectName,
  teamName,
  totalApplications,
  isReadOnly,
}: EventOrganizerWorkspaceProps) {
  const canShowCompletionLink =
    eventStatus !== EventStatus.ARCHIVED &&
    eventStatus !== EventStatus.CANCELLED;
  const completionLinkLabel =
    eventStatus === EventStatus.COMPLETED
      ? "Итоги мероприятия"
      : "Завершить мероприятие";

  return (
    <section className="mt-6 border border-[rgba(199,217,136,0.25)] bg-[#10150e] p-4 text-[#d7dcc5] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#e9eddc]">
            Панель организатора
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#aab497]">
            Быстрые действия и сводка по управлению мероприятием.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="border border-[rgba(199,217,136,0.22)] px-2 py-1 text-[#aab497]">
            Чат: {isReadOnly ? "архив" : "активен"}
          </span>
          <span className="border border-[rgba(199,217,136,0.22)] px-2 py-1 text-[#aab497]">
            Логистика: {isReadOnly ? "только чтение" : "активна"}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4">
          <h3 className="text-sm font-medium text-[#e9eddc]">Сводка</h3>
          <dl className="mt-3 grid gap-3 text-sm text-[#d7dcc5] sm:grid-cols-2">
            <div>
              <dt className="font-medium text-[#c7d988]">Статус мероприятия</dt>
              <dd className="mt-1">{getEventStatusLabel(eventStatus)}</dd>
            </div>
            <div>
              <dt className="font-medium text-[#c7d988]">Дата</dt>
              <dd className="mt-1">{dateText}</dd>
            </div>
            <div>
              <dt className="font-medium text-[#c7d988]">Команда</dt>
              <dd className="mt-1">{teamName}</dd>
            </div>
            <div>
              <dt className="font-medium text-[#c7d988]">Объект</dt>
              <dd className="mt-1">{objectName ?? "Не указан"}</dd>
            </div>
          </dl>
        </div>

        <div className="border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4">
          <h3 className="text-sm font-medium text-[#e9eddc]">Заявки</h3>
          <dl className="mt-3 grid gap-3 text-sm text-[#d7dcc5] sm:grid-cols-2">
            <div>
              <dt className="font-medium text-[#c7d988]">Всего заявок</dt>
              <dd className="mt-1">{totalApplications}</dd>
            </div>
            {applicationStatuses.map((status) => (
              <div key={status}>
                <dt className="font-medium text-[#c7d988]">
                  {applicationStatusLabels[status]}
                </dt>
                <dd className="mt-1">{applicationCounts[status]}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/events/${eventSlug}/edit`}
          className="inline-flex border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
        >
          Редактировать мероприятие
        </Link>
        <Link
          href={`/events/${eventSlug}#event-chat`}
          className="inline-flex border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
        >
          Открыть чат
        </Link>
        <Link
          href={`/events/${eventSlug}#event-logistics`}
          className="inline-flex border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
        >
          Открыть логистику
        </Link>
        <Link
          href={`/events/${eventSlug}/applications`}
          className="inline-flex border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
        >
          Заявки участников
        </Link>
        {canShowCompletionLink ? (
          <Link
            href={`/events/${eventSlug}/complete`}
            className="inline-flex border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
          >
            {completionLinkLabel}
          </Link>
        ) : null}
      </div>

      <p className="mt-5 border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-3 text-xs leading-5 text-[#aab497]">
        Не публикуйте публично точные координаты объекта, точки крепления,
        маршруты доступа и технические детали. Для внутренней логистики
        используйте закрытые блоки мероприятия.
      </p>
    </section>
  );
}
