/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import Link from "next/link";

import type { RouterOutputs } from "@/trpc/react";

import { PostPinButton } from "./post-pin-button";

type PublicPost = RouterOutputs["post"]["listPublic"]["posts"][number];
type PinTarget = NonNullable<RouterOutputs["post"]["listPublic"]["currentPinTarget"]>;

type PostCardProps = {
  currentPinTarget?: PinTarget | null;
  currentUserCanPin?: boolean;
  isLoggedIn?: boolean;
  post: PublicPost;
};

export function PostCard({
  currentPinTarget = null,
  currentUserCanPin = false,
  isLoggedIn = false,
  post,
}: PostCardProps) {
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
    <article className="border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-zinc-950">{getAuthorName(post.author)}</p>
            {post.isPinnedInCurrentFilter ? (
              <span className="border border-amber-200 px-2 py-1 text-xs text-amber-800">
                Закреплено
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {formatFeedDate(post.createdAt)}
          </p>
        </div>
        <Link
          href={`/posts/${post.id}`}
          className="text-sm text-zinc-600 hover:text-zinc-950"
        >
          Открыть
        </Link>
        {isLoggedIn ? (
          <Link
            href={`/reports/new?targetType=POST&targetId=${post.id}`}
            className="text-sm text-zinc-600 hover:text-zinc-950"
          >
            Пожаловаться
          </Link>
        ) : null}
        {currentUserCanPin && currentPinTarget ? (
          <PostPinButton
            isPinned={post.isPinnedInCurrentFilter}
            postId={post.id}
            target={currentPinTarget}
          />
        ) : null}
      </div>

      <p className="mt-4 text-sm leading-6 whitespace-pre-wrap text-zinc-700">
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

      <LinkedEntities post={post} />

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-500">
        <span>Просмотров: {post.viewsCount}</span>
        <span>Лайков: {post._count.likes}</span>
        <span>Комментариев: {post._count.comments}</span>
      </div>
    </article>
  );
}

function LinkedEntities({ post }: PostCardProps) {
  if (!post.team && !post.event && !post.object) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-600">
      {post.team ? (
        <Link href={`/teams/${post.team.slug}`} className="hover:text-zinc-950">
          Команда: {post.team.name}
        </Link>
      ) : null}
      {post.event ? (
        <Link href={`/events/${post.event.slug}`} className="hover:text-zinc-950">
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
  );
}

export const formatFeedDate = (date: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

export const getAuthorName = (author: PublicPost["author"]) =>
  author.profile?.displayName ??
  author.profile?.username ??
  author.name ??
  "Участник";
