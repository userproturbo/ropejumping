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
              Посты, которые вы создали в ленте.
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
                  className="border border-zinc-200 bg-white p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-zinc-500">
                        {formatFeedDate(post.createdAt)}
                      </p>
                      <span
                        className={
                          isVisible
                            ? "mt-2 inline-flex border border-emerald-200 px-2 py-1 text-xs text-emerald-800"
                            : "mt-2 inline-flex border border-zinc-200 px-2 py-1 text-xs text-zinc-500"
                        }
                      >
                        {isVisible ? "Опубликован" : "Скрыт или удалён"}
                      </span>
                    </div>
                    {isVisible ? (
                      <Link
                        href={`/posts/${post.id}`}
                        className="text-sm text-zinc-600 hover:text-zinc-950"
                      >
                        Открыть
                      </Link>
                    ) : (
                      <span className="text-sm text-zinc-400">
                        Публикация скрыта и не открывается публично.
                      </span>
                    )}
                  </div>

                  <p className="mt-4 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                    {post.content}
                  </p>

                  {post.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.imageUrl}
                      alt={resolvedAlt}
                      className="mt-4 max-h-72 w-full border border-zinc-200 object-cover"
                    />
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-600">
                    {post.team ? <span>Команда: {post.team.name}</span> : null}
                    {post.event ? (
                      <span>Мероприятие: {post.event.title}</span>
                    ) : null}
                    {post.object ? <span>Объект: {post.object.name}</span> : null}
                    <span>Лайков: {post._count.likes}</span>
                    <span>Комментариев: {post._count.comments}</span>
                  </div>

                  {isVisible ? (
                    <p className="mt-4 text-sm text-zinc-500">
                      Редактировать или удалить пост можно на странице публикации.
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Публикаций пока нет
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Создайте первый пост в ленте сообщества.
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
