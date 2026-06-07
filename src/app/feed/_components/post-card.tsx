/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import Link from "next/link";

import { PostAuthorAvatar } from "@/app/_components/post-author-avatar";
import type { RouterOutputs } from "@/trpc/react";

import { PostPinButton } from "./post-pin-button";

type PublicPost = RouterOutputs["post"]["listPublic"]["posts"][number];
type PinTarget = NonNullable<
  RouterOutputs["post"]["listPublic"]["currentPinTarget"]
>;

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
    <article className="border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
      <div className="flex items-start gap-3">
        <PostAuthorAvatar imageUrl={authorAvatar} label={authorName} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-[var(--app-text)]">{authorName}</p>
            {post.isPinnedInCurrentFilter ? (
              <span className="border border-amber-200 px-2 py-1 text-xs text-amber-800">
                Закреплено
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--app-muted)]">
            {post.author.profile?.username ? (
              <span>@{post.author.profile.username}</span>
            ) : null}
            <span>{formatFeedDate(post.createdAt)}</span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-base leading-7 whitespace-pre-wrap text-[var(--app-text-secondary)]">
        {post.content}
      </p>

      {post.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.imageUrl}
          alt={resolvedAlt}
          className="mt-4 max-h-96 w-full border border-[var(--app-border)] object-cover"
        />
      ) : null}

      <LinkedEntities post={post} />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--app-border)] pt-4 text-sm">
        <div className="flex flex-wrap gap-4 text-[var(--app-muted)]">
          <span>{post.viewsCount} просмотров</span>
          <span>{post._count.likes} лайков</span>
          <span>{post._count.comments} комментариев</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/posts/${post.id}`}
            className="font-medium text-[var(--app-text-secondary)] hover:text-[var(--app-text)]"
          >
            Открыть
          </Link>
          {isLoggedIn ? (
            <Link
              href={`/reports/new?targetType=POST&targetId=${post.id}`}
              className="text-[var(--app-muted)] hover:text-[var(--app-text)]"
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
      </div>
    </article>
  );
}

function LinkedEntities({ post }: PostCardProps) {
  if (!post.team && !post.event && !post.object) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2 text-sm text-[var(--app-text-secondary)]">
      {post.team ? (
        <Link
          href={`/teams/${post.team.slug}`}
          className="border border-[var(--app-border)] px-2 py-1 hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]"
        >
          Команда: {post.team.name}
        </Link>
      ) : null}
      {post.event ? (
        <Link
          href={`/events/${post.event.slug}`}
          className="border border-[var(--app-border)] px-2 py-1 hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]"
        >
          Мероприятие: {post.event.title}
        </Link>
      ) : null}
      {post.object ? (
        <Link
          href={`/objects/${post.object.slug}`}
          className="border border-[var(--app-border)] px-2 py-1 hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]"
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
