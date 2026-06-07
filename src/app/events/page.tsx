import Link from "next/link";

import { CollapsibleFilterPanel } from "@/app/_components/collapsible-filter-panel";
import {
  FilterSummary,
  type FilterChip,
} from "@/app/_components/filter-summary";
import { EventStatus, ObjectVisibility } from "@/generated/prisma/enums";
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

const sortOptions = [
  { value: "startsAtAsc", label: "Сначала ближайшие" },
  { value: "startsAtDesc", label: "Сначала поздние" },
  { value: "createdAtDesc", label: "Сначала новые" },
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
    sort: getSearchParamValue(resolvedSearchParams, "sort"),
  });
  const activeChips: FilterChip[] = [
    filters.q ? { label: "Поиск", value: `"${filters.q}"` } : null,
    filters.status !== "all"
      ? {
          label: "Статус",
          value:
            statusFilterOptions.find(
              (option) => option.value === filters.status,
            )?.label ?? filters.status,
        }
      : null,
    filters.region ? { label: "Регион", value: filters.region } : null,
    filters.applicationsOpen
      ? { label: "Набор", value: "только открытый" }
      : null,
    filters.sort !== "startsAtAsc"
      ? {
          label: "Сортировка",
          value:
            sortOptions.find((option) => option.value === filters.sort)
              ?.label ?? filters.sort,
        }
      : null,
  ].filter((chip): chip is FilterChip => Boolean(chip));

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[var(--app-bg)] text-[var(--app-text)]">
      <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6 lg:py-10">
        <CollapsibleFilterPanel
          actions={
            <Link
              href="/events/new"
              className="border border-[var(--app-border-strong)] px-4 py-2 text-sm text-[var(--app-text)] hover:border-[var(--app-text-muted)]"
            >
              Создать мероприятие
            </Link>
          }
          activeCount={activeChips.length}
          defaultOpen={activeChips.length > 0}
          header={
            <p className="max-w-2xl text-base leading-6 text-[var(--app-text)]">
              Открытые мероприятия роупджампинг-сообщества.
            </p>
          }
        >
          <form action="/events" method="get">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label
                  htmlFor="q"
                  className="text-sm font-medium text-zinc-950"
                >
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

              <div className="grid gap-2">
                <label
                  htmlFor="sort"
                  className="text-sm font-medium text-zinc-950"
                >
                  Сортировка
                </label>
                <select
                  id="sort"
                  name="sort"
                  defaultValue={filters.sort}
                  className="border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
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
              <Link
                href="/events"
                className="text-sm text-zinc-600 hover:text-zinc-950"
              >
                Сбросить
              </Link>
            </div>
          </form>
        </CollapsibleFilterPanel>

        <FilterSummary
          chips={activeChips}
          resetHref="/events"
        />

        {events.length > 0 ? (
          <div className="grid gap-4">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="block border border-[var(--app-border)] bg-[var(--app-surface)] bg-cover bg-center p-5 transition hover:border-[var(--app-border-strong)]"
                style={
                  event.coverImageUrl
                    ? {
                        backgroundImage: `linear-gradient(90deg, rgb(0 0 0 / 0.78), rgb(0 0 0 / 0.48)), url("${event.coverImageUrl}")`,
                      }
                    : undefined
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2
                      className={
                        event.coverImageUrl
                          ? "text-xl font-semibold text-white"
                          : "text-xl font-semibold text-[var(--app-text)]"
                      }
                    >
                      {event.title}
                    </h2>
                    <p
                      className={
                        event.coverImageUrl
                          ? "mt-1 text-sm text-zinc-200"
                          : "mt-1 text-sm text-[var(--app-text-muted)]"
                      }
                    >
                      {formatEventDateRange(event.startsAt, event.endsAt)}
                    </p>
                  </div>
                  <span
                    className={
                      event.coverImageUrl
                        ? "border border-white/30 bg-black/25 px-2 py-1 text-xs font-medium text-white"
                        : "border border-[var(--app-border)] px-2 py-1 text-xs font-medium text-[var(--app-text-secondary)]"
                    }
                  >
                    {getEventStatusLabel(event.status)}
                  </span>
                </div>
                <div
                  className={
                    event.coverImageUrl
                      ? "mt-4 flex flex-wrap gap-3 text-sm text-zinc-100"
                      : "mt-4 flex flex-wrap gap-3 text-sm text-[var(--app-text-secondary)]"
                  }
                >
                  <span>{event.team.name}</span>
                  {event.region ? <span>{event.region}</span> : null}
                  {event.object ? (
                    event.object.visibility === ObjectVisibility.PUBLIC ? (
                      <span>
                        Объект: {event.object.name}
                        {event.object.heightMeters
                          ? `, ${event.object.heightMeters} м`
                          : ""}
                      </span>
                    ) : (
                      <span>Объект скрыт</span>
                    )
                  ) : null}
                  {event.capacity ? <span>Мест: {event.capacity}</span> : null}
                  <span>Заявок: {event._count.applications}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <section className="border border-[var(--app-border)] bg-[var(--app-surface)] p-6">
            <h2 className="text-xl font-semibold text-[var(--app-text)]">
              Мероприятий по выбранным фильтрам не найдено
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--app-text-secondary)]">
              Попробуйте убрать часть фильтров или изменить поисковый запрос.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
