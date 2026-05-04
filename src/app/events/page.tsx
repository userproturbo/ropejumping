import Link from "next/link";

import { getEventStatusLabel } from "@/lib/display";
import { api } from "@/trpc/server";

import { formatEventDateRange } from "./_components/date-format";

export default async function EventsPage() {
  const events = await api.event.listPublic();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Мероприятия
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Открытые мероприятия роупджампинг-сообщества.
            </p>
          </div>
          <Link
            href="/events/new"
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
          >
            Создать мероприятие
          </Link>
        </div>

        {events.length > 0 ? (
          <div className="grid gap-4">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="block border border-zinc-200 bg-white p-5 hover:border-zinc-950"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-950">
                      {event.title}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      {formatEventDateRange(event.startsAt, event.endsAt)}
                    </p>
                  </div>
                  <span className="border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600">
                    {getEventStatusLabel(event.status)}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-600">
                  <span>{event.team.name}</span>
                  {event.region ? <span>{event.region}</span> : null}
                  {event.object ? (
                    <span>
                      Объект: {event.object.name}
                      {event.object.heightMeters
                        ? `, ${event.object.heightMeters} м`
                        : ""}
                    </span>
                  ) : null}
                  {event.capacity ? (
                    <span>Количество мест: {event.capacity}</span>
                  ) : null}
                  <span>Заявок: {event._count.applications}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Открытых мероприятий пока нет
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Мероприятия появятся здесь после создания организаторами.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
