import Link from "next/link";

import { CollapsibleFilterPanel } from "@/app/_components/collapsible-filter-panel";
import {
  FilterSummary,
  type FilterChip,
} from "@/app/_components/filter-summary";
import { getCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { PostCard } from "./_components/post-card";

type FeedPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const getSearchParamValue = (
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) => {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
};

const sortOptions = [
  { value: "createdAtDesc", label: "Сначала новые" },
  { value: "createdAtAsc", label: "Сначала старые" },
  { value: "popular", label: "Сначала популярные" },
];

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const user = await getCurrentUser();
  const {
    posts,
    availableTeams,
    availableEvents,
    availableObjects,
    currentPinTarget,
    currentUserCanPin,
    filters,
  } = await api.post.listPublic({
    q: getSearchParamValue(resolvedSearchParams, "q"),
    team: getSearchParamValue(resolvedSearchParams, "team"),
    event: getSearchParamValue(resolvedSearchParams, "event"),
    object: getSearchParamValue(resolvedSearchParams, "object"),
    sort: getSearchParamValue(resolvedSearchParams, "sort"),
  });
  const activeChips: FilterChip[] = [
    filters.q ? { label: "Поиск", value: `"${filters.q}"` } : null,
    filters.team
      ? {
          label: "Команда",
          value:
            availableTeams.find((team) => team.slug === filters.team)?.name ??
            filters.team,
        }
      : null,
    filters.event
      ? {
          label: "Мероприятие",
          value:
            availableEvents.find((event) => event.slug === filters.event)
              ?.title ?? filters.event,
        }
      : null,
    filters.object
      ? {
          label: "Объект",
          value:
            availableObjects.find((object) => object.slug === filters.object)
              ?.name ?? filters.object,
        }
      : null,
    filters.sort !== "createdAtDesc"
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
      <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-6 lg:py-10">
        <CollapsibleFilterPanel
          actions={
            <Link
              href="/feed/new"
              className="border border-[var(--app-border-strong)] px-4 py-2 text-sm text-[var(--app-text)] hover:border-[var(--app-text-muted)]"
            >
              Создать пост
            </Link>
          }
          activeCount={activeChips.length}
          defaultOpen={activeChips.length > 0}
          header={
            <p className="max-w-2xl text-base leading-6 text-[var(--app-text)]">
              Хронологическая лента сообщества.
            </p>
          }
        >
          <form action="/feed" method="get">
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
                  placeholder="Текст, автор, команда, объект"
                  className="border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
                />
              </div>

              <div className="grid gap-2">
                <label
                  htmlFor="team"
                  className="text-sm font-medium text-zinc-950"
                >
                  Команда
                </label>
                <select
                  id="team"
                  name="team"
                  defaultValue={filters.team}
                  className="border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
                >
                  <option value="">Все команды</option>
                  {availableTeams.map((team) => (
                    <option key={team.id} value={team.slug}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label
                  htmlFor="event"
                  className="text-sm font-medium text-zinc-950"
                >
                  Мероприятие
                </label>
                <select
                  id="event"
                  name="event"
                  defaultValue={filters.event}
                  className="border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
                >
                  <option value="">Все мероприятия</option>
                  {availableEvents.map((event) => (
                    <option key={event.id} value={event.slug}>
                      {event.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label
                  htmlFor="object"
                  className="text-sm font-medium text-zinc-950"
                >
                  Объект
                </label>
                <select
                  id="object"
                  name="object"
                  defaultValue={filters.object}
                  className="border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
                >
                  <option value="">Все объекты</option>
                  {availableObjects.map((object) => (
                    <option key={object.id} value={object.slug}>
                      {object.name}
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
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-800"
              >
                Применить фильтры
              </button>
              <Link
                href="/feed"
                className="text-sm text-zinc-600 hover:text-zinc-950"
              >
                Сбросить
              </Link>
            </div>
          </form>
        </CollapsibleFilterPanel>

        <FilterSummary
          chips={activeChips}
          resetHref="/feed"
        />

        {posts.length > 0 ? (
          <div className="grid gap-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                currentPinTarget={currentPinTarget}
                currentUserCanPin={currentUserCanPin}
                isLoggedIn={Boolean(user)}
                post={post}
              />
            ))}
          </div>
        ) : (
          <section className="border border-[var(--app-border)] bg-[var(--app-surface)] p-6">
            <h2 className="text-xl font-semibold text-[var(--app-text)]">
              {activeChips.length > 0
                ? "Постов по выбранным фильтрам не найдено"
                : "В ленте пока нет публикаций."}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--app-text-secondary)]">
              {activeChips.length > 0
                ? "Попробуйте убрать часть фильтров или изменить поисковый запрос."
                : "Будьте первым, кто расскажет о выезде, объекте или впечатлении."}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
