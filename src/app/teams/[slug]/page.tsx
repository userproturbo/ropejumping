import Link from "next/link";
import { notFound } from "next/navigation";

import { EventStatus } from "@/generated/prisma/enums";
import {
  getEventStatusLabel,
  getObjectTypeLabel,
  getTeamFunctionRoleLabel,
  getTeamRoleLabel,
  getTeamStatusLabel,
} from "@/lib/display";
import { getCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";
import type { RouterOutputs } from "@/trpc/react";

import { formatEventDateRange } from "../../events/_components/date-format";
import { TeamJoinRequestPanel } from "./team-join-request-panel";

type TeamPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const activeEventStatuses = new Set<EventStatus>([
  EventStatus.PUBLISHED,
  EventStatus.APPLICATIONS_OPEN,
  EventStatus.FULL,
  EventStatus.APPLICATIONS_CLOSED,
  EventStatus.POSTPONED,
]);

const formatPostDate = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const getPostPreview = (content: string) => {
  const normalizedContent = content.trim();

  return normalizedContent.length > 240
    ? `${normalizedContent.slice(0, 240)}...`
    : normalizedContent;
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
  const activeEvents = team.events
    .filter((event) => activeEventStatuses.has(event.status))
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
  const pastEvents = team.events
    .filter((event) => !activeEventStatuses.has(event.status))
    .sort((left, right) => right.startsAt.getTime() - left.startsAt.getTime());

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <section className="border border-zinc-200 bg-white p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {team.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={team.logoUrl}
                alt=""
                className="h-24 w-24 border border-zinc-200 object-cover"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
                    {team.name}
                  </h1>
                  <p className="mt-1 text-sm text-zinc-500">
                    /teams/{team.slug}
                  </p>
                </div>
                <span className="text-xs font-medium text-zinc-500">
                  {getTeamStatusLabel(team.status)}
                </span>
              </div>

              {team.region ? (
                <p className="mt-4 text-sm text-zinc-600">{team.region}</p>
              ) : null}

              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
                <div className="border border-zinc-200 p-3">
                  <dt className="text-zinc-500">Участников</dt>
                  <dd className="mt-1 font-medium text-zinc-950">
                    {team.members.length}
                  </dd>
                </div>
                <div className="border border-zinc-200 p-3">
                  <dt className="text-zinc-500">Мероприятий</dt>
                  <dd className="mt-1 font-medium text-zinc-950">
                    {team.events.length}
                  </dd>
                </div>
                <div className="border border-zinc-200 p-3">
                  <dt className="text-zinc-500">Объектов</dt>
                  <dd className="mt-1 font-medium text-zinc-950">
                    {team.objects.length}
                  </dd>
                </div>
                <div className="border border-zinc-200 p-3">
                  <dt className="text-zinc-500">Постов</dt>
                  <dd className="mt-1 font-medium text-zinc-950">
                    {team.posts.length}
                  </dd>
                </div>
              </dl>

              {team.description ? (
                <p className="mt-4 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
                  {team.description}
                </p>
              ) : (
                <p className="mt-4 text-sm text-zinc-500">
                  Описание пока не добавлено.
                </p>
              )}
            </div>
          </div>
        </section>

        <TeamJoinRequestPanel
          teamSlug={team.slug}
          isAuthenticated={Boolean(currentUser)}
          state={joinRequestState}
        />

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Участники</h2>
          {team.members.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {team.members.map((member) => {
                const profile = member.user.profile;
                const avatarUrl = profile?.avatarUrl ?? member.user.image;
                const displayName =
                  profile?.displayName ?? profile?.username ?? member.user.name;

                return (
                  <div
                    key={member.id}
                    className="flex flex-col gap-4 border border-zinc-200 p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarUrl}
                          alt=""
                          className="h-10 w-10 border border-zinc-200 object-cover"
                        />
                      ) : null}
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
                          <p className="mt-1 text-sm text-zinc-600">
                            {profile.city}
                          </p>
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
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">
              Участники пока не добавлены.
            </p>
          )}
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Мероприятия</h2>
          {team.events.length > 0 ? (
            <div className="mt-5 space-y-6">
              {activeEvents.length > 0 ? (
                <div>
                  <h3 className="text-sm font-medium text-zinc-500">
                    Ближайшие и актуальные
                  </h3>
                  <div className="mt-3 grid gap-4">
                    {activeEvents.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                </div>
              ) : null}

              {pastEvents.length > 0 ? (
                <div>
                  <h3 className="text-sm font-medium text-zinc-500">
                    Прошедшие и архив
                  </h3>
                  <div className="mt-3 grid gap-4">
                    {pastEvents.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">
              Открытых мероприятий пока нет.
            </p>
          )}
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">
            Объекты команды
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            На странице показываются только публичные описания объектов без
            точных координат и технических деталей.
          </p>

          {team.objects.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
                      alt=""
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
            <h2 className="text-xl font-semibold text-zinc-950">
              Последние посты команды
            </h2>
            <Link href="/feed" className="text-sm text-zinc-600 hover:text-zinc-950">
              Вся лента
            </Link>
          </div>

          {team.posts.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {team.posts.map((post) => {
                const profile = post.author.profile;
                const authorDisplayName =
                  profile?.displayName ??
                  profile?.username ??
                  post.author.name ??
                  "Участник без имени";

                return (
                  <Link
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className="block border border-zinc-200 p-4 hover:border-zinc-950"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-950">
                          {authorDisplayName}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                          {profile?.username ? <span>@{profile.username}</span> : null}
                          <span>{formatPostDate.format(post.createdAt)}</span>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-500">
                        {post._count.likes} лайков · {post._count.comments} комментариев
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
                      {getPostPreview(post.content)}
                    </p>

                    {post.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.imageUrl}
                        alt=""
                        className="mt-4 h-48 w-full border border-zinc-200 object-cover"
                      />
                    ) : null}

                    {post.event || post.object ? (
                      <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-600">
                        {post.event ? <span>Мероприятие: {post.event.title}</span> : null}
                        {post.object ? <span>Объект: {post.object.name}</span> : null}
                      </div>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">
              Постов команды пока нет.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

type TeamEvent = NonNullable<RouterOutputs["team"]["getBySlug"]>["events"][number];

const EventCard = ({ event }: { event: TeamEvent }) => (
  <Link
    href={`/events/${event.slug}`}
    className="block border border-zinc-200 p-4 hover:border-zinc-950"
  >
    <div className="flex gap-4">
      {event.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.coverImageUrl}
          alt=""
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
          <span className="text-xs font-medium text-zinc-500">
            {getEventStatusLabel(event.status)}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-600">
          {event.region ? <span>{event.region}</span> : null}
          {event.object ? (
            <span>
              Объект: {event.object.name}
              {event.object.heightMeters ? `, ${event.object.heightMeters} м` : ""}
              {event.object.region ? `, ${event.object.region}` : ""}
            </span>
          ) : null}
          {event.capacity ? <span>Количество мест: {event.capacity}</span> : null}
          <span>Заявок: {event._count.applications}</span>
        </div>
      </div>
    </div>
  </Link>
);
