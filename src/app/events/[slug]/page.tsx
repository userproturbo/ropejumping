import Link from "next/link";
import { notFound } from "next/navigation";

import { EventStatus } from "@/generated/prisma/enums";
import { getEventStatusLabel } from "@/lib/display";
import { getCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { formatEventDateRange } from "../_components/date-format";
import { EventApplicationPanel } from "./event-application-panel";

type EventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const event = await api.event.getBySlug(slug);

  if (!event) {
    notFound();
  }

  const application = user
    ? await api.application.getMineForEvent(slug).catch(() => null)
    : null;
  const canManage = user
    ? await api.event
        .getForEdit(slug)
        .then(() => true)
        .catch(() => false)
    : false;
  const profile = user && !canManage ? await api.profile.getMine() : null;
  const canApply =
    event.status === EventStatus.PUBLISHED ||
    event.status === EventStatus.APPLICATIONS_OPEN;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <section className="border border-zinc-200 bg-white p-6">
          {event.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.coverImageUrl}
              alt=""
              className="mb-6 h-64 w-full border border-zinc-200 object-cover"
            />
          ) : null}

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
                {event.title}
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                {formatEventDateRange(event.startsAt, event.endsAt)}
              </p>
            </div>
            <span className="text-xs font-medium text-zinc-500">
              {getEventStatusLabel(event.status)}
            </span>
          </div>

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-zinc-950">Команда</dt>
              <dd className="mt-1 text-zinc-600">
                <Link
                  href={`/teams/${event.team.slug}`}
                  className="hover:text-zinc-950"
                >
                  {event.team.name}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-950">Регион</dt>
              <dd className="mt-1 text-zinc-600">
                {event.region ?? "Не указано"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-950">Количество мест</dt>
              <dd className="mt-1 text-zinc-600">
                {event.capacity ?? "Не указано"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-950">Заявки</dt>
              <dd className="mt-1 text-zinc-600">
                {event._count.applications}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-950">Цена</dt>
              <dd className="mt-1 text-zinc-600">
                {event.priceText ?? "Не указано"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-950">Уровень</dt>
              <dd className="mt-1 text-zinc-600">
                {event.levelText ?? "Не указано"}
              </dd>
            </div>
            {event.object ? (
              <div>
                <dt className="font-medium text-zinc-950">Объект</dt>
                <dd className="mt-1 text-zinc-600">{event.object.name}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Описание</h2>
          {event.description ? (
            <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
              {event.description}
            </p>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              Описание пока не добавлено.
            </p>
          )}
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Требования</h2>
          {event.requirementsText ? (
            <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
              {event.requirementsText}
            </p>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              Требования пока не добавлены.
            </p>
          )}
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Заявки</h2>
          {!user ? (
            <Link
              href={`/api/auth/signin?callbackUrl=${encodeURIComponent(`/events/${event.slug}`)}`}
              className="mt-4 inline-flex border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
            >
              Войдите, чтобы подать заявку
            </Link>
          ) : canManage ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/events/${event.slug}/applications`}
                className="inline-flex border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
              >
                Управление заявками
              </Link>
              <Link
                href={`/events/${event.slug}/complete`}
                className="inline-flex border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
              >
                Завершить мероприятие
              </Link>
            </div>
          ) : (
            <EventApplicationPanel
              application={application}
              canApply={canApply}
              eventSlug={event.slug}
              hasProfile={Boolean(profile)}
            />
          )}
        </section>

        {event.status === EventStatus.COMPLETED ||
        event.participations.length > 0 ? (
          <section className="mt-6 border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Подтверждённые участники
            </h2>
            {event.participations.length > 0 ? (
              <div className="mt-5 grid gap-4">
                {event.participations.map((participation) => {
                  const profile = participation.user.profile;
                  const displayName =
                    profile?.displayName ??
                    profile?.username ??
                    participation.user.name ??
                    "Участник без имени";

                  return (
                    <div
                      key={participation.id}
                      className="border border-zinc-200 p-4"
                    >
                      <p className="font-medium text-zinc-950">
                        {displayName}
                      </p>
                      {profile?.username ? (
                        <p className="mt-1 text-sm text-zinc-500">
                          @{profile.username}
                        </p>
                      ) : null}
                      {profile?.city ? (
                        <p className="mt-1 text-sm text-zinc-600">
                          {profile.city}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-600">
                Подтверждённых участников пока нет.
              </p>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}
