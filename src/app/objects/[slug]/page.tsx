import Link from "next/link";
import { notFound } from "next/navigation";

import { formatEventDateRange } from "@/app/events/_components/date-format";
import { getEventStatusLabel, getObjectTypeLabel } from "@/lib/display";
import { getCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

type ObjectPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ObjectPage({ params }: ObjectPageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const object = await api.object.getBySlug(slug);

  if (!object) {
    notFound();
  }

  const canEdit = object.createdById === user?.id;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <section className="border border-zinc-200 bg-white p-6">
          {object.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={object.coverImageUrl}
              alt=""
              className="mb-6 h-64 w-full border border-zinc-200 object-cover"
            />
          ) : null}

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
                {object.name}
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                {getObjectTypeLabel(object.type)}
              </p>
            </div>
            {canEdit ? (
              <Link
                href={`/objects/${object.slug}/edit`}
                className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
              >
                Редактировать
              </Link>
            ) : null}
          </div>

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-zinc-950">Тип</dt>
              <dd className="mt-1 text-zinc-600">
                {getObjectTypeLabel(object.type)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-950">Высота</dt>
              <dd className="mt-1 text-zinc-600">
                {object.heightMeters ? `${object.heightMeters} м` : "Не указано"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-950">Регион</dt>
              <dd className="mt-1 text-zinc-600">
                {object.region ?? "Не указано"}
              </dd>
            </div>
            {object.createdByTeam ? (
              <div>
                <dt className="font-medium text-zinc-950">Добавила команда</dt>
                <dd className="mt-1 text-zinc-600">
                  <Link
                    href={`/teams/${object.createdByTeam.slug}`}
                    className="hover:text-zinc-950"
                  >
                    {object.createdByTeam.name}
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="mt-6 border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm leading-6 text-amber-900">
            Точное расположение, способы доступа и технические детали объекта не
            публикуются.
          </p>
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Описание</h2>
          {object.description ? (
            <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
              {object.description}
            </p>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              Описание пока не добавлено.
            </p>
          )}
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">
            Связанные мероприятия
          </h2>
          {object.events.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {object.events.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="block border border-zinc-200 p-4 hover:border-zinc-950"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-zinc-950">
                        {event.title}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        {formatEventDateRange(event.startsAt, event.endsAt)}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-zinc-500">
                      {getEventStatusLabel(event.status)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-600">
                    <span>{event.team.name}</span>
                    {event.region ? <span>{event.region}</span> : null}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">
              Публичных мероприятий на этом объекте пока нет.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
