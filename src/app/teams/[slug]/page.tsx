/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { FollowButton } from "@/app/_components/follow-button";
import { EntityPostPreviewCard } from "@/app/posts/_components/entity-post-preview-card";
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
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <section className="overflow-hidden border border-zinc-200 bg-zinc-950 text-white">
          <div className="bg-[radial-gradient(circle_at_18%_0%,rgba(16,185,129,0.22),transparent_28%),linear-gradient(135deg,#09090b_0%,#18181b_58%,#030712_100%)] p-6 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                {team.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={team.logoUrl}
                    alt={team.logoMedia?.alt || `Логотип команды ${team.name}`}
                    className="h-28 w-28 aspect-square rounded-full border border-white/20 object-cover"
                  />
                ) : (
                  <div className="flex h-28 w-28 aspect-square items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10 text-3xl font-semibold">
                    {team.name.slice(0, 1).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="border border-emerald-200/30 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-200">
                      {getTeamStatusLabel(team.status)}
                    </span>
                    {team.region ? (
                      <span className="text-sm text-zinc-300">
                        {team.region}
                      </span>
                    ) : null}
                    <span className="text-sm text-zinc-400">
                      {team.followerCount} подписчиков
                    </span>
                  </div>

                  <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                    {team.name}
                  </h1>
                  <p className="mt-2 text-sm text-zinc-400">
                    /teams/{team.slug}
                  </p>
                  <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-200">
                    {descriptionPreview}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {currentUser ? (
                      <FollowButton
                        targetId={team.id}
                        targetType="team"
                        initialFollowing={team.isFollowedByCurrentUser}
                      />
                    ) : (
                      <Link
                        href={`/login?callbackUrl=${encodeURIComponent(`/teams/${team.slug}`)}`}
                        className="border border-white/25 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
                      >
                        Войдите, чтобы подписаться
                      </Link>
                    )}
                    <Link
                      href="#events"
                      className="border border-white/25 px-4 py-2 text-sm text-zinc-100 hover:bg-white/10"
                    >
                      Мероприятия команды
                    </Link>
                  </div>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <StatCard label="Участников" value={team.members.length} dark />
                <StatCard label="Мероприятий" value={team.events.length} dark />
                <StatCard label="Объектов" value={team.objects.length} dark />
                <StatCard label="Постов" value={team.posts.length} dark />
                <StatCard label="Ближайших" value={activeEvents.length} dark />
                <StatCard label="Проведённых" value={pastEvents.length} dark />
              </dl>
            </div>
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
          <InfoSection title="О команде">
            {team.description ? (
              <p className="max-w-3xl whitespace-pre-wrap">
                {team.description}
              </p>
            ) : (
              <p>Команда пока не добавила описание.</p>
            )}
          </InfoSection>

          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Команда в цифрах
            </h2>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <StatCard label="Подписчиков" value={team.followerCount} />
              <StatCard
                label="Публичных объектов"
                value={team.objects.length}
              />
              <StatCard
                label="Ближайших мероприятий"
                value={activeEvents.length}
              />
              <StatCard
                label="Прошедших мероприятий"
                value={pastEvents.length}
              />
            </dl>
          </section>
        </section>

        <section
          id="events"
          className="mt-6 border border-zinc-200 bg-white p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-zinc-950">
                Мероприятия команды
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                Ближайшие выезды и история открытых событий команды.
              </p>
            </div>
            <Link
              href={`/events?team=${team.slug}`}
              className="text-sm text-zinc-600 hover:text-zinc-950"
            >
              Все мероприятия
            </Link>
          </div>

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
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Люди команды</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Участники, организаторы и роли внутри команды.
          </p>

          {sortedMembers.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {sortedMembers.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">
              Участники пока не добавлены.
            </p>
          )}
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">
            Объекты команды
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Здесь показываются только публичные карточки объектов без координат,
            маршрутов доступа и технических деталей.
          </p>

          {team.objects.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {team.objects.map((object) => (
                <Link
                  key={object.id}
                  href={`/objects/${object.slug}`}
                  className="block border border-zinc-200 p-4 hover:border-zinc-950"
                >
                  {object.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={object.coverImageUrl}
                      alt={
                        object.coverMedia?.alt ||
                        `Фото объекта «${object.name}»`
                      }
                      className="mb-4 h-36 w-full border border-zinc-200 object-cover"
                    />
                  ) : null}
                  <h3 className="font-medium text-zinc-950">{object.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-600">
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
            <p className="mt-3 text-sm text-zinc-600">
              Публичных объектов пока нет.
            </p>
          )}
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-zinc-950">
                Публикации команды
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                Посты, фотографии, вопросы и истории вокруг выездов.
              </p>
            </div>
            <Link
              href={`/feed?team=${team.slug}`}
              className="text-sm text-zinc-600 hover:text-zinc-950"
            >
              Все посты команды
            </Link>
          </div>

          {team.posts.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {team.posts.map((post) => (
                <EntityPostPreviewCard
                  key={post.id}
                  isPinned={post.pins.some((pin) => pin.targetId === team.id)}
                  post={post}
                  showLinkedEntities={false}
                />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">Публикаций пока нет.</p>
          )}
        </section>
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

function InfoSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="border border-zinc-200 bg-white p-6">
      <h2 className="text-xl font-semibold text-zinc-950">{title}</h2>
      <div className="mt-4 text-sm leading-6 text-zinc-600">{children}</div>
    </section>
  );
}

function StatCard({
  dark = false,
  label,
  value,
}: {
  dark?: boolean;
  label: string;
  value: number;
}) {
  return (
    <div
      className={
        dark
          ? "border border-white/15 bg-white/10 p-3"
          : "border border-zinc-200 bg-white p-3"
      }
    >
      <dt className={dark ? "text-zinc-300" : "text-zinc-500"}>{label}</dt>
      <dd
        className={
          dark
            ? "mt-1 font-medium text-white"
            : "mt-1 font-medium text-zinc-950"
        }
      >
        {value}
      </dd>
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
      <h3 className="text-sm font-medium text-zinc-500">{title}</h3>
      {events.length > 0 ? (
        <>
          <div className="mt-3 grid gap-4">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          {afterText ? (
            <p className="mt-3 text-sm text-zinc-500">{afterText}</p>
          ) : null}
        </>
      ) : (
        <p className="mt-3 border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
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
      className="block border border-zinc-200 p-4 hover:border-zinc-950"
    >
      <div className="flex gap-4">
        {event.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverImageUrl}
            alt={
              event.coverMedia?.alt || `Обложка мероприятия «${event.title}»`
            }
            className="hidden h-24 w-32 border border-zinc-200 object-cover sm:block"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-base font-semibold text-zinc-950">
                {event.title}
              </h4>
              <p className="mt-1 text-sm text-zinc-500">
                {formatEventDateRange(event.startsAt, event.endsAt)}
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium text-zinc-500">
              {getEventStatusLabel(event.status)}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-600">
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
    <div className="flex flex-col gap-4 border border-zinc-200 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-12 w-12 aspect-square rounded-full border border-zinc-200 object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 aspect-square shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-50 text-sm font-medium text-zinc-500">
            {(displayName ?? "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-950">
            {displayName ?? "Участник без имени"}
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
            <p className="mt-1 text-sm text-zinc-600">{profile.city}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:items-end">
        <span className="text-xs font-medium text-zinc-500">
          {getTeamRoleLabel(member.role)}
        </span>
        {member.functionRoles.length > 0 ? (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {member.functionRoles.map((functionRole) => (
              <span
                key={functionRole}
                className="border border-zinc-200 px-2 py-1 text-xs text-zinc-600"
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
