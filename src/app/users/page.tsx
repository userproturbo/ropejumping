/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import Link from "next/link";

import { CollapsibleFilterPanel } from "@/app/_components/collapsible-filter-panel";
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
  const activeFilterCount = [filters.q, filters.city].filter(Boolean).length;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[var(--app-bg)] text-[var(--app-text)]">
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 lg:py-10">
        <CollapsibleFilterPanel
          activeCount={activeFilterCount}
          defaultOpen={hasActiveFilters}
          header={
            <p className="max-w-2xl text-base leading-6 text-[var(--app-text)]">
              Участники Ropejumping сообщества
            </p>
          }
        >
          <form action="/users" method="get">
            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
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
        </CollapsibleFilterPanel>

        {profiles.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {profiles.map((profile) => {
                const profileName =
                  profile.displayName ??
                  (profile.username ? `@${profile.username}` : null) ??
                  profile.user.name ??
                  "Профиль";
                const cardContent = (
                  <>
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
                        className="h-16 w-16 aspect-square rounded-full border border-[var(--app-border)] object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 aspect-square items-center justify-center overflow-hidden rounded-full border border-[var(--app-border)] bg-[var(--app-surface-muted)] text-lg font-semibold text-[var(--app-text-muted)]">
                        {profileName.slice(0, 1)}
                      </div>
                    )}

                    <h2 className="mt-4 truncate text-lg font-semibold text-[var(--app-text)]">
                      {profileName}
                    </h2>
                    {profile.username && profile.displayName ? (
                      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                        @{profile.username}
                      </p>
                    ) : null}
                    <p className="mt-2 min-h-5 text-sm text-[var(--app-text-muted)]">
                      {profile.city || "Город не указан"}
                    </p>
                    <div className="mt-4 text-sm text-[var(--app-text-secondary)]">
                      Достижений: {profile.user._count.badges}
                    </div>
                  </>
                );

                return profile.username ? (
                    <Link
                      key={profile.id}
                      href={`/u/${profile.username}`}
                      className="block border border-[var(--app-border)] bg-[var(--app-surface)] p-4 transition hover:border-[var(--app-border-strong)]"
                    >
                      {cardContent}
                    </Link>
                  ) : (
                    <article
                      key={profile.id}
                      className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4"
                    >
                      {cardContent}
                    </article>
                  );
              })}
            </div>
          </>
        ) : (
          <section className="border border-[var(--app-border)] bg-[var(--app-surface)] p-6">
            <h2 className="text-xl font-semibold text-[var(--app-text)]">
              Пользователи не найдены.
            </h2>
            {hasActiveFilters ? (
              <p className="mt-2 text-sm leading-6 text-[var(--app-text-secondary)]">
                Попробуйте изменить параметры поиска.
              </p>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}
