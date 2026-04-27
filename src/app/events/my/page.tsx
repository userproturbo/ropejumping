import Link from "next/link";

import { getEventStatusLabel } from "@/lib/display";
import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { formatEventDateRange } from "../_components/date-format";

export default async function MyEventsPage() {
  await requireCurrentUser("/events/my");

  const events = await api.event.getMine();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Мои мероприятия
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Мероприятия, которые вы создали или можете редактировать.
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
              <section
                key={event.id}
                className="border border-zinc-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-950">
                      <Link
                        href={`/events/${event.slug}`}
                        className="hover:text-zinc-600"
                      >
                        {event.title}
                      </Link>
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      {formatEventDateRange(event.startsAt, event.endsAt)}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Команда: {event.team.name}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-zinc-500">
                    {getEventStatusLabel(event.status)}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <Link
                    href={`/events/${event.slug}`}
                    className="text-zinc-700 hover:text-zinc-950"
                  >
                    Публичная страница
                  </Link>
                  <Link
                    href={`/events/${event.slug}/edit`}
                    className="text-zinc-700 hover:text-zinc-950"
                  >
                    Редактировать
                  </Link>
                </div>
              </section>
            ))}
          </div>
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Доступных для редактирования мероприятий пока нет
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Создайте мероприятие от команды, где вы владелец, администратор
              или организатор.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
