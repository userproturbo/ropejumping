/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import Link from "next/link";

import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { formatFeedDate } from "../../feed/_components/post-card";

export default async function MyPostsPage() {
  await requireCurrentUser("/posts/my");

  const posts = await api.post.getMine();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Мои публикации
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Посты, которые вы создали для ленты или публичного профиля.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/feed/new"
              className="bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-800"
            >
              Создать пост
            </Link>
            <Link
              href="/feed"
              className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
            >
              Лента
            </Link>
          </div>
        </div>

        {posts.length > 0 ? (
          <div className="grid gap-4">
            {posts.map((post) => {
              const isVisible = post.hiddenAt === null;
              const resolvedAlt =
                post.imageMedia?.alt ||
                (post.event
                  ? `Изображение к посту о мероприятии «${post.event.title}»`
                  : post.object
                    ? `Изображение к посту об объекте «${post.object.name}»`
                    : post.team
                      ? `Изображение к посту команды «${post.team.name}»`
                      : "Изображение к посту");

              return (
                <article
                  key={post.id}
                  className="border border-zinc-200 bg-white p-5 transition hover:border-zinc-300"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-11 w-11 shrink-0 items-center justify-center border border-zinc-200 bg-zinc-50 text-sm font-medium text-zinc-600"
                    >
                      Я
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-zinc-950">
                          Моя публикация
                        </p>
                        <span
                          className={
                            !isVisible
                              ? "inline-flex border border-zinc-200 px-2 py-1 text-xs text-zinc-500"
                              : post.showInFeed
                                ? "inline-flex border border-emerald-200 px-2 py-1 text-xs text-emerald-800"
                                : "inline-flex border border-amber-200 px-2 py-1 text-xs text-amber-800"
                          }
                        >
                          {!isVisible
                            ? "Скрыт или удалён"
                            : post.showInFeed
                              ? "В ленте"
                              : "Только в профиле"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-500">
                        {formatFeedDate(post.createdAt)}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-4 text-base leading-7 whitespace-pre-wrap text-zinc-700">
                    {post.content}
                  </p>

                  {post.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.imageUrl}
                      alt={resolvedAlt}
                      className="mt-4 max-h-80 w-full border border-zinc-200 object-cover"
                    />
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2 text-sm text-zinc-600">
                    {post.team ? (
                      <Link
                        href={`/teams/${post.team.slug}`}
                        className="border border-zinc-200 px-2 py-1 hover:border-zinc-950 hover:text-zinc-950"
                      >
                        Команда: {post.team.name}
                      </Link>
                    ) : null}
                    {post.event ? (
                      <Link
                        href={`/events/${post.event.slug}`}
                        className="border border-zinc-200 px-2 py-1 hover:border-zinc-950 hover:text-zinc-950"
                      >
                        Мероприятие: {post.event.title}
                      </Link>
                    ) : null}
                    {post.object ? (
                      <Link
                        href={`/objects/${post.object.slug}`}
                        className="border border-zinc-200 px-2 py-1 hover:border-zinc-950 hover:text-zinc-950"
                      >
                        Объект: {post.object.name}
                      </Link>
                    ) : null}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4 text-sm">
                    <div className="flex flex-wrap gap-4 text-zinc-500">
                      <span>{post.viewsCount} просмотров</span>
                      <span>{post._count.likes} лайков</span>
                      <span>{post._count.comments} комментариев</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {isVisible ? (
                        <Link
                          href={`/posts/${post.id}`}
                          className="font-medium text-zinc-700 hover:text-zinc-950"
                        >
                          Открыть
                        </Link>
                      ) : (
                        <span className="text-zinc-400">
                          Публикация скрыта или удалена.
                        </span>
                      )}
                    </div>
                  </div>

                  {isVisible ? (
                    <p className="mt-4 text-sm text-zinc-500">
                      Редактировать или удалить пост можно на странице
                      публикации.
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              У вас пока нет публикаций
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Создайте пост — он может попасть в общую ленту или остаться только
              в профиле.
            </p>
            <Link
              href="/feed/new"
              className="mt-5 inline-flex bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-800"
            >
              Создать пост
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
