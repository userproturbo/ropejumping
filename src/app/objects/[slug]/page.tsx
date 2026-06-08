/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { FollowButton } from "@/app/_components/follow-button";
import { ImageGalleryViewer } from "@/app/_components/image-gallery-viewer";
import { ObjectLikeButton } from "@/app/_components/object-like-button";
import { formatEventDateRange } from "@/app/events/_components/date-format";
import { getEventStatusLabel, getObjectTypeLabel } from "@/lib/display";
import { getCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";
import type { RouterOutputs } from "@/trpc/react";

import { ObjectImpressions } from "../_components/object-impressions";

type ObjectPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type ObjectDetail = NonNullable<RouterOutputs["object"]["getBySlug"]>;
type ObjectEvent = ObjectDetail["events"][number];
type ObjectPost = ObjectDetail["posts"][number];

export default async function ObjectPage({ params }: ObjectPageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const object = await api.object.getBySlug(slug);

  if (!object) {
    notFound();
  }

  const canEdit = user
    ? await api.object
        .getForEdit(slug)
        .then(() => true)
        .catch(() => false)
    : false;
  const galleryImages = object.galleryImages
    .filter((image) => image.media.url)
    .map((image) => ({
      id: image.id,
      url: image.media.url!,
      alt: image.media.alt || `Фото объекта «${object.name}»`,
      caption: image.media.alt,
    }));
  const descriptionPreview = object.description?.trim()
    ? getDescriptionPreview(object.description)
    : "Публичная карточка объекта без координат, маршрутов доступа и технических деталей.";
  const heroFacts = [
    getObjectTypeLabel(object.type),
    object.heightMeters ? `${object.heightMeters} м` : null,
    object.region,
  ].filter((item): item is string => Boolean(item));

  return (
    <main className="min-h-[calc(100vh-4rem)] overflow-hidden bg-[#202020] text-[#e9eddc]">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="relative overflow-hidden border border-[rgba(199,217,136,0.28)] bg-[#10150e]">
          <div className="absolute inset-0 [background-image:linear-gradient(90deg,transparent_0_48%,rgba(199,217,136,0.08)_49%,transparent_51%),linear-gradient(0deg,transparent_0_48%,rgba(199,217,136,0.08)_49%,transparent_51%)] [background-size:46px_46px] opacity-25" />
          <div className="absolute top-0 right-0 h-64 w-64 bg-[radial-gradient(circle,rgba(199,217,136,0.2),transparent_66%)]" />
          <div className="relative grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="grid gap-5 md:grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)]">
              <div className="relative min-h-80 overflow-hidden rounded-[28px_28px_88px_28px] border border-[rgba(199,217,136,0.35)] bg-[#050705]">
                {object.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={object.coverImageUrl}
                    alt={
                      object.coverMedia?.alt || `Фото объекта «${object.name}»`
                    }
                    className="h-full min-h-80 w-full object-cover contrast-125 grayscale-[18%] saturate-[0.72]"
                  />
                ) : (
                  <div className="flex h-full min-h-80 items-center justify-center bg-[#151a12] px-6 text-center text-sm leading-6 text-[#aab497]">
                    Фото объекта пока не добавлено.
                  </div>
                )}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(16,21,14,0.72)),repeating-linear-gradient(0deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_7px)]" />
                <div className="absolute right-3 bottom-3 left-3 border border-[rgba(199,217,136,0.3)] bg-[rgba(5,7,5,0.72)] px-3 py-2 text-xs [overflow-wrap:anywhere] text-[#aab497] backdrop-blur">
                  <span className="text-[#c7d988]">Досье объекта</span>
                  {heroFacts.length > 0 ? (
                    <>
                      <span className="mx-2 text-[rgba(233,237,220,0.35)]">
                        /
                      </span>
                      {heroFacts.join(" / ")}
                    </>
                  ) : null}
                </div>
              </div>

              <div className="flex min-w-0 flex-col justify-between gap-6">
                <div>
                  <p className="text-xs font-medium tracking-[0.24em] text-[#aab497] uppercase">
                    Полевой отчёт
                  </p>
                  <h1 className="mt-3 text-4xl leading-tight font-semibold tracking-tight [overflow-wrap:anywhere] text-[#c7d988] sm:text-5xl">
                    {object.name}
                  </h1>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-[#aab497]">
                    <span className="border border-[rgba(199,217,136,0.25)] bg-[rgba(255,255,255,0.04)] px-3 py-1">
                      {getObjectTypeLabel(object.type)}
                    </span>
                    {object.heightMeters ? (
                      <span className="border border-[rgba(199,217,136,0.25)] bg-[rgba(255,255,255,0.04)] px-3 py-1">
                        {object.heightMeters} м
                      </span>
                    ) : null}
                    {object.region ? (
                      <span className="min-w-0 border border-[rgba(199,217,136,0.25)] bg-[rgba(255,255,255,0.04)] px-3 py-1 [overflow-wrap:anywhere]">
                        {object.region}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-5 max-w-2xl text-sm leading-6 text-[#d7dcc5]">
                    {descriptionPreview}
                  </p>
                  {object.createdByTeam ? (
                    <p className="mt-4 text-sm text-[#aab497]">
                      Добавила команда{" "}
                      <Link
                        href={`/teams/${object.createdByTeam.slug}`}
                        className="text-[#c7d988] hover:underline"
                      >
                        {object.createdByTeam.name}
                      </Link>
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  {user ? (
                    <FollowButton
                      targetId={object.id}
                      targetType="object"
                      initialFollowing={object.isFollowedByCurrentUser}
                      className="border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988] disabled:cursor-not-allowed disabled:text-[#aab497]"
                    />
                  ) : null}
                  {user ? (
                    <ObjectLikeButton
                      objectId={object.id}
                      initialLiked={object.isLikedByCurrentUser}
                      className="border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988] disabled:cursor-not-allowed disabled:text-[#aab497]"
                    />
                  ) : null}
                  <Link
                    href={`/reports/new?targetType=OBJECT&targetId=${object.id}`}
                    className="border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
                  >
                    Пожаловаться
                  </Link>
                  {canEdit ? (
                    <Link
                      href={`/objects/${object.slug}/edit`}
                      className="border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
                    >
                      Редактировать
                    </Link>
                  ) : null}
                  {!user ? (
                    <Link
                      href={`/login?callbackUrl=${encodeURIComponent(`/objects/${object.slug}`)}`}
                      className="border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
                    >
                      Войти для действий
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            <aside className="border border-[rgba(17,20,15,0.28)] bg-[#d7dcc5] p-4 text-[#11140f]">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase">
                Сигналы места
              </p>
              <dl className="mt-4 grid gap-3">
                <SignalStat
                  label="Высота"
                  value={
                    object.heightMeters ? `${object.heightMeters} м` : "нет"
                  }
                />
                <SignalStat
                  label="Тип"
                  value={getObjectTypeLabel(object.type)}
                />
                <SignalStat label="Регион" value={object.region ?? "нет"} />
                <SignalStat label="Событий" value={object.events.length} />
              </dl>
            </aside>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <DossierPanel marker="отчёт" title="Публичное описание">
            {object.description ? (
              <p className="max-w-3xl whitespace-pre-wrap">
                {object.description}
              </p>
            ) : (
              <p>Описание пока не добавлено.</p>
            )}
          </DossierPanel>

          <DossierPanel marker="метрики" title="Объект в цифрах">
            <dl className="grid gap-3 sm:grid-cols-2">
              <PanelStat label="Подписчиков" value={object.followerCount} />
              <PanelStat label="Нравится" value={object.likesCount} />
              <PanelStat label="Мероприятий" value={object.events.length} />
              <PanelStat label="Впечатлений" value={object.impressionsCount} />
            </dl>
          </DossierPanel>
        </section>

        {galleryImages.length > 0 ? (
          <DossierPanel
            className="mt-6"
            marker="фото"
            title="Фотографии объекта"
          >
            <p className="text-sm text-[#aab497]">
              Общие фотографии объекта без координат и технических деталей.
            </p>
            <ImageGalleryViewer
              images={galleryImages}
              className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3"
              imageClassName="h-40 w-full border border-[rgba(199,217,136,0.22)] object-cover contrast-110 grayscale-[12%] saturate-[0.78] sm:h-52"
              captionClassName="mt-2 block text-sm leading-5 text-[#aab497]"
            />
          </DossierPanel>
        ) : null}

        <DossierPanel
          className="mt-6"
          marker="лента"
          title="Публикации объекта"
          action={
            <Link
              href={`/feed?object=${object.slug}`}
              className="text-sm text-[#aab497] hover:text-[#c7d988] hover:underline"
            >
              Все посты объекта
            </Link>
          }
        >
          <p className="text-sm text-[#aab497]">
            Публикации и отчёты, связанные с этим объектом.
          </p>
          {object.posts.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {object.posts.map((post) => (
                <ObjectPostCard
                  key={post.id}
                  post={post}
                  isPinned={post.pins.some((pin) => pin.targetId === object.id)}
                />
              ))}
            </div>
          ) : (
            <p className="mt-5 border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4 text-sm text-[#d7dcc5]">
              Публикаций объекта пока нет.
            </p>
          )}
        </DossierPanel>

        <section className="mt-6 border border-[rgba(199,217,136,0.25)] bg-[#d7dcc5] p-4 text-[#11140f] sm:p-6">
          <p className="text-sm leading-6">
            Точное расположение, способы доступа, точки крепления, схемы и
            технические инструкции объекта не публикуются. Если вы заметили
            опасные детали в описании, отправьте жалобу модераторам.
          </p>
          <Link
            href={`/reports/new?targetType=OBJECT&targetId=${object.id}`}
            className="mt-4 inline-flex text-sm font-medium text-[#11140f] underline underline-offset-4 hover:text-[#5f6f38]"
          >
            Пожаловаться на объект
          </Link>
        </section>

        <ObjectImpressions
          objectId={object.id}
          objectName={object.name}
          impressions={object.impressions}
          myImpression={object.myImpression}
          impressionsCount={object.impressionsCount}
          isAuthenticated={Boolean(user)}
        />

        <DossierPanel
          className="mt-6"
          marker="события"
          title="Связанные мероприятия"
        >
          {object.events.length > 0 ? (
            <div className="grid gap-4">
              {object.events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <p className="border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4 text-sm text-[#d7dcc5]">
              Публичных мероприятий на этом объекте пока нет.
            </p>
          )}
        </DossierPanel>
      </div>
    </main>
  );
}

function getDescriptionPreview(description: string) {
  const normalizedDescription = description.trim().replace(/\s+/g, " ");

  return normalizedDescription.length > 220
    ? `${normalizedDescription.slice(0, 220)}...`
    : normalizedDescription;
}

function DossierPanel({
  action,
  children,
  className = "",
  marker,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  marker: string;
  title: string;
}) {
  return (
    <section
      className={`${className} border border-[rgba(199,217,136,0.25)] bg-[#10150e] p-4 text-sm leading-6 text-[#d7dcc5] sm:p-6`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(199,217,136,0.18)] pb-4">
        <h2 className="text-xl font-semibold text-[#e9eddc]">{title}</h2>
        <div className="flex flex-wrap items-center gap-3">
          {action}
          <span className="text-xs tracking-[0.2em] text-[#aab497] uppercase">
            {marker}
          </span>
        </div>
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}

function SignalStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="border border-[rgba(17,20,15,0.2)] bg-[rgba(17,20,15,0.06)] p-3">
      <dt className="text-xs font-semibold tracking-[0.16em] text-[#5f6f38] uppercase">
        {label}
      </dt>
      <dd className="mt-2 text-lg font-semibold [overflow-wrap:anywhere] text-[#11140f]">
        {value}
      </dd>
    </div>
  );
}

function PanelStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-3">
      <dt className="text-xs font-semibold tracking-[0.16em] text-[#aab497] uppercase">
        {label}
      </dt>
      <dd className="mt-2 text-2xl font-semibold text-[#c7d988]">{value}</dd>
    </div>
  );
}

function EventCard({ event }: { event: ObjectEvent }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="block border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4 hover:border-[rgba(199,217,136,0.55)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-[#e9eddc]">{event.title}</h3>
          <p className="mt-1 text-sm text-[#aab497]">
            {formatEventDateRange(event.startsAt, event.endsAt)}
          </p>
        </div>
        <span className="text-xs font-medium text-[#c7d988]">
          {getEventStatusLabel(event.status)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-sm text-[#d7dcc5]">
        <span>{event.team.name}</span>
        {event.region ? <span>{event.region}</span> : null}
      </div>
    </Link>
  );
}

function ObjectPostCard({
  isPinned,
  post,
}: {
  isPinned: boolean;
  post: ObjectPost;
}) {
  const profile = post.author.profile;
  const authorDisplayName =
    profile?.displayName ??
    profile?.username ??
    post.author.name ??
    "Участник без имени";
  const avatarUrl = profile?.avatarUrl ?? post.author.image ?? null;
  const imageAlt =
    post.imageMedia?.alt ||
    (post.event
      ? `Изображение к посту о мероприятии «${post.event.title}»`
      : "Изображение к посту об объекте");

  return (
    <Link
      href={`/posts/${post.id}`}
      className="block border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4 hover:border-[rgba(199,217,136,0.55)]"
    >
      <div className="flex items-start gap-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-10 w-10 border border-[rgba(199,217,136,0.28)] object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center border border-[rgba(199,217,136,0.28)] bg-[#151a12] text-sm font-semibold text-[#c7d988]">
            {authorDisplayName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-[#e9eddc]">
              {authorDisplayName}
            </p>
            {isPinned ? (
              <span className="border border-[rgba(199,217,136,0.28)] px-2 py-1 text-xs text-[#c7d988]">
                Закреплено
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-[#aab497]">
            {profile?.username ? <span>@{profile.username}</span> : null}
            <span>{formatShortDate(post.createdAt)}</span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-[#d7dcc5]">
        {getPostPreview(post.content)}
      </p>

      {post.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.imageUrl}
          alt={imageAlt}
          className="mt-4 h-48 w-full border border-[rgba(199,217,136,0.22)] object-cover contrast-110 grayscale-[12%] saturate-[0.78]"
        />
      ) : null}

      {post.event ? (
        <div className="mt-4 flex flex-wrap gap-2 text-sm text-[#aab497]">
          <span className="border border-[rgba(199,217,136,0.22)] px-2 py-1">
            Мероприятие: {post.event.title}
          </span>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-4 border-t border-[rgba(199,217,136,0.18)] pt-3 text-xs text-[#aab497]">
        <span>{post.viewsCount} просмотров</span>
        <span>{post._count.likes} лайков</span>
        <span>{post._count.comments} комментариев</span>
      </div>
    </Link>
  );
}

const getPostPreview = (content: string) => {
  const normalizedContent = content.trim();

  return normalizedContent.length > 240
    ? `${normalizedContent.slice(0, 240)}...`
    : normalizedContent;
};

const formatShortDate = (date: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
