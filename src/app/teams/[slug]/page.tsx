/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { FollowButton } from "@/app/_components/follow-button";
import {
  EventStatus,
  ObjectVisibility,
  TeamRole,
} from "@/generated/prisma/enums";
import {
  getEventStatusLabel,
  getObjectTypeLabel,
  getTeamFunctionRoleLabel,
  getTeamRoleLabel,
  getTeamStatusLabel,
} from "@/lib/display";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import {
  canAccessTeamChat,
  canModerateTeamChat,
} from "@/server/teams/chat-permissions";
import { api } from "@/trpc/server";
import type { RouterOutputs } from "@/trpc/react";

import { formatEventDateRange } from "../../events/_components/date-format";
import { TeamChat } from "../_components/team-chat";
import { TeamJoinRequestPanel } from "./team-join-request-panel";

type TeamPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type TeamEvent = NonNullable<
  RouterOutputs["team"]["getBySlug"]
>["events"][number];

type TeamMember = NonNullable<
  RouterOutputs["team"]["getBySlug"]
>["members"][number];

type TeamPost = NonNullable<
  RouterOutputs["team"]["getBySlug"]
>["posts"][number];

const activeEventStatuses = new Set<EventStatus>([
  EventStatus.PUBLISHED,
  EventStatus.APPLICATIONS_OPEN,
  EventStatus.FULL,
  EventStatus.APPLICATIONS_CLOSED,
  EventStatus.POSTPONED,
]);

const roleRank: Record<TeamRole, number> = {
  [TeamRole.OWNER]: 0,
  [TeamRole.ADMIN]: 1,
  [TeamRole.ORGANIZER]: 2,
  [TeamRole.MEMBER]: 3,
};

