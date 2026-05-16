/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import Link from "next/link";
import { notFound } from "next/navigation";

import { ImageGalleryViewer } from "@/app/_components/image-gallery-viewer";
import { EntityPostPreviewCard } from "@/app/posts/_components/entity-post-preview-card";
import { EventStatus } from "@/generated/prisma/enums";
import {
  getEventStatusLabel,
  getObjectTypeLabel,
  getTeamFunctionRoleLabel,
} from "@/lib/display";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { canAccessEventChat } from "@/server/events/chat-permissions";
import { applicationOpenEventStatuses } from "@/server/events/statuses";
import { isModeratorUser } from "@/server/moderation/permissions";
import { hasTeamOwnerAdminOrOrganizerRole } from "@/server/teams/permissions";
import { api } from "@/trpc/server";

import { EventChat } from "../_components/event-chat";
import { formatEventDateRange } from "../_components/date-format";
import { EventApplicationPanel } from "./event-application-panel";

type EventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const getApplicationUnavailableMessage = (status: EventStatus) => {
  switch (status) {
    case EventStatus.FULL:
      return "Мест нет.";
    case EventStatus.APPLICATIONS_CLOSED:
      return "Приём заявок закрыт.";
    case EventStatus.POSTPONED:
      return "Мероприятие перенесено.";
    case EventStatus.CANCELLED:
      return "Мероприятие отменено.";
    case EventStatus.ARCHIVED:
      return "Мероприятие в архиве.";
    case EventStatus.COMPLETED:
      return "Мероприятие завершено.";
    case EventStatus.PUBLISHED:
      return "Мероприятие опубликовано. Приём заявок ещё не открыт.";
    case EventStatus.DRAFT:
      return "Приём заявок пока недоступен.";
    default:
      return null;
  }
};

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const event = await api.event.getBySlug(slug);

  if (!event) {
    notFound();
  }

  const application = user
    ? await api.application.getMineForEvent(slug).catch(() => null)
    : null;
  const canManage = user
    ? await api.event
        .getForEdit(slug)
        .then(() => true)
        .catch(() => false)
    : false;
  const canAccessChat = user
    ? (
        await canAccessEventChat({
          db,
          eventId: event.id,
          userId: user.id,
        })
      ).allowed
    : false;
  const canModerateChat = user
    ? isModeratorUser(user) ||
      (await hasTeamOwnerAdminOrOrganizerRole({
        db,
        teamId: event.team.id,
        userId: user.id,
      }))
    : false;
  const profile = user && !canManage ? await api.profile.getMine() : null;
  const canApply = applicationOpenEventStatuses.includes(event.status);
  const applicationUnavailableMessage = canApply
    ? null
    : getApplicationUnavailableMessage(event.status);
  const shouldShowCrewSection = event.crewMembers.length > 0 || canManage;
  const shouldShowAcceptedParticipantsSection =
    event.status !== EventStatus.COMPLETED &&
    (event.applications.length > 0 || canManage);
  const galleryImages = event.galleryImages
    .filter((image) => image.media.url)
    .map((image) => ({
      id: image.id,
      url: image.media.url!,
      alt: image.media.alt || `Фото мероприятия «${event.title}»`,
    }));

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <section className="border border-zinc-200 bg-white p-6">
          {event.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.coverImageUrl}
              alt={
                event.coverMedia?.alt || `Обложка мероприятия «${event.title}»`
              }
              className="mb-6 h-64 w-full border border-zinc-200 object-cover"
            />
          ) : null}

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
                {event.title}
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                {formatEventDateRange(event.startsAt, event.endsAt)}
              </p>
            </div>
            <span className="text-xs font-medium text-zinc-500">
              {getEventStatusLabel(event.status)}
            </span>
          </div>

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-zinc-950">Команда</dt>
              <dd className="mt-1 text-zinc-600">
                <Link
                  href={`/teams/${event.team.slug}`}
                  className="hover:text-zinc-950"
                >
                  {event.team.name}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-950">Регион</dt>
              <dd className="mt-1 text-zinc-600">
                {event.region ?? "Не указано"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-950">Количество мест</dt>
              <dd className="mt-1 text-zinc-600">
                {event.capacity ?? "Не указано"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-950">Заявки</dt>
              <dd className="mt-1 text-zinc-600">
                {event._count.applications}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-950">Цена</dt>
              <dd className="mt-1 text-zinc-600">
                {event.priceText ?? "Не указано"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-950">Уровень</dt>
              <dd className="mt-1 text-zinc-600">
                {event.levelText ?? "Не указано"}
              </dd>
            </div>
            {event.object ? (
              <div>
                <dt className="font-medium text-zinc-950">Объект</dt>
                <dd className="mt-1 text-zinc-600">
                  <Link
                    href={`/objects/${event.object.slug}`}
                    className="hover:text-zinc-950"
                  >
                    {event.object.name}
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        {galleryImages.length > 0 ? (
          <section className="mt-6 border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Галерея мероприятия
            </h2>
            <ImageGalleryViewer
              images={galleryImages}
              className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3"
            />
          </section>
        ) : null}

        {event.object ? (
          <section className="mt-6 border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">Объект</h2>
            <Link href={`/objects/${event.object.slug}`} className="mt-4 block">
              <h3 className="font-medium text-zinc-950 hover:text-zinc-700">
                {event.object.name}
              </h3>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-600">
                <span>{getObjectTypeLabel(event.object.type)}</span>
                {event.object.heightMeters ? (
                  <span>{event.object.heightMeters} м</span>
                ) : null}
                {event.object.region ? (
                  <span>{event.object.region}</span>
                ) : null}
              </div>
            </Link>
          </section>
        ) : null}

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Описание</h2>
          {event.description ? (
            <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
              {event.description}
            </p>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              Описание пока не добавлено.
            </p>
          )}
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-zinc-950">
                Публикации мероприятия
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                Обсуждение и публикации, связанные с этим мероприятием.
              </p>
            </div>
            <Link
              href={`/feed?event=${event.slug}`}
              className="inline-flex border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
            >
              Все посты мероприятия
            </Link>
          </div>

          {event.posts.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {event.posts.map((post) => (
                <EntityPostPreviewCard
                  key={post.id}
                  post={post}
                  isPinned={post.pins.some((pin) => pin.targetId === event.id)}
                />
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-zinc-600">
              Публикаций мероприятия пока нет.
            </p>
          )}
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Требования</h2>
          {event.requirementsText ? (
            <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
              {event.requirementsText}
            </p>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              Требования пока не добавлены.
            </p>
          )}
        </section>

        {shouldShowCrewSection ? (
          <section className="mt-6 border border-zinc-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <h2 className="text-xl font-semibold text-zinc-950">
                Команда проведения
              </h2>
              {canManage ? (
                <Link
                  href={`/events/${event.slug}/crew`}
                  className="text-sm text-zinc-600 hover:text-zinc-950"
                >
                  Управлять составом
                </Link>
              ) : null}
            </div>

            {event.crewMembers.length > 0 ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {event.crewMembers.map((crewMember) => {
                  const profile = crewMember.teamMember.user.profile;
                  const avatarUrl =
                    profile?.avatarUrl ?? crewMember.teamMember.user.image;
                  const displayName =
                    profile?.displayName ??
                    profile?.username ??
                    crewMember.teamMember.user.name ??
                    "Участник без имени";

                  return (
                    <article
                      key={crewMember.id}
                      className="border border-zinc-200 p-4"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatarUrl}
                            alt=""
                            className="h-12 w-12 border border-zinc-200 object-cover"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-950">
                            {displayName}
                          </p>
                          {profile?.username ? (
                            <Link
                              href={`/u/${profile.username}`}
                              className="mt-1 block text-sm text-zinc-500 hover:text-zinc-950"
                            >
                              @{profile.username}
                            </Link>
                          ) : null}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {crewMember.functionRoles.map((functionRole) => (
                              <span
                                key={functionRole}
                                className="border border-zinc-200 px-2 py-1 text-xs text-zinc-600"
                              >
                                {getTeamFunctionRoleLabel(functionRole)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {crewMember.note ? (
                        <p className="mt-4 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
                          {crewMember.note}
                        </p>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-600">
                Состав пока не добавлен.
              </p>
            )}
          </section>
        ) : null}

        {shouldShowAcceptedParticipantsSection ? (
          <section className="mt-6 border border-zinc-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <h2 className="text-xl font-semibold text-zinc-950">
                Принятые участники
              </h2>
              {canManage ? (
                <Link
                  href={`/events/${event.slug}/applications`}
                  className="text-sm text-zinc-600 hover:text-zinc-950"
                >
                  Управление заявками
                </Link>
              ) : null}
            </div>

            {event.applications.length > 0 ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {event.applications.map((acceptedApplication) => {
                  const { profile } = acceptedApplication.user;
                  const avatarUrl =
                    profile?.avatarUrl ?? acceptedApplication.user.image;
                  const displayName =
                    profile?.displayName ??
                    profile?.username ??
                    acceptedApplication.user.name ??
                    "Участник без имени";

                  return (
                    <article
                      key={acceptedApplication.id}
                      className="border border-zinc-200 p-4"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatarUrl}
                            alt=""
                            className="h-12 w-12 border border-zinc-200 object-cover"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-950">
                            {displayName}
                          </p>
                          {profile?.username ? (
                            <Link
                              href={`/u/${profile.username}`}
                              className="mt-1 block text-sm text-zinc-500 hover:text-zinc-950"
                            >
                              @{profile.username}
                            </Link>
                          ) : null}
                          {profile?.city ? (
                            <p className="mt-2 text-sm text-zinc-600">
                              {profile.city}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-600">
                Принятых участников пока нет.
              </p>
            )}
          </section>
        ) : null}

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Заявки</h2>
          {applicationUnavailableMessage ? (
            <>
              <p className="mt-2 text-sm text-zinc-600">
                {applicationUnavailableMessage}
              </p>
              {canManage ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/events/${event.slug}/applications`}
                    className="inline-flex border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
                  >
                    Управление заявками
                  </Link>
                  <Link
                    href={`/events/${event.slug}/complete`}
                    className="inline-flex border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
                  >
                    Завершить мероприятие
                  </Link>
                  <Link
                    href={`/events/${event.slug}/crew`}
                    className="inline-flex border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
                  >
                    Управлять составом
                  </Link>
                </div>
              ) : null}
            </>
          ) : !user ? (
            <Link
              href={`/api/auth/signin?callbackUrl=${encodeURIComponent(`/events/${event.slug}`)}`}
              className="mt-4 inline-flex border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
            >
              Войдите, чтобы подать заявку
            </Link>
          ) : canManage ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/events/${event.slug}/applications`}
                className="inline-flex border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
              >
                Управление заявками
              </Link>
              <Link
                href={`/events/${event.slug}/complete`}
                className="inline-flex border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
              >
                Завершить мероприятие
              </Link>
              <Link
                href={`/events/${event.slug}/crew`}
                className="inline-flex border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
              >
                Управлять составом
              </Link>
            </div>
          ) : (
            <EventApplicationPanel
              application={application}
              canApply={canApply}
              eventSlug={event.slug}
              hasProfile={Boolean(profile)}
            />
          )}
        </section>

        <EventChat
          eventId={event.id}
          eventSlug={event.slug}
          eventTitle={event.title}
          canAccess={canAccessChat}
          canModerate={canModerateChat}
          currentUserId={user?.id ?? null}
          isAuthenticated={Boolean(user)}
        />

        {event.status === EventStatus.COMPLETED ||
        event.participations.length > 0 ? (
          <section className="mt-6 border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Подтверждённые участники
            </h2>
            {event.participations.length > 0 ? (
              <div className="mt-5 grid gap-4">
                {event.participations.map((participation) => {
                  const profile = participation.user.profile;
                  const displayName =
                    profile?.displayName ??
                    profile?.username ??
                    participation.user.name ??
                    "Участник без имени";

                  return (
                    <div
                      key={participation.id}
                      className="border border-zinc-200 p-4"
                    >
                      <p className="font-medium text-zinc-950">{displayName}</p>
                      {profile?.username ? (
                        <p className="mt-1 text-sm text-zinc-500">
                          @{profile.username}
                        </p>
                      ) : null}
                      {profile?.city ? (
                        <p className="mt-1 text-sm text-zinc-600">
                          {profile.city}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-600">
                Подтверждённых участников пока нет.
              </p>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}
