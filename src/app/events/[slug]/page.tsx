/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ImageGalleryViewer } from "@/app/_components/image-gallery-viewer";
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
import type { RouterOutputs } from "@/trpc/react";

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

type EventDetail = NonNullable<RouterOutputs["event"]["getBySlug"]>;
type EventPost = EventDetail["posts"][number];
type CrewMember = EventDetail["crewMembers"][number];
type AcceptedApplication = EventDetail["applications"][number];
type ConfirmedParticipation = EventDetail["participations"][number];

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
  const eventFacts = [
    getEventStatusLabel(event.status),
    event.region,
    publicObject?.heightMeters ? `${publicObject.heightMeters} м` : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <main className="min-h-[calc(100vh-4rem)] overflow-hidden bg-[#202020] text-[#e9eddc]">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="relative overflow-hidden border border-[rgba(199,217,136,0.28)] bg-[#10150e]">
          <div className="absolute top-0 right-0 h-64 w-64 bg-[radial-gradient(circle,rgba(199,217,136,0.2),transparent_66%)]" />
          <div className="relative grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="grid gap-5 md:grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)]">
              <div className="relative min-h-80 overflow-hidden rounded-[28px_28px_88px_28px] border border-[rgba(199,217,136,0.35)] bg-[#050705]">
                {event.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.coverImageUrl}
                    alt={
                      event.coverMedia?.alt ||
                      `Обложка мероприятия «${event.title}»`
                    }
                    className="h-full min-h-80 w-full object-cover contrast-125 grayscale-[18%] saturate-[0.72]"
                  />
                ) : (
                  <div className="flex h-full min-h-80 items-center justify-center bg-[#151a12] px-6 text-center text-sm leading-6 text-[#aab497]">
                    Обложка мероприятия пока не добавлена.
                  </div>
                )}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(16,21,14,0.72)),repeating-linear-gradient(0deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_7px)]" />
                <div className="absolute right-3 bottom-3 left-3 border border-[rgba(199,217,136,0.3)] bg-[rgba(5,7,5,0.72)] px-3 py-2 text-xs [overflow-wrap:anywhere] text-[#aab497] backdrop-blur">
                  <span className="text-[#c7d988]">Досье мероприятия</span>
                  {eventFacts.length > 0 ? (
                    <>
                      <span className="mx-2 text-[rgba(233,237,220,0.35)]">
                        /
                      </span>
                      {eventFacts.join(" / ")}
                    </>
                  ) : null}
                </div>
              </div>

              <div className="flex min-w-0 flex-col justify-between gap-6">
                <div>
                  <p className="text-xs font-medium tracking-[0.24em] text-[#aab497] uppercase">
                    Брифинг выезда
                  </p>
                  <h1 className="mt-3 text-4xl leading-tight font-semibold tracking-tight [overflow-wrap:anywhere] text-[#c7d988] sm:text-5xl">
                    {event.title}
                  </h1>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-[#aab497]">
                    <span className="border border-[rgba(199,217,136,0.25)] bg-[rgba(255,255,255,0.04)] px-3 py-1">
                      {getEventStatusLabel(event.status)}
                    </span>
                    <span className="border border-[rgba(199,217,136,0.25)] bg-[rgba(255,255,255,0.04)] px-3 py-1">
                      {formatEventDateRange(event.startsAt, event.endsAt)}
                    </span>
                    {event.region ? (
                      <span className="min-w-0 border border-[rgba(199,217,136,0.25)] bg-[rgba(255,255,255,0.04)] px-3 py-1 [overflow-wrap:anywhere]">
                        {event.region}
                      </span>
                    ) : null}
                  </div>
                  {statusHint ? (
                    <p className="mt-4 text-sm text-[#c7d988]">{statusHint}</p>
                  ) : null}
                  <p className="mt-5 max-w-2xl text-sm leading-6 text-[#d7dcc5]">
                    {event.description
                      ? getDescriptionPreview(event.description)
                      : "Публичный брифинг мероприятия: сроки, команда, заявки и открытая информация по выезду."}
                  </p>
                </div>

                {canManage ? (
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/events/${event.slug}/edit`}
                      className="border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
                    >
                      Редактировать
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>

            <aside className="border border-[rgba(17,20,15,0.28)] bg-[#d7dcc5] p-4 text-[#11140f]">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase">
                Сигналы выезда
              </p>
              <dl className="mt-4 grid gap-3">
                <SignalStat
                  label="Дата"
                  value={formatEventDateRange(event.startsAt, event.endsAt)}
                />
                <SignalStat label="Заявки" value={event._count.applications} />
                <SignalStat
                  label="Места"
                  value={event.capacity ?? "не указано"}
                />
                <SignalStat
                  label="Объект"
                  value={
                    publicObject?.name ??
                    (hasHiddenObject ? "скрыт" : "не указан")
                  }
                />
              </dl>
            </aside>
          </div>
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

        <DossierPanel
          className="mt-6"
          marker="участие"
          title={participationTitle}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <p className="max-w-2xl text-sm leading-6 text-[#aab497]">
              Первый раз? Прочитайте, как проходят мероприятия и что важно знать
              перед заявкой.
            </p>
            <Link
              href="/first-jump"
              className="inline-flex border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
            >
              Первый прыжок
            </Link>
          </div>

          {applicationUnavailableMessage ? (
            <>
              <p className="mt-4 text-sm text-[#d7dcc5]">
                {applicationUnavailableMessage}
              </p>
              {canManage ? <ManageLinks eventSlug={event.slug} /> : null}
            </>
          ) : !user ? (
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/events/${event.slug}`)}`}
              className="mt-4 inline-flex border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
            >
              Войдите, чтобы подать заявку
            </Link>
          ) : canManage ? (
            <ManageLinks eventSlug={event.slug} />
          ) : (
            <EventApplicationPanel
              application={application}
              canApply={canApply}
              eventSlug={event.slug}
              hasProfile={Boolean(profile)}
            />
          )}
        </DossierPanel>

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

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <DossierPanel marker="брифинг" title="Описание">
            {event.description ? (
              <p className="whitespace-pre-wrap">{event.description}</p>
            ) : (
              <p>Описание пока не добавлено.</p>
            )}
          </DossierPanel>

          <DossierPanel marker="условия" title="Требования и безопасность">
            {event.requirementsText ? (
              <p className="whitespace-pre-wrap">{event.requirementsText}</p>
            ) : (
              <p>Требования пока не добавлены.</p>
            )}
            <div className="mt-4 border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4">
              <p className="text-sm leading-6 text-[#aab497]">
                Не публикуйте и не запрашивайте точные координаты, точки
                крепления, маршруты доступа и технические детали в публичных
                местах.
              </p>
              <Link
                href="/first-jump"
                className="mt-3 inline-flex text-sm font-medium text-[#c7d988] hover:underline"
              >
                Что знать перед первым прыжком
              </Link>
            </div>
          </DossierPanel>
        </section>

        {publicObject || hasHiddenObject ? (
          <DossierPanel className="mt-6" marker="объект" title="Объект">
            {publicObject ? (
              <Link
                href={`/objects/${publicObject.slug}`}
                className="block border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4 hover:border-[rgba(199,217,136,0.55)]"
              >
                <h3 className="font-medium text-[#e9eddc]">
                  {publicObject.name}
                </h3>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-[#aab497]">
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
              <p className="border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4">
                Объект скрыт
              </p>
            )}
          </DossierPanel>
        ) : null}

        {galleryImages.length > 0 ? (
          <DossierPanel
            className="mt-6"
            marker="фото"
            title="Фотографии мероприятия"
          >
            <p className="text-sm text-[#aab497]">
              Моменты с мероприятия, добавленные командой.
            </p>
            <ImageGalleryViewer
              images={galleryImages}
              className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3"
              imageClassName="h-40 w-full border border-[rgba(199,217,136,0.22)] object-cover contrast-110 grayscale-[12%] saturate-[0.78] sm:h-52"
              captionClassName="mt-2 block text-sm leading-5 text-[#aab497]"
            />
          </DossierPanel>
        ) : null}

        {shouldShowCrewSection ? (
          <DossierPanel
            className="mt-6"
            marker="состав"
            title="Команда проведения"
            action={
              canManage ? (
                <Link
                  href={`/events/${event.slug}/crew`}
                  className="text-sm text-[#aab497] hover:text-[#c7d988] hover:underline"
                >
                  Управлять составом
                </Link>
              ) : null
            }
          >
            {event.crewMembers.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {event.crewMembers.map((crewMember) => (
                  <CrewMemberCard key={crewMember.id} crewMember={crewMember} />
                ))}
              </div>
            ) : (
              <p className="border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4">
                Состав пока не добавлен. Организатор может добавить
                инструкторов, операторов, фотографов и других участников
                команды.
              </p>
            )}
          </DossierPanel>
        ) : null}

        <DossierPanel
          className="mt-6"
          marker="лента"
          title="Публикации мероприятия"
          action={
            <Link
              href={`/feed?event=${event.slug}`}
              className="text-sm text-[#aab497] hover:text-[#c7d988] hover:underline"
            >
              Все посты мероприятия
            </Link>
          }
        >
          <p className="text-sm text-[#aab497]">
            Обсуждение и публикации, связанные с этим мероприятием.
          </p>
          {event.posts.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {event.posts.map((post) => (
                <EventPostCard
                  key={post.id}
                  post={post}
                  isPinned={post.pins.some((pin) => pin.targetId === event.id)}
                />
              ))}
            </div>
          ) : (
            <p className="mt-5 border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4">
              Публикаций мероприятия пока нет.
            </p>
          )}
        </DossierPanel>

        {shouldShowAcceptedParticipantsSection ? (
          <DossierPanel
            className="mt-6"
            marker="заявки"
            title="Принятые участники"
            action={
              canManage ? (
                <Link
                  href={`/events/${event.slug}/applications`}
                  className="text-sm text-[#aab497] hover:text-[#c7d988] hover:underline"
                >
                  Управление заявками
                </Link>
              ) : null
            }
          >
            {event.applications.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {event.applications.map((acceptedApplication) => (
                  <PersonCard
                    key={acceptedApplication.id}
                    person={acceptedApplication}
                  />
                ))}
              </div>
            ) : (
              <p className="border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4">
                Принятых участников пока нет.
              </p>
            )}
          </DossierPanel>
        ) : null}

        {event.status === EventStatus.COMPLETED ||
        event.participations.length > 0 ? (
          <DossierPanel
            className="mt-6"
            marker="итоги"
            title="Участники, подтверждённые организатором"
          >
            <p className="text-sm text-[#aab497]">
              Эти участники были отмечены организатором после завершения
              мероприятия.
            </p>
            {event.participations.length > 0 ? (
              <div className="mt-5 grid gap-4">
                {event.participations.map((participation) => (
                  <ParticipationCard
                    key={participation.id}
                    participation={participation}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-5 border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4">
                Подтверждённых участников пока нет.
              </p>
            )}
          </DossierPanel>
        ) : null}
      </div>
    </main>
  );
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

function ManageLinks({ eventSlug }: { eventSlug: string }) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <Link
        href={`/events/${eventSlug}/applications`}
        className="inline-flex border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
      >
        Управление заявками
      </Link>
      <Link
        href={`/events/${eventSlug}/complete`}
        className="inline-flex border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
      >
        Завершить мероприятие
      </Link>
      <Link
        href={`/events/${eventSlug}/crew`}
        className="inline-flex border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
      >
        Управлять составом
      </Link>
    </div>
  );
}

function CrewMemberCard({ crewMember }: { crewMember: CrewMember }) {
  const profile = crewMember.teamMember.user.profile;
  const avatarUrl = profile?.avatarUrl ?? crewMember.teamMember.user.image;
  const displayName =
    profile?.displayName ??
    profile?.username ??
    crewMember.teamMember.user.name ??
    "Участник без имени";

  return (
    <article className="border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4">
      <div className="flex min-w-0 items-start gap-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-12 w-12 border border-[rgba(199,217,136,0.28)] object-cover"
          />
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[#e9eddc]">
            {displayName}
          </p>
          {profile?.username ? (
            <Link
              href={`/u/${profile.username}`}
              className="mt-1 block text-sm text-[#aab497] hover:text-[#c7d988]"
            >
              @{profile.username}
            </Link>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            {crewMember.functionRoles.map((functionRole) => (
              <span
                key={functionRole}
                className="border border-[rgba(199,217,136,0.22)] px-2 py-1 text-xs text-[#aab497]"
              >
                {getTeamFunctionRoleLabel(functionRole)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {crewMember.note ? (
        <p className="mt-4 text-sm leading-6 whitespace-pre-wrap text-[#d7dcc5]">
          {crewMember.note}
        </p>
      ) : null}
    </article>
  );
}

function PersonCard({ person }: { person: AcceptedApplication }) {
  const { profile } = person.user;
  const avatarUrl = profile?.avatarUrl ?? person.user.image;
  const displayName =
    profile?.displayName ??
    profile?.username ??
    person.user.name ??
    "Участник без имени";

  return (
    <article className="border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4">
      <div className="flex min-w-0 items-start gap-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-12 w-12 border border-[rgba(199,217,136,0.28)] object-cover"
          />
        ) : null}
        <PersonText
          city={profile?.city ?? null}
          displayName={displayName}
          username={profile?.username ?? null}
        />
      </div>
    </article>
  );
}

function ParticipationCard({
  participation,
}: {
  participation: ConfirmedParticipation;
}) {
  const profile = participation.user.profile;
  const displayName =
    profile?.displayName ??
    profile?.username ??
    participation.user.name ??
    "Участник без имени";

  return (
    <div className="border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4">
      <PersonText
        city={profile?.city ?? null}
        displayName={displayName}
        username={profile?.username ?? null}
      />
    </div>
  );
}

function PersonText({
  city,
  displayName,
  username,
}: {
  city: string | null;
  displayName: string;
  username: string | null;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-[#e9eddc]">
        {displayName}
      </p>
      {username ? (
        <Link
          href={`/u/${username}`}
          className="mt-1 block text-sm text-[#aab497] hover:text-[#c7d988]"
        >
          @{username}
        </Link>
      ) : null}
      {city ? <p className="mt-1 text-sm text-[#aab497]">{city}</p> : null}
    </div>
  );
}

function EventPostCard({
  isPinned,
  post,
}: {
  isPinned: boolean;
  post: EventPost;
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
    (post.object
      ? `Изображение к посту об объекте «${post.object.name}»`
      : "Изображение к посту мероприятия");

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

      {post.object ? (
        <div className="mt-4 flex flex-wrap gap-2 text-sm text-[#aab497]">
          <span className="border border-[rgba(199,217,136,0.22)] px-2 py-1">
            Объект: {post.object.name}
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

function getDescriptionPreview(description: string) {
  const normalizedDescription = description.trim().replace(/\s+/g, " ");

  return normalizedDescription.length > 220
    ? `${normalizedDescription.slice(0, 220)}...`
    : normalizedDescription;
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
