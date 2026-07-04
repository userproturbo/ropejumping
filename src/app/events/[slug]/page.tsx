/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import Link from "next/link";
import { notFound } from "next/navigation";

import { ImageGalleryViewer } from "@/app/_components/image-gallery-viewer";
import { EntityPostPreviewCard } from "@/app/posts/_components/entity-post-preview-card";
import {
  ApplicationStatus,
  EventStatus,
  ObjectVisibility,
} from "@/generated/prisma/enums";
import {
  getEventStatusLabel,
  getObjectTypeLabel,
  getTeamFunctionRoleLabel,
} from "@/lib/display";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { canAccessEventChat } from "@/server/events/chat-permissions";
import { isEventChatReadOnlyStatus } from "@/server/events/chat-lifecycle";
import { applicationOpenEventStatuses } from "@/server/events/statuses";
import { isModeratorUser } from "@/server/moderation/permissions";
import { hasTeamOwnerAdminOrOrganizerRole } from "@/server/teams/permissions";
import { api } from "@/trpc/server";

import { EventChat } from "../_components/event-chat";
import { formatEventDateRange } from "../_components/date-format";
import { EventLogistics } from "../_components/event-logistics";
import { EventOrganizerWorkspace } from "../_components/event-organizer-workspace";
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

const emptyApplicationCounts = () => ({
  [ApplicationStatus.PENDING]: 0,
  [ApplicationStatus.ACCEPTED]: 0,
  [ApplicationStatus.REJECTED]: 0,
  [ApplicationStatus.CANCELLED_BY_USER]: 0,
  [ApplicationStatus.CONFIRMED_PARTICIPATION]: 0,
  [ApplicationStatus.NO_SHOW]: 0,
});

const getEventStatusHint = (status: EventStatus) => {
  if (applicationOpenEventStatuses.includes(status)) {
    return "Можно подать заявку";
  }

  if (status === EventStatus.FULL) return "Мест нет";
  if (status === EventStatus.COMPLETED) return "Мероприятие завершено";

  return null;
};

