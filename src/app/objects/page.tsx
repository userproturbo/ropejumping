/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import Link from "next/link";

import { CollapsibleFilterPanel } from "@/app/_components/collapsible-filter-panel";
import {
  FilterSummary,
  type FilterChip,
} from "@/app/_components/filter-summary";
import { ObjectType } from "@/generated/prisma/enums";
import { getObjectTypeLabel } from "@/lib/display";
import { api } from "@/trpc/server";

type ObjectsPageProps = {
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
  { value: "heightDesc", label: "Сначала выше" },
  { value: "heightAsc", label: "Сначала ниже" },
  { value: "nameAsc", label: "По названию" },
];

const getObjectTypeFilterLabel = (type: string) =>
  Object.values(ObjectType).includes(type as ObjectType)
    ? getObjectTypeLabel(type as ObjectType)
    : type;

export default async function ObjectsPage({ searchParams }: ObjectsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const { objects, availableRegions, availableTeams, filters } =
    await api.object.listPublic({
      q: getSearchParamValue(resolvedSearchParams, "q"),
      type: getSearchParamValue(resolvedSearchParams, "type"),
      region: getSearchParamValue(resolvedSearchParams, "region"),
      team: getSearchParamValue(resolvedSearchParams, "team"),
      minHeight: getSearchParamValue(resolvedSearchParams, "minHeight"),
      maxHeight: getSearchParamValue(resolvedSearchParams, "maxHeight"),
      sort: getSearchParamValue(resolvedSearchParams, "sort"),
    });
  const activeChips: FilterChip[] = [
    filters.q ? { label: "Поиск", value: `"${filters.q}"` } : null,
    filters.type
      ? { label: "Тип", value: getObjectTypeFilterLabel(filters.type) }
      : null,
    filters.region ? { label: "Регион", value: filters.region } : null,
    filters.team
      ? {
          label: "Команда",
          value:
            availableTeams.find((team) => team.slug === filters.team)?.name ??
            filters.team,
        }
      : null,
    filters.minHeight
      ? { label: "Высота", value: `от ${filters.minHeight} м` }
      : null,
    filters.maxHeight
      ? { label: "Высота", value: `до ${filters.maxHeight} м` }
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
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 lg:py-10">
        <CollapsibleFilterPanel
          actions={
            <Link
              href="/objects/new"
              className="border border-[var(--app-border-strong)] px-4 py-2 text-sm text-[var(--app-text)] hover:border-[var(--app-text-muted)]"
            >
              Создать объект
            </Link>
          }
          activeCount={activeChips.length}
          defaultOpen={activeChips.length > 0}
          header={
            <p className="max-w-2xl text-base leading-6 text-[var(--app-text)]">
              Объекты
            </p>
          }
        >
          <form action="/objects" method="get">
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
                  placeholder="Название, команда, регион"
                  className="border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
                />
              </div>

              <div className="grid gap-2">
                <label
                  htmlFor="type"
                  className="text-sm font-medium text-zinc-950"
                >
                  Тип
                </label>
                <select
                  id="type"
                  name="type"
                  defaultValue={filters.type}
                  className="border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
                >
                  <option value="">Все типы</option>
                  {Object.values(ObjectType).map((type) => (
                    <option key={type} value={type}>
                      {getObjectTypeLabel(type)}
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
                  htmlFor="minHeight"
                  className="text-sm font-medium text-zinc-950"
                >
                  Высота от, м
                </label>
                <input
                  id="minHeight"
                  name="minHeight"
                  type="number"
                  min={1}
                  defaultValue={filters.minHeight}
                  className="border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
                />
              </div>

              <div className="grid gap-2">
                <label
                  htmlFor="maxHeight"
                  className="text-sm font-medium text-zinc-950"
                >
                  Высота до, м
                </label>
                <input
                  id="maxHeight"
                  name="maxHeight"
                  type="number"
                  min={1}
                  defaultValue={filters.maxHeight}
                  className="border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
                />
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
                href="/objects"
                className="text-sm text-zinc-600 hover:text-zinc-950"
              >
                Сбросить
              </Link>
            </div>
          </form>
        </CollapsibleFilterPanel>

        <FilterSummary
          chips={activeChips}
          resetHref="/objects"
        />

        {objects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {objects.map((object) => (
              <Link
                key={object.id}
                href={`/objects/${object.slug}`}
                className="block border border-[var(--app-border)] bg-[var(--app-surface)] p-4 transition hover:border-[var(--app-border-strong)]"
              >
                {object.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={object.coverImageUrl}
                    alt={
                      object.coverMedia?.alt || `Фото объекта «${object.name}»`
                    }
                    className="aspect-[4/3] w-full border border-[var(--app-border)] object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/3] w-full items-center justify-center border border-[var(--app-border)] bg-[var(--app-surface-muted)] text-sm text-[var(--app-text-muted)]">
                    Фото не добавлено
                  </div>
                )}

                <h2 className="mt-4 line-clamp-2 text-lg font-semibold leading-6 text-[var(--app-text)]">
                  {object.name}
                </h2>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                  {getObjectTypeLabel(object.type)}
                </p>
                <div className="mt-4 grid gap-1.5 text-sm text-[var(--app-text-secondary)]">
                  <span>{object.region || "Регион не указан"}</span>
                  <span>
                    {object.heightMeters
                      ? `${object.heightMeters} м`
                      : "Высота не указана"}
                  </span>
                  <span>Мероприятий: {object.events.length}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <section className="border border-[var(--app-border)] bg-[var(--app-surface)] p-6">
            <h2 className="text-xl font-semibold text-[var(--app-text)]">
              Объектов по выбранным фильтрам не найдено
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
