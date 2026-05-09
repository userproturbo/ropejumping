import Link from "next/link";

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
  });

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Лента
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Простая хронологическая лента сообщества.
            </p>
          </div>
          <Link
            href="/feed/new"
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
          >
            Создать пост
          </Link>
        </div>

        <form
          action="/feed"
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
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Постов по выбранным фильтрам не найдено
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