const getParticipationTitle = ({
  canManage,
  hasUser,
}: {
  canManage: boolean;
  hasUser: boolean;
}) => {
  if (canManage) return "Управление участием";
  if (hasUser) return "Ваша заявка";

  return "Участие";
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
  const applicationCounts = emptyApplicationCounts();
  const applicationStatusCounts = canManage
    ? await db.eventApplication.groupBy({
        by: ["status"],
        where: { eventId: event.id },
        _count: { _all: true },
      })
    : [];

  for (const statusCount of applicationStatusCounts) {
    applicationCounts[statusCount.status] = statusCount._count._all;
  }

  const totalApplications = applicationStatusCounts.reduce(
    (total, statusCount) => total + statusCount._count._all,
    0,
  );
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
  const statusHint = getEventStatusHint(event.status);
  const participationTitle = getParticipationTitle({
    canManage,
    hasUser: Boolean(user),
  });
  const publicObject =
    event.object?.visibility === ObjectVisibility.PUBLIC &&
    event.object.name &&
    event.object.slug &&
    event.object.type
      ? event.object
      : null;
  const hasHiddenObject = Boolean(
    event.object && event.object.visibility !== ObjectVisibility.PUBLIC,
  );
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
      caption: image.media.alt,
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
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <span className="border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700">
                {getEventStatusLabel(event.status)}
              </span>
              {statusHint ? (
                <span className="text-xs font-medium text-zinc-500">
                  {statusHint}
                </span>
              ) : null}
            </div>
          </div>

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-zinc-950">Когда</dt>
              <dd className="mt-1 text-zinc-600">
                {formatEventDateRange(event.startsAt, event.endsAt)}
              </dd>
            </div>
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
              <dt className="font-medium text-zinc-950">Места</dt>
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
              <dt className="font-medium text-zinc-950">Стоимость</dt>
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
            {publicObject ? (
              <div>
                <dt className="font-medium text-zinc-950">Объект</dt>
                <dd className="mt-1 text-zinc-600">
                  <Link
                    href={`/objects/${publicObject.slug}`}
                    className="hover:text-zinc-950"
                  >
                    {publicObject.name}
                  </Link>
                </dd>
              </div>
            ) : null}
            {hasHiddenObject ? (
              <div>
                <dt className="font-medium text-zinc-950">Объект</dt>
                <dd className="mt-1 text-zinc-600">Объект скрыт</dd>
              </div>
            ) : null}
          </dl>
        </section>

        {canManage ? (
          <EventOrganizerWorkspace
            applicationCounts={applicationCounts}
            dateText={formatEventDateRange(event.startsAt, event.endsAt)}
            eventSlug={event.slug}
            eventStatus={event.status}
            objectName={publicObject?.name ?? null}
            teamName={event.team.name}
            totalApplications={totalApplications}
            isReadOnly={isEventChatReadOnlyStatus(event.status)}
          />
        ) : null}

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-zinc-950">
                {participationTitle}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Первый раз? Прочитайте, как проходят мероприятия и что важно
                знать перед заявкой.
              </p>
            </div>
            <Link
              href="/first-jump"
              className="inline-flex border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
            >
              Первый прыжок
            </Link>
          </div>

          {applicationUnavailableMessage ? (
            <>
              <p className="mt-4 text-sm text-zinc-600">
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
              href={`/login?callbackUrl=${encodeURIComponent(`/events/${event.slug}`)}`}
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

        {canAccessChat ? (
          <>
            <EventLogistics
              eventId={event.id}
              eventTitle={event.title}
              canAccess={canAccessChat}
              canManage={canModerateChat}
              currentUserId={user?.id ?? null}
            />

            <EventChat
              eventId={event.id}
              eventSlug={event.slug}
              eventTitle={event.title}
              canAccess={canAccessChat}
              canModerate={canModerateChat}
              currentUserId={user?.id ?? null}
              isAuthenticated={Boolean(user)}
              isReadOnly={isEventChatReadOnlyStatus(event.status)}
            />
          </>
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
          <h2 className="text-xl font-semibold text-zinc-950">
            Требования и безопасность
          </h2>
          {event.requirementsText ? (
            <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
              {event.requirementsText}
            </p>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              Требования пока не добавлены.
            </p>
          )}
          <div className="mt-4 border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm leading-6 text-amber-900">
              Не публикуйте и не запрашивайте точные координаты, точки
              крепления, маршруты доступа и технические детали в публичных
              местах.
            </p>
            <Link
              href="/first-jump"
              className="mt-3 inline-flex text-sm font-medium text-amber-900 hover:text-amber-700"
            >
              Что знать перед первым прыжком
            </Link>
          </div>
        </section>

        {publicObject || hasHiddenObject ? (
          <section className="mt-6 border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">Объект</h2>
            {publicObject ? (
              <Link
                href={`/objects/${publicObject.slug}`}
                className="mt-4 block"
              >
                <h3 className="font-medium text-zinc-950 hover:text-zinc-700">
                  {publicObject.name}
                </h3>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-600">
                  <span>{getObjectTypeLabel(publicObject.type)}</span>
                  {publicObject.heightMeters ? (
                    <span>{publicObject.heightMeters} м</span>
                  ) : null}
                  {publicObject.region ? (
                    <span>{publicObject.region}</span>
                  ) : null}
                </div>
              </Link>
            ) : (
              <p className="mt-3 text-sm text-zinc-600">Объект скрыт</p>
            )}
          </section>
        ) : null}

        {galleryImages.length > 0 ? (
          <section className="mt-6 border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Фотографии мероприятия
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Моменты с мероприятия, добавленные командой.
            </p>
            <ImageGalleryViewer
              images={galleryImages}
              className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3"
            />
          </section>
        ) : null}

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
                            className="h-12 w-12 aspect-square rounded-full border border-zinc-200 object-cover"
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
                Состав пока не добавлен. Организатор может добавить
                инструкторов, операторов, фотографов и других участников
                команды.
              </p>
            )}
          </section>
        ) : null}

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
                            className="h-12 w-12 aspect-square rounded-full border border-zinc-200 object-cover"
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

        {event.status === EventStatus.COMPLETED ||
        event.participations.length > 0 ? (
          <section className="mt-6 border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Участники, подтверждённые организатором
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Эти участники были отмечены организатором после завершения
              мероприятия.
            </p>
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
                        <Link
                          href={`/u/${profile.username}`}
                          className="mt-1 block text-sm text-zinc-500 hover:text-zinc-950"
                        >
                          @{profile.username}
                        </Link>
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
