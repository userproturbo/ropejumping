/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PostAuthorAvatar } from "@/app/_components/post-author-avatar";
import { getCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import {
  formatFeedDate,
  getAuthorName,
} from "../../feed/_components/post-card";
import { CommentAuthorActions } from "../_components/comment-author-actions";
import { PostAuthorActions } from "../_components/post-author-actions";
import {
  PostDetailLikeMetric,
  PostInteractions,
} from "../_components/post-interactions";
import { PostViewTracker } from "../_components/post-view-tracker";

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
  const isPostAuthor = user?.id === post.author.id;
  const authorName = getAuthorName(post.author);
  const authorAvatar =
    post.author.profile?.avatarUrl ?? post.author.image ?? null;
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
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <PostViewTracker postId={post.id} />
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <article className="border border-zinc-200 bg-white p-6">
          <div className="flex min-w-0 items-start gap-3">
            <PostAuthorAvatar imageUrl={authorAvatar} label={authorName} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-zinc-950">{authorName}</p>
                {!post.showInFeed && isPostAuthor ? (
                  <span className="inline-flex border border-amber-200 px-2 py-1 text-xs text-amber-800">
                    Без общей ленты
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                {post.author.profile?.username ? (
                  <span>@{post.author.profile.username}</span>
                ) : null}
                <span>{formatFeedDate(post.createdAt)}</span>
              </div>
            </div>
          </div>

          <p className="mt-5 text-base leading-7 whitespace-pre-wrap text-zinc-700">
            {post.content}
          </p>

          {post.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.imageUrl}
              alt={resolvedAlt}
              className="mt-4 max-h-96 w-full border border-zinc-200 object-cover"
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
            <div className="flex flex-wrap items-center gap-4 text-zinc-500">
              <span
                className="inline-flex items-center gap-1.5"
                aria-label={`Просмотры: ${post.viewsCount}`}
              >
                <PostMetricIcon src="/svg/Eye.svg" />
                <span aria-hidden="true">{post.viewsCount}</span>
              </span>
              <PostDetailLikeMetric
                initialLiked={post.likes.length > 0}
                initialLikesCount={post._count.likes}
                isLoggedIn={Boolean(user)}
                postId={post.id}
              />
              <span
                className="inline-flex items-center gap-1.5"
                aria-label={`Комментарии: ${post._count.comments}`}
              >
                <PostMetricIcon src="/svg/Comments.svg" />
                <span aria-hidden="true">{post._count.comments}</span>
              </span>
            </div>
            <div className="flex items-center gap-3 text-zinc-600">
              <Link
                href="/feed"
                aria-label="Вернуться в ленту"
                className="group inline-flex items-center p-1 hover:text-zinc-950"
              >
                <PostMetricIcon src="/svg/tape.svg" interactive />
              </Link>
              {user ? (
                <Link
                  href={`/reports/new?targetType=POST&targetId=${post.id}`}
                  aria-label="Пожаловаться"
                  className="group inline-flex items-center p-1 hover:text-zinc-950"
                >
                  <PostMetricIcon src="/svg/complain.svg" interactive />
                </Link>
              ) : null}
            </div>
          </div>

          {isPostAuthor ? (
            <PostAuthorActions
              initialContent={post.content}
              initialImageMediaId={post.imageMediaId}
              initialImageUrl={post.imageUrl}
              postId={post.id}
            />
          ) : null}
        </article>

        <PostInteractions
          canComment={Boolean(profile)}
          isLoggedIn={Boolean(user)}
          postId={post.id}
        />

        {!user ? (
          <section className="mt-6 border border-zinc-200 bg-white p-6">
            <p className="text-sm text-zinc-600">
              Войдите, чтобы поставить лайк или написать комментарий.
            </p>
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/posts/${post.id}`)}`}
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
                <article
                  key={comment.id}
                  className="border border-zinc-200 p-4"
                >
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
                  {user?.id === comment.author.id ? (
                    <CommentAuthorActions
                      commentId={comment.id}
                      initialContent={comment.content}
                    />
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">Пока нет комментариев.</p>
          )}
        </section>
      </div>
    </main>
  );
}

function PostMetricIcon({
  interactive = false,
  src,
}: {
  interactive?: boolean;
  src: string;
}) {
  return (
    <Image
      src={src}
      alt=""
      aria-hidden="true"
      width={18}
      height={18}
      className={`feed-icon h-[18px] w-[18px] shrink-0 opacity-90 transition ${
        interactive ? "group-hover:opacity-100" : ""
      }`}
    />
  );
}
