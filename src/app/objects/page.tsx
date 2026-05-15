/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import Link from "next/link";

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
    });

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Объекты
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Публичный каталог объектов с безопасным общим описанием.
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              В каталоге показываются только публичные описания объектов без
              точных координат, способов доступа и технических деталей.
            </p>
          </div>
          <Link
            href="/objects/new"
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
          >
            Создать объект
          </Link>
        </div>

        <form
          action="/objects"
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

        {objects.length > 0 ? (
          <div className="grid gap-4">
            {objects.map((object) => (
              <article
                key={object.id}
                className="border border-zinc-200 bg-white p-5"
              >
                <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
                  {object.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={object.coverImageUrl}
                      alt={object.coverMedia?.alt || `Фото объекта «${object.name}»`}
                      className="h-36 w-full object-cover sm:h-28"
                    />
                  ) : null}

                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold text-zinc-950">
                          <Link
                            href={`/objects/${object.slug}`}
                            className="hover:text-zinc-700"
                          >
                            {object.name}
                          </Link>
                        </h2>
                        <p className="mt-1 text-sm text-zinc-500">
                          {getObjectTypeLabel(object.type)}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-zinc-500">
                        Мероприятий: {object.events.length}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-600">
                      {object.heightMeters ? (
                        <span>{object.heightMeters} м</span>
                      ) : null}
                      {object.region ? <span>{object.region}</span> : null}
                      {object.createdByTeam ? (
                        <Link
                          href={`/teams/${object.createdByTeam.slug}`}
                          className="text-zinc-800 hover:text-zinc-950"
                        >
                          {object.createdByTeam.name}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Объектов по выбранным фильтрам не найдено
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
