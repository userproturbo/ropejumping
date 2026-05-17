import Link from "next/link";

import { ApplicationStatus } from "@/generated/prisma/enums";
import { getApplicationStatusLabel, getEventStatusLabel } from "@/lib/display";
import { requireCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";

import { formatEventDateRange } from "../_components/date-format";

export default async function MyEventsPage() {
  const user = await requireCurrentUser("/events/my");

  const [createdEvents, applications] = await Promise.all([
    db.event.findMany({
      where: {
        createdById: user.id,
      },
      orderBy: {
        startsAt: "asc",
      },
      select: {
        id: true,
        title: true,
        slug: true,
        startsAt: true,
        endsAt: true,
        status: true,
        team: {
          select: {
            name: true,
          },
        },
        object: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    }),
    db.eventApplication.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        status: true,
        message: true,
        organizerNote: true,
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startsAt: true,
            endsAt: true,
            status: true,
            team: {
              select: {
                name: true,
              },
            },
            object: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Мои мероприятия
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Мероприятия, которые вы создали, и мероприятия, куда вы подали
              заявку.
            </p>
          </div>
          <Link
            href="/events/new"
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
          >
            Создать мероприятие
          </Link>
        </div>

        <section>
          <h2 className="text-xl font-semibold text-zinc-950">Я организую</h2>
          {createdEvents.length > 0 ? (
            <div className="mt-4 grid gap-4">
              {createdEvents.map((event) => (
                <article
                  key={event.id}
                  className="border border-zinc-200 bg-white p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-zinc-950">
                        <Link
                          href={`/events/${event.slug}`}
                          className="hover:text-zinc-600"
                        >
                          {event.title}
                        </Link>
                      </h3>
                      <EventMeta
                        startsAt={event.startsAt}
                        endsAt={event.endsAt}
                        teamName={event.team.name}
                        objectName={event.object?.name}
                      />
                      <p className="mt-2 text-sm text-zinc-600">
                        Заявок: {event._count.applications}
                      </p>
                    </div>
                    <StatusBadge label={getEventStatusLabel(event.status)} />
                  </div>
                  <EventActions
                    slug={event.slug}
                    canEdit
                    canOpenChat
                    eventLabel="Открыть"
                  />
                </article>
              ))}
            </div>
          ) : (
            <section className="mt-4 border border-zinc-200 bg-white p-6">
              <h3 className="text-xl font-semibold text-zinc-950">
                Вы пока не создавали мероприятия.
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Создайте мероприятие от команды, где вы владелец, администратор
                или организатор.
              </p>
            </section>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-zinc-950">Мои заявки</h2>
          {applications.length > 0 ? (
            <div className="mt-4 grid gap-4">
              {applications.map((application) => {
                const canOpenChat = canApplicationOpenChat(application.status);

                return (
                  <article
                    key={application.id}
                    className="border border-zinc-200 bg-white p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-zinc-950">
                          <Link
                            href={`/events/${application.event.slug}`}
                            className="hover:text-zinc-600"
                          >
                            {application.event.title}
                          </Link>
                        </h3>
                        <EventMeta
                          startsAt={application.event.startsAt}
                          endsAt={application.event.endsAt}
                          teamName={application.event.team.name}
                          objectName={application.event.object?.name}
                        />
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <StatusBadge
                          label={getEventStatusLabel(application.event.status)}
                        />
                        <StatusBadge
                          label={getApplicationStatusLabel(application.status)}
                        />
                      </div>
                    </div>

                    {application.message ? (
                      <div className="mt-4 text-sm">
                        <p className="font-medium text-zinc-950">
                          Сообщение в заявке
                        </p>
                        <p className="mt-1 whitespace-pre-wrap leading-6 text-zinc-600">
                          {application.message}
                        </p>
                      </div>
                    ) : null}

                    {application.organizerNote ? (
                      <div className="mt-4 text-sm">
                        <p className="font-medium text-zinc-950">
                          Комментарий организатора
                        </p>
                        <p className="mt-1 whitespace-pre-wrap leading-6 text-zinc-600">
                          {application.organizerNote}
                        </p>
                      </div>
                    ) : null}

                    <EventActions
                      slug={application.event.slug}
                      canOpenChat={canOpenChat}
                      eventLabel="Открыть"
                    />
                  </article>
                );
              })}
            </div>
          ) : (
            <section className="mt-4 border border-zinc-200 bg-white p-6">
              <h3 className="text-xl font-semibold text-zinc-950">
                Вы пока не подавали заявки на мероприятия.
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Подайте заявку на открытое мероприятие, чтобы она появилась
                здесь.
              </p>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

type EventMetaProps = {
  startsAt: Date;
  endsAt: Date | null;
  teamName: string;
  objectName?: string | null;
};

function EventMeta({ startsAt, endsAt, teamName, objectName }: EventMetaProps) {
  return (
    <dl className="mt-2 grid gap-1 text-sm text-zinc-500">
      <div>
        <dt className="inline text-zinc-600">Дата: </dt>
        <dd className="inline">{formatEventDateRange(startsAt, endsAt)}</dd>
      </div>
      <div>
        <dt className="inline text-zinc-600">Команда: </dt>
        <dd className="inline">{teamName}</dd>
      </div>
      {objectName ? (
        <div>
          <dt className="inline text-zinc-600">Объект: </dt>
          <dd className="inline">{objectName}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600">
      {label}
    </span>
  );
}

function EventActions({
  slug,
  canEdit = false,
  canOpenChat,
  eventLabel,
}: {
  slug: string;
  canEdit?: boolean;
  canOpenChat: boolean;
  eventLabel: string;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-4 text-sm">
      <Link
        href={`/events/${slug}`}
        className="text-zinc-700 hover:text-zinc-950"
      >
        {eventLabel}
      </Link>
      {canEdit ? (
        <Link
          href={`/events/${slug}/edit`}
          className="text-zinc-700 hover:text-zinc-950"
        >
          Редактировать
        </Link>
      ) : null}
      {canOpenChat ? (
        <Link
          href={`/events/${slug}#event-chat`}
          className="text-zinc-700 hover:text-zinc-950"
        >
          Открыть чат
        </Link>
      ) : null}
    </div>
  );
}

const canApplicationOpenChat = (status: ApplicationStatus) =>
  status === ApplicationStatus.ACCEPTED ||
  status === ApplicationStatus.CONFIRMED_PARTICIPATION;
