/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import Link from "next/link";
import { notFound } from "next/navigation";

import { FollowButton } from "@/app/_components/follow-button";
import { ImageGalleryViewer } from "@/app/_components/image-gallery-viewer";
import { formatEventDateRange } from "@/app/events/_components/date-format";
import { EntityPostPreviewCard } from "@/app/posts/_components/entity-post-preview-card";
import { getEventStatusLabel, getObjectTypeLabel } from "@/lib/display";
import { getCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

type ObjectPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

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
    }));

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <section className="border border-zinc-200 bg-white p-6">
          {object.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={object.coverImageUrl}
              alt={object.coverMedia?.alt || `Фото объекта «${object.name}»`}
              className="mb-6 h-64 w-full border border-zinc-200 object-cover"
            />
          ) : null}

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
                {object.name}
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                {getObjectTypeLabel(object.type)}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {user ? (
                <FollowButton
                  targetId={object.id}
                  targetType="object"
                  initialFollowing={object.isFollowedByCurrentUser}
                />
              ) : null}
              <Link
                href={`/reports/new?targetType=OBJECT&targetId=${object.id}`}
                className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
              >
                Пожаловаться на объект
              </Link>
              {canEdit ? (
                <Link
                  href={`/objects/${object.slug}/edit`}
                  className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
                >
                  Редактировать
                </Link>
              ) : null}
            </div>
          </div>

          <p className="mt-4 text-sm text-zinc-600">
            Подписчиков: {object.followerCount}
          </p>
          {!user ? (
            <Link
              href="/api/auth/signin"
              className="mt-3 inline-flex text-sm text-zinc-600 hover:text-zinc-950"
            >
              Войдите, чтобы подписаться
            </Link>
          ) : null}

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-zinc-950">Тип</dt>
              <dd className="mt-1 text-zinc-600">
                {getObjectTypeLabel(object.type)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-950">Высота</dt>
              <dd className="mt-1 text-zinc-600">
                {object.heightMeters
                  ? `${object.heightMeters} м`
                  : "Не указано"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-950">Регион</dt>
              <dd className="mt-1 text-zinc-600">
                {object.region ?? "Не указано"}
              </dd>
            </div>
            {object.createdByTeam ? (
              <div>
                <dt className="font-medium text-zinc-950">Добавила команда</dt>
                <dd className="mt-1 text-zinc-600">
                  <Link
                    href={`/teams/${object.createdByTeam.slug}`}
                    className="hover:text-zinc-950"
                  >
                    {object.createdByTeam.name}
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        {galleryImages.length > 0 ? (
          <section className="mt-6 border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Галерея объекта
            </h2>
            <ImageGalleryViewer
              images={galleryImages}
              className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3"
            />
          </section>
        ) : null}

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-zinc-950">
                Публикации объекта
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                Публикации и отчёты, связанные с этим объектом.
              </p>
            </div>
            <Link
              href={`/feed?object=${object.slug}`}
              className="inline-flex border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
            >
              Все посты объекта
            </Link>
          </div>

          {object.posts.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {object.posts.map((post) => (
                <EntityPostPreviewCard
                  key={post.id}
                  post={post}
                  isPinned={post.pins.some((pin) => pin.targetId === object.id)}
                />
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-zinc-600">
              Публикаций объекта пока нет.
            </p>
          )}
        </section>

        <section className="mt-6 border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm leading-6 text-amber-900">
            Точное расположение, способы доступа, точки крепления, схемы и
            технические инструкции объекта не публикуются. Если вы заметили
            опасные детали в описании, отправьте жалобу модераторам.
          </p>
          <Link
            href={`/reports/new?targetType=OBJECT&targetId=${object.id}`}
            className="mt-4 inline-flex text-sm font-medium text-amber-950 hover:text-zinc-950"
          >
            Пожаловаться на объект
          </Link>
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Описание</h2>
          {object.description ? (
            <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
              {object.description}
            </p>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              Описание пока не добавлено.
            </p>
          )}
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">
            Связанные мероприятия
          </h2>
          {object.events.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {object.events.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="block border border-zinc-200 p-4 hover:border-zinc-950"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-zinc-950">
                        {event.title}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        {formatEventDateRange(event.startsAt, event.endsAt)}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-zinc-500">
                      {getEventStatusLabel(event.status)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-600">
                    <span>{event.team.name}</span>
                    {event.region ? <span>{event.region}</span> : null}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">
              Публичных мероприятий на этом объекте пока нет.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
