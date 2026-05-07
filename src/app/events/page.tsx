import Link from "next/link";

import { EventStatus } from "@/generated/prisma/enums";
import { getEventStatusLabel } from "@/lib/display";
import { api } from "@/trpc/server";

import { formatEventDateRange } from "./_components/date-format";

type EventsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const statusFilterOptions = [
  { value: "all", label: "Все" },
  { value: "upcoming", label: "Ближайшие" },
  { value: "applications-open", label: "Набор открыт" },
  {
    value: EventStatus.PUBLISHED,
    label: getEventStatusLabel(EventStatus.PUBLISHED),
  },
  { value: EventStatus.FULL, label: getEventStatusLabel(EventStatus.FULL) },
  {
    value: EventStatus.APPLICATIONS_CLOSED,
    label: getEventStatusLabel(EventStatus.APPLICATIONS_CLOSED),
  },
  {
    value: EventStatus.POSTPONED,
    label: getEventStatusLabel(EventStatus.POSTPONED),
  },
  {
    value: EventStatus.CANCELLED,
    label: getEventStatusLabel(EventStatus.CANCELLED),
  },
  { value: "completed", label: getEventStatusLabel(EventStatus.COMPLETED) },
  { value: "archived", label: getEventStatusLabel(EventStatus.ARCHIVED) },
];

const getSearchParamValue = (
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) => {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
};

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const { events, availableRegions, filters } = await api.event.listPublic({
    status: getSearchParamValue(resolvedSearchParams, "status"),
    region: getSearchParamValue(resolvedSearchParams, "region"),
    q: getSearchParamValue(resolvedSearchParams, "q"),
    applicationsOpen: getSearchParamValue(
      resolvedSearchParams,
      "applicationsOpen",
    ),
  });

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

        <form
          action="/events"
          method="get"
          className="mb-6 border border-zinc-200 bg-white p-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="q" className="text-sm font-medium text-zinc-950">
                Поиск
              </label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={filters.q}
                placeholder="Название, команда, объект, регион"
                className="border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
              />
            </div>

            <div className="grid gap-2">
              <label
                htmlFor="status"
                className="text-sm font-medium text-zinc-950"
              >
                Статус
              </label>
              <select
                id="status"
                name="status"
                defaultValue={filters.status}
                className="border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
              >
                {statusFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label
                htmlFor="region"
                className="text-sm font-medium text-zinc-950"
              >
                Регион
              </label>
              <select
                id="region"
                name="region"
                defaultValue={filters.region}
                className="border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
              >
                <option value="">Все регионы</option>
                {availableRegions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  name="applicationsOpen"
                  value="1"
                  defaultChecked={filters.applicationsOpen}
                  className="h-4 w-4 border-zinc-300 text-zinc-950"
                />
                Только с открытым набором
              </label>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-800"
            >
              Применить фильтры
            </button>
            <Link href="/events" className="text-sm text-zinc-600 hover:text-zinc-950">
              Сбросить
            </Link>
          </div>
        </form>

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
              Мероприятий по выбранным фильтрам не найдено
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Попробуйте изменить параметры поиска или сбросить фильтры.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