export default async function TeamPage({ params }: TeamPageProps) {
  const { slug } = await params;
  const team = await api.team.getBySlug(slug);

  if (!team) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const joinRequestState = currentUser
    ? await api.teamJoinRequest.getMineForTeam(slug).catch(() => null)
    : null;
  const canAccessChat = currentUser
    ? (
        await canAccessTeamChat({
          db,
          teamId: team.id,
          userId: currentUser.id,
        })
      ).allowed
    : false;
  const canModerateChat = currentUser
    ? (
        await canModerateTeamChat({
          db,
          teamId: team.id,
          userId: currentUser.id,
          user: currentUser,
        })
      ).allowed
    : false;
  const activeEvents = team.events
    .filter((event) => activeEventStatuses.has(event.status))
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
  const pastEvents = team.events
    .filter((event) => !activeEventStatuses.has(event.status))
    .sort((left, right) => right.startsAt.getTime() - left.startsAt.getTime());
  const visiblePastEvents = pastEvents.slice(0, 5);
  const sortedMembers = [...team.members].sort(
    (left, right) =>
      roleRank[left.role] - roleRank[right.role] ||
      left.createdAt.getTime() - right.createdAt.getTime(),
  );
  const descriptionPreview = team.description?.trim()
    ? getDescriptionPreview(team.description)
    : "Команда роупджампинга: мероприятия, участники и история выездов.";

  return (
    <main className="min-h-[calc(100vh-4rem)] overflow-hidden bg-[#202020] text-[#e9eddc]">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="relative overflow-hidden border border-[rgba(199,217,136,0.28)] bg-[#10150e]">
          <div className="absolute inset-0 [background-image:linear-gradient(90deg,transparent_0_48%,rgba(199,217,136,0.08)_49%,transparent_51%),linear-gradient(0deg,transparent_0_48%,rgba(199,217,136,0.08)_49%,transparent_51%)] [background-size:46px_46px] opacity-25" />
          <div className="absolute top-0 right-0 h-64 w-64 bg-[radial-gradient(circle,rgba(199,217,136,0.2),transparent_66%)]" />
          <div className="relative grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="grid gap-5 md:grid-cols-[13rem_minmax(0,1fr)]">
              <div className="relative min-h-72 overflow-hidden rounded-[28px_28px_88px_28px] border border-[rgba(199,217,136,0.35)] bg-[#050705]">
                {team.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={team.logoUrl}
                    alt={team.logoMedia?.alt || `Логотип команды ${team.name}`}
                    className="h-full min-h-72 w-full object-cover contrast-125 grayscale-[18%] saturate-[0.72]"
                  />
                ) : (
                  <div className="flex h-full min-h-72 items-center justify-center bg-[#151a12] text-6xl font-semibold text-[#c7d988]">
                    {team.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(16,21,14,0.72)),repeating-linear-gradient(0deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_7px)]" />
                <div className="absolute right-3 bottom-3 left-3 border border-[rgba(199,217,136,0.3)] bg-[rgba(5,7,5,0.72)] px-3 py-2 text-xs [overflow-wrap:anywhere] text-[#aab497] backdrop-blur">
                  <span className="text-[#c7d988]">Штаб команды</span>
                  <span className="mx-2 text-[rgba(233,237,220,0.35)]">/</span>
                  {team.slug}
                </div>
              </div>

              <div className="flex min-w-0 flex-col justify-between gap-6">
                <div>
                  <p className="text-xs font-medium tracking-[0.24em] text-[#aab497] uppercase">
                    Досье команды
                  </p>
                  <h1 className="mt-3 text-4xl leading-tight font-semibold tracking-tight [overflow-wrap:anywhere] text-[#c7d988] sm:text-5xl">
                    {team.name}
                  </h1>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-[#aab497]">
                    <span className="border border-[rgba(199,217,136,0.25)] bg-[rgba(255,255,255,0.04)] px-3 py-1">
                      {getTeamStatusLabel(team.status)}
                    </span>
                    {team.region ? (
                      <span className="min-w-0 border border-[rgba(199,217,136,0.25)] bg-[rgba(255,255,255,0.04)] px-3 py-1 [overflow-wrap:anywhere]">
                        {team.region}
                      </span>
                    ) : null}
                    <span className="border border-[rgba(199,217,136,0.25)] bg-[rgba(255,255,255,0.04)] px-3 py-1">
                      Подписчиков: {team.followerCount}
                    </span>
                  </div>
                  <p className="mt-5 max-w-2xl text-sm leading-6 text-[#d7dcc5]">
                    {descriptionPreview}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {currentUser ? (
                    <FollowButton
                      targetId={team.id}
                      targetType="team"
                      initialFollowing={team.isFollowedByCurrentUser}
                      className="border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988] disabled:cursor-not-allowed disabled:text-[#aab497]"
                    />
                  ) : (
                    <Link
                      href={`/login?callbackUrl=${encodeURIComponent(`/teams/${team.slug}`)}`}
                      className="border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
                    >
                      Войдите, чтобы подписаться
                    </Link>
                  )}
                  <Link
                    href="#events"
                    className="border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
                  >
                    Мероприятия команды
                  </Link>
                </div>
              </div>
            </div>

            <aside className="border border-[rgba(17,20,15,0.28)] bg-[#d7dcc5] p-4 text-[#11140f]">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase">
                Сигналы базы
              </p>
              <dl className="mt-4 grid gap-3">
                <SignalStat label="Участников" value={team.members.length} />
                <SignalStat label="Мероприятий" value={team.events.length} />
                <SignalStat label="Объектов" value={team.objects.length} />
                <SignalStat label="Постов" value={team.posts.length} />
              </dl>
            </aside>
          </div>
        </section>

        <TeamJoinRequestPanel
          teamSlug={team.slug}
          isAuthenticated={Boolean(currentUser)}
          state={joinRequestState}
        />

        {canAccessChat ? (
          <TeamChat
            teamId={team.id}
            teamName={team.name}
            canAccess
            canModerate={canModerateChat}
            currentUserId={currentUser?.id ?? null}
            isAuthenticated={Boolean(currentUser)}
          />
        ) : null}

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <DossierPanel marker="описание" title="О команде">
            {team.description ? (
              <p className="max-w-3xl whitespace-pre-wrap">
                {team.description}
              </p>
            ) : (
              <p>Команда пока не добавила описание.</p>
            )}
          </DossierPanel>

          <DossierPanel marker="цифры" title="Команда в цифрах">
            <dl className="grid gap-3 sm:grid-cols-2">
              <PanelStat label="Подписчиков" value={team.followerCount} />
              <PanelStat
                label="Публичных объектов"
                value={team.objects.length}
              />
              <PanelStat label="Ближайших" value={activeEvents.length} />
              <PanelStat label="Прошедших" value={pastEvents.length} />
            </dl>
          </DossierPanel>
        </section>

        <DossierPanel
          className="mt-6"
          id="events"
          marker="выезды"
          title="Мероприятия команды"
          action={
            <Link
              href={`/events?team=${team.slug}`}
              className="text-sm text-[#aab497] hover:text-[#c7d988] hover:underline"
            >
              Все мероприятия
            </Link>
          }
        >
          <p className="text-sm text-[#aab497]">
            Ближайшие выезды и история открытых событий команды.
          </p>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <EventList
              title="Ближайшие мероприятия"
              emptyText="Ближайших мероприятий пока нет."
              events={activeEvents}
            />
            <EventList
              title="Прошедшие мероприятия"
              emptyText="Прошедших мероприятий пока нет."
              events={visiblePastEvents}
              afterText={
                pastEvents.length > visiblePastEvents.length
                  ? `Показаны последние ${visiblePastEvents.length} из ${pastEvents.length}.`
                  : null
              }
            />
          </div>
        </DossierPanel>

        <DossierPanel className="mt-6" marker="экипаж" title="Люди команды">
          <p className="text-sm text-[#aab497]">
            Участники, организаторы и роли внутри команды.
          </p>
          {sortedMembers.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {sortedMembers.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          ) : (
            <p className="mt-5 border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4 text-sm text-[#d7dcc5]">
              Участники пока не добавлены.
            </p>
          )}
        </DossierPanel>

        <DossierPanel className="mt-6" marker="объекты" title="Объекты команды">
          <p className="text-sm text-[#aab497]">
            Здесь показываются только публичные карточки объектов без координат,
            маршрутов доступа и технических деталей.
          </p>

          {team.objects.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {team.objects.map((object) => (
                <Link
                  key={object.id}
                  href={`/objects/${object.slug}`}
                  className="block border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4 hover:border-[rgba(199,217,136,0.55)]"
                >
                  {object.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={object.coverImageUrl}
                      alt={
                        object.coverMedia?.alt ||
                        `Фото объекта «${object.name}»`
                      }
                      className="mb-4 h-36 w-full border border-[rgba(199,217,136,0.22)] object-cover contrast-110 grayscale-[12%] saturate-[0.78]"
                    />
                  ) : null}
                  <h3 className="font-medium text-[#e9eddc]">{object.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-[#aab497]">
                    <span>{getObjectTypeLabel(object.type)}</span>
                    {object.heightMeters ? (
                      <span>{object.heightMeters} м</span>
                    ) : null}
                    {object.region ? <span>{object.region}</span> : null}
                    <span>Мероприятий: {object.events.length}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-5 border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4 text-sm text-[#d7dcc5]">
              Публичных объектов пока нет.
            </p>
          )}
        </DossierPanel>

        <DossierPanel
          className="mt-6"
          marker="лента"
          title="Публикации команды"
          action={
            <Link
              href={`/feed?team=${team.slug}`}
              className="text-sm text-[#aab497] hover:text-[#c7d988] hover:underline"
            >
              Все посты команды
            </Link>
          }
        >
          <p className="text-sm text-[#aab497]">
            Посты, фотографии, вопросы и истории вокруг выездов.
          </p>
          {team.posts.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {team.posts.map((post) => (
                <TeamPostCard
                  key={post.id}
                  isPinned={post.pins.some((pin) => pin.targetId === team.id)}
                  post={post}
                />
              ))}
            </div>
          ) : (
            <p className="mt-5 border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4 text-sm text-[#d7dcc5]">
              Публикаций пока нет.
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
  id,
  marker,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  marker: string;
  title: string;
}) {
  return (
    <section
      id={id}
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

function SignalStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-[rgba(17,20,15,0.2)] bg-[rgba(17,20,15,0.06)] p-3">
      <dt className="text-xs font-semibold tracking-[0.16em] text-[#5f6f38] uppercase">
        {label}
      </dt>
      <dd className="mt-2 text-2xl font-semibold text-[#11140f]">{value}</dd>
    </div>
  );
}

function PanelStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-3">
      <dt className="text-xs font-semibold tracking-[0.16em] text-[#aab497] uppercase">
        {label}
      </dt>
      <dd className="mt-2 text-2xl font-semibold text-[#c7d988]">{value}</dd>
    </div>
  );
}

function EventList({
  afterText,
  emptyText,
  events,
  title,
}: {
  afterText?: string | null;
  emptyText: string;
  events: TeamEvent[];
  title: string;
}) {
  return (
    <section>
      <h3 className="text-sm font-medium text-[#c7d988]">{title}</h3>
      {events.length > 0 ? (
        <>
          <div className="mt-3 grid gap-4">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          {afterText ? (
            <p className="mt-3 text-sm text-[#aab497]">{afterText}</p>
          ) : null}
        </>
      ) : (
        <p className="mt-3 border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4 text-sm text-[#d7dcc5]">
          {emptyText}
        </p>
      )}
    </section>
  );
}

function EventCard({ event }: { event: TeamEvent }) {
  const publicObject =
    event.object?.visibility === ObjectVisibility.PUBLIC ? event.object : null;

  return (
    <Link
      href={`/events/${event.slug}`}
      className="block border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4 hover:border-[rgba(199,217,136,0.55)]"
    >
      <div className="flex gap-4">
        {event.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverImageUrl}
            alt={
              event.coverMedia?.alt || `Обложка мероприятия «${event.title}»`
            }
            className="hidden h-24 w-32 border border-[rgba(199,217,136,0.22)] object-cover contrast-110 grayscale-[12%] saturate-[0.78] sm:block"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="text-base font-semibold text-[#e9eddc]">
                {event.title}
              </h4>
              <p className="mt-1 text-sm text-[#aab497]">
                {formatEventDateRange(event.startsAt, event.endsAt)}
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium text-[#c7d988]">
              {getEventStatusLabel(event.status)}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-[#d7dcc5]">
            {event.region ? <span>{event.region}</span> : null}
            {event.object ? (
              publicObject ? (
                <span>
                  Объект: {publicObject.name}
                  {publicObject.heightMeters
                    ? `, ${publicObject.heightMeters} м`
                    : ""}
                  {publicObject.region ? `, ${publicObject.region}` : ""}
                </span>
              ) : (
                <span>Объект скрыт</span>
              )
            ) : null}
            {event.capacity ? (
              <span>Количество мест: {event.capacity}</span>
            ) : null}
            <span>Заявок: {event._count.applications}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function MemberCard({ member }: { member: TeamMember }) {
  const profile = member.user.profile;
  const avatarUrl = profile?.avatarUrl ?? member.user.image;
  const displayName =
    profile?.displayName ?? profile?.username ?? member.user.name;

  return (
    <div className="flex flex-col gap-4 border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-12 w-12 border border-[rgba(199,217,136,0.28)] object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[rgba(199,217,136,0.28)] bg-[#151a12] text-sm font-medium text-[#c7d988]">
            {(displayName ?? "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[#e9eddc]">
            {displayName ?? "Участник без имени"}
          </p>
          {profile?.username ? (
            <Link
              href={`/u/${profile.username}`}
              className="mt-1 block text-sm text-[#aab497] hover:text-[#c7d988]"
            >
              @{profile.username}
            </Link>
          ) : null}
          {profile?.city ? (
            <p className="mt-1 text-sm text-[#aab497]">{profile.city}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:items-end">
        <span className="text-xs font-medium text-[#c7d988]">
          {getTeamRoleLabel(member.role)}
        </span>
        {member.functionRoles.length > 0 ? (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {member.functionRoles.map((functionRole) => (
              <span
                key={functionRole}
                className="border border-[rgba(199,217,136,0.22)] px-2 py-1 text-xs text-[#aab497]"
              >
                {getTeamFunctionRoleLabel(functionRole)}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TeamPostCard({
  isPinned,
  post,
}: {
  isPinned: boolean;
  post: TeamPost;
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
      : post.object
        ? `Изображение к посту об объекте «${post.object.name}»`
        : "Изображение к посту команды");

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

      {(post.event || post.object) && (
        <div className="mt-4 flex flex-wrap gap-2 text-sm text-[#aab497]">
          {post.event ? (
            <span className="border border-[rgba(199,217,136,0.22)] px-2 py-1">
              Мероприятие: {post.event.title}
            </span>
          ) : null}
          {post.object ? (
            <span className="border border-[rgba(199,217,136,0.22)] px-2 py-1">
              Объект: {post.object.name}
            </span>
          ) : null}
        </div>
      )}

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
