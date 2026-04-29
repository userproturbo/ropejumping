import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { formatFeedDate, getAuthorName } from "../../feed/_components/post-card";
import { PostInteractions } from "../_components/post-interactions";

type PostPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const post = await api.post.getById(id);

  if (!post) {
    notFound();
  }

  const profile = user ? await api.profile.getMine() : null;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <article className="border border-zinc-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-zinc-950">
                {getAuthorName(post.author)}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {formatFeedDate(post.createdAt)}
              </p>
            </div>
            <Link href="/feed" className="text-sm text-zinc-600 hover:text-zinc-950">
              Лента
            </Link>
            {user ? (
              <Link
                href={`/reports/new?targetType=POST&targetId=${post.id}`}
                className="text-sm text-zinc-600 hover:text-zinc-950"
              >
                Пожаловаться
              </Link>
            ) : null}
          </div>

          <p className="mt-4 text-sm leading-6 whitespace-pre-wrap text-zinc-700">
            {post.content}
          </p>

          {post.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.imageUrl}
              alt=""
              className="mt-4 max-h-96 w-full border border-zinc-200 object-cover"
            />
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-600">
            {post.team ? (
              <Link
                href={`/teams/${post.team.slug}`}
                className="hover:text-zinc-950"
              >
                Команда: {post.team.name}
              </Link>
            ) : null}
            {post.event ? (
              <Link
                href={`/events/${post.event.slug}`}
                className="hover:text-zinc-950"
              >
                Мероприятие: {post.event.title}
              </Link>
            ) : null}
            {post.object ? (
              <Link
                href={`/objects/${post.object.slug}`}
                className="hover:text-zinc-950"
              >
                Объект: {post.object.name}
              </Link>
            ) : null}
          </div>
        </article>

        <PostInteractions
          canComment={Boolean(profile)}
          initialCommentsCount={post._count.comments}
          initialLiked={post.likes.length > 0}
          initialLikesCount={post._count.likes}
          isLoggedIn={Boolean(user)}
          postId={post.id}
        />

        {!user ? (
          <section className="mt-6 border border-zinc-200 bg-white p-6">
            <p className="text-sm text-zinc-600">
              Войдите, чтобы поставить лайк или написать комментарий.
            </p>
            <Link
              href={`/api/auth/signin?callbackUrl=${encodeURIComponent(`/posts/${post.id}`)}`}
              className="mt-4 inline-flex border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
            >
              Войти
            </Link>
          </section>
        ) : null}

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Комментарии</h2>
          {post.comments.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {post.comments.map((comment) => (
                <article key={comment.id} className="border border-zinc-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-medium text-zinc-950">
                      {getAuthorName(comment.author)}
                    </p>
                    <span className="text-xs text-zinc-500">
                      {formatFeedDate(comment.createdAt)}
                    </span>
                    {user ? (
                      <Link
                        href={`/reports/new?targetType=COMMENT&targetId=${comment.id}`}
                        className="text-xs text-zinc-500 hover:text-zinc-950"
                      >
                        Пожаловаться
                      </Link>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
                    {comment.content}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">
              Пока нет комментариев.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
