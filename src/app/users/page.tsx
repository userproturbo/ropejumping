/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import Link from "next/link";

import { getBadgeCategoryLabel } from "@/lib/display";
import { api } from "@/trpc/server";

type UsersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const getSearchParamValue = (
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) => {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const { profiles, filters } = await api.profile.listPublic({
    q: getSearchParamValue(resolvedSearchParams, "q"),
    city: getSearchParamValue(resolvedSearchParams, "city"),
  });
  const hasActiveFilters = Boolean(filters.q || filters.city);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Участники
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Люди из сообщества: участники мероприятий, организаторы, команды и
            авторы публикаций.
          </p>
        </div>

        <form
          action="/users"
          method="get"
          className="mb-6 border border-zinc-200 bg-white p-5"
        >
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div className="grid gap-2">
              <label htmlFor="q" className="text-sm font-medium text-zinc-950">
                Поиск
              </label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={filters.q}
                placeholder="Поиск по имени, username или описанию"
                className="border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
              />
            </div>

            <div className="grid gap-2">
              <label
                htmlFor="city"
                className="text-sm font-medium text-zinc-950"
              >
                Город
              </label>
              <input
                id="city"
                name="city"
                defaultValue={filters.city}
                placeholder="Город"
                className="border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-800"
            >
              Найти
            </button>
            <Link
              href="/users"
              className="text-sm text-zinc-600 hover:text-zinc-950"
            >
              Сбросить
            </Link>
          </div>
        </form>

        {profiles.length > 0 ? (
          <>
            <p className="mb-4 text-sm text-zinc-500">
              Показаны последние 50 профилей.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {profiles.map((profile) => (
                <article
                  key={profile.id}
                  className="border border-zinc-200 bg-white p-5"
                >
                  <div className="flex gap-4">
                    {profile.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatarUrl}
                        alt={
                          profile.avatarMedia?.alt ||
                          profile.displayName ||
                          profile.username ||
                          "Аватар пользователя"
                        }
                        className="h-16 w-16 shrink-0 border border-zinc-200 object-cover"
                      />
                    ) : null}

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-lg font-semibold text-zinc-950">
                        {profile.displayName ??
                          (profile.username ? `@${profile.username}` : "Профиль")}
                      </h2>
                      {profile.username ? (
                        <p className="mt-1 text-sm text-zinc-500">
                          @{profile.username}
                        </p>
                      ) : null}
                      {profile.city ? (
                        <p className="mt-2 text-sm text-zinc-600">
                          {profile.city}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {profile.bio ? (
                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-zinc-600">
                      {profile.bio}
                    </p>
                  ) : null}

                  {profile.selfReportedJumpCount !== null ||
                  profile.selfReportedMaxHeightMeters !== null ? (
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-600">
                      {profile.selfReportedJumpCount !== null ? (
                        <span className="border border-zinc-200 px-2 py-1">
                          Заявлено: {profile.selfReportedJumpCount} прыжков
                        </span>
                      ) : null}
                      {profile.selfReportedMaxHeightMeters !== null ? (
                        <span className="border border-zinc-200 px-2 py-1">
                          Заявлено: до {profile.selfReportedMaxHeightMeters} м
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {profile.user.badges.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {profile.user.badges.map((userBadge) => (
                        <span
                          key={userBadge.id}
                          className="border border-zinc-200 px-2 py-1 text-xs text-zinc-600"
                        >
                          {userBadge.badge.name} ·{" "}
                          {getBadgeCategoryLabel(userBadge.badge.category)}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {profile.username ? (
                    <Link
                      href={`/u/${profile.username}`}
                      className="mt-5 inline-flex border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:border-zinc-950"
                    >
                      Открыть профиль
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Пользователи не найдены.
            </h2>
            {hasActiveFilters ? (
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Попробуйте изменить параметры поиска.
              </p>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}
