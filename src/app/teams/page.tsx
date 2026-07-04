/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import Link from "next/link";

import { CollapsibleFilterPanel } from "@/app/_components/collapsible-filter-panel";
import {
  FilterSummary,
  type FilterChip,
} from "@/app/_components/filter-summary";
import { TeamStatus } from "@/generated/prisma/enums";
import { getTeamStatusLabel } from "@/lib/display";
import { api } from "@/trpc/server";

type TeamsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const getSearchParamValue = (
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) => {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
};

const statusFilterOptions = [
  {
    value: TeamStatus.REGULAR,
    label: `${getTeamStatusLabel(TeamStatus.REGULAR)} команда`,
  },
  {
    value: TeamStatus.VERIFIED,
    label: `${getTeamStatusLabel(TeamStatus.VERIFIED)} команда`,
  },
];

const sortOptions = [
  { value: "nameAsc", label: "По названию" },
  { value: "createdAtDesc", label: "Сначала новые" },
  { value: "membersDesc", label: "Больше участников" },
  { value: "followersDesc", label: "Больше подписчиков" },
];

const formatRuCount = (
  count: number,
  forms: [one: string, few: string, many: string],
) => {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return forms[2];
  if (lastDigit === 1) return forms[0];
  if (lastDigit >= 2 && lastDigit <= 4) return forms[1];

  return forms[2];
};

export default async function TeamsPage({ searchParams }: TeamsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const { teams, availableRegions, filters } = await api.team.listPublic({
    q: getSearchParamValue(resolvedSearchParams, "q"),
    region: getSearchParamValue(resolvedSearchParams, "region"),
    status: getSearchParamValue(resolvedSearchParams, "status"),
    sort: getSearchParamValue(resolvedSearchParams, "sort"),
  });
  const activeChips: FilterChip[] = [
    filters.q ? { label: "Поиск", value: `"${filters.q}"` } : null,
    filters.region ? { label: "Регион", value: filters.region } : null,
    filters.status
      ? {
          label: "Статус",
          value:
            statusFilterOptions.find(
              (option) => option.value === filters.status,
            )?.label ?? filters.status,
        }
      : null,
    filters.sort !== "nameAsc"
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
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 lg:py-10">
        <CollapsibleFilterPanel
          actions={
            <Link
              href="/teams/new"
              className="border border-[var(--app-border-strong)] px-4 py-2 text-sm text-[var(--app-text)] hover:border-[var(--app-text-muted)]"
            >
              Создать команду
            </Link>
          }
          activeCount={activeChips.length}
          defaultOpen={activeChips.length > 0}
          header={
            <p className="max-w-2xl text-base leading-6 text-[var(--app-text)]">
              Команды роупджампинг-сообщества, зарегистрированные на платформе.
            </p>
          }
        >
          <form action="/teams" method="get">
            <div className="grid gap-4 md:grid-cols-3">
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
                  placeholder="Название, slug, регион"
                  className="border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
                />
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
                  <option value="">Все статусы</option>
                  {statusFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
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
                href="/teams"
                className="text-sm text-zinc-600 hover:text-zinc-950"
              >
                Сбросить
              </Link>
            </div>
          </form>
        </CollapsibleFilterPanel>

        <FilterSummary
          chips={activeChips}
          resetHref="/teams"
        />

        {teams.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.slug}`}
                className="block border border-[var(--app-border)] bg-[var(--app-surface)] p-4 transition hover:border-[var(--app-border-strong)]"
              >
                {team.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={team.logoUrl}
                    alt={team.logoMedia?.alt || `Логотип команды ${team.name}`}
                    className="h-16 w-16 aspect-square rounded-full border border-[var(--app-border)] object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 aspect-square items-center justify-center overflow-hidden rounded-full border border-[var(--app-border)] bg-[var(--app-surface-muted)] text-lg font-semibold text-[var(--app-text-muted)]">
                    {team.name.slice(0, 1)}
                  </div>
                )}

                <h2 className="mt-4 line-clamp-2 text-lg font-semibold leading-6 text-[var(--app-text)]">
                  {team.name}
                </h2>
                <p className="mt-1 min-h-5 text-sm text-[var(--app-text-muted)]">
                  {team.region || "Регион не указан"}
                </p>
                <div className="mt-4 grid gap-1.5 text-sm text-[var(--app-text-secondary)]">
                  <span>
                    {team._count.members}{" "}
                    {formatRuCount(team._count.members, [
                      "участник",
                      "участника",
                      "участников",
                    ])}
                  </span>
                  <span>
                    {team._count.followers}{" "}
                    {formatRuCount(team._count.followers, [
                      "подписчик",
                      "подписчика",
                      "подписчиков",
                    ])}
                  </span>
                  <span>Мероприятий: {team._count.events}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <section className="border border-[var(--app-border)] bg-[var(--app-surface)] p-6">
            <h2 className="text-xl font-semibold text-[var(--app-text)]">
              Команд по выбранным фильтрам не найдено
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
