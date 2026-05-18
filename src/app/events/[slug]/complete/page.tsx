import { notFound } from "next/navigation";

import { getEventStatusLabel } from "@/lib/display";
import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { formatEventDateRange } from "../../_components/date-format";
import { EventCompletionForm } from "./event-completion-form";

type CompleteEventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CompleteEventPage({
  params,
}: CompleteEventPageProps) {
  const { slug } = await params;
  await requireCurrentUser(`/events/${slug}/complete`);

  const event = await api.event.getForCompletion(slug).catch(() => null);

  if (!event) {
    notFound();
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Завершение мероприятия
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
            Отметьте участников, которые действительно были на мероприятии. Эти
            данные будут использоваться для истории участия и будущих
            достижений.
          </p>
        </div>

        <section className="mb-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">{event.title}</h2>
          <dl className="mt-4 grid gap-3 text-sm text-zinc-600 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="font-medium text-zinc-950">Дата</dt>
              <dd className="mt-1">
                {formatEventDateRange(event.startsAt, event.endsAt)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-950">Статус</dt>
              <dd className="mt-1">{getEventStatusLabel(event.status)}</dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-950">Команда</dt>
              <dd className="mt-1">{event.team.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-950">Объект</dt>
              <dd className="mt-1">{event.object?.name ?? "Не указан"}</dd>
            </div>
            {event.object?.heightMeters !== null &&
            event.object?.heightMeters !== undefined ? (
              <div>
                <dt className="font-medium text-zinc-950">Высота объекта</dt>
                <dd className="mt-1">{event.object.heightMeters} м</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <EventCompletionForm event={event} />
      </div>
    </main>
  );
}
