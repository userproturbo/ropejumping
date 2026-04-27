import Link from "next/link";
import { notFound } from "next/navigation";

import { getEventStatusLabel } from "@/lib/display";
import { api } from "@/trpc/server";

import { formatEventDateRange } from "../_components/date-format";

type EventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await api.event.getBySlug(slug);

  if (!event) {
    notFound();
  }

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
            <p className="mt-3 text-sm text-zinc-500">Описание пока не добавлено.</p>
          )}
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Требования</h2>
          {event.requirementsText ? (
            <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
              {event.requirementsText}
            </p>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">Требования пока не добавлены.</p>
          )}
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Заявки</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Заявки пока не реализованы.
          </p>
        </section>
      </div>
    </main>
  );
}
