import Link from "next/link";

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

export default async function TeamsPage({ searchParams }: TeamsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const { teams, availableRegions, filters } = await api.team.listPublic({
    q: getSearchParamValue(resolvedSearchParams, "q"),
    region: getSearchParamValue(resolvedSearchParams, "region"),
    status: getSearchParamValue(resolvedSearchParams, "status"),
  });

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Команды
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Команды роупджампинг-сообщества, зарегистрированные на платформе.
            </p>
          </div>
          <Link
            href="/teams/new"
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
          >
            Создать команду
          </Link>
        </div>

        <form
          action="/teams"
          method="get"
          className="mb-6 border border-zinc-200 bg-white p-5"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <label htmlFor="q" className="text-sm font-medium text-zinc-950">
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

        {teams.length > 0 ? (
          <div className="grid gap-4">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.slug}`}
                className="block border border-zinc-200 bg-white p-5 hover:border-zinc-950"
              >
                <div
                  className={
                    team.logoUrl ? "grid gap-5 sm:grid-cols-[72px_1fr]" : ""
                  }
                >
                  {team.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={team.logoUrl}
                      alt={team.name}
                      className="h-16 w-16 border border-zinc-200 object-cover"
                    />
                  ) : null}

                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold text-zinc-950">
                          {team.name}
                        </h2>
                        <p className="mt-1 text-sm text-zinc-500">
                          /teams/{team.slug}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-zinc-500">
                        {getTeamStatusLabel(team.status)}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-600">
                      {team.region ? <span>{team.region}</span> : null}
                      <span>
                        {team._count.members}{" "}
                        {team._count.members === 1 ? "участник" : "участников"}
                      </span>
                    </div>
                    {team.description ? (
                      <p className="mt-4 line-clamp-3 text-sm leading-6 text-zinc-600">
                        {team.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Команд по выбранным фильтрам не найдено
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
