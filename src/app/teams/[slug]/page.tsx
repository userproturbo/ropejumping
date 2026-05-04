import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getEventStatusLabel,
  getTeamFunctionRoleLabel,
  getTeamRoleLabel,
  getTeamStatusLabel,
} from "@/lib/display";
import { getCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { formatEventDateRange } from "../../events/_components/date-format";
import { TeamJoinRequestPanel } from "./team-join-request-panel";

type TeamPageProps = {
  params: Promise<{
    slug: string;
  }>;
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
          <div className="mt-5 grid gap-4">
            {team.members.map((member) => {
              const profile = member.user.profile;
              const displayName =
                profile?.displayName ?? profile?.username ?? member.user.name;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-4 border border-zinc-200 p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {profile?.avatarUrl ?? member.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile?.avatarUrl ?? member.user.image ?? ""}
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
                          className="text-sm text-zinc-500 hover:text-zinc-950"
                        >
                          @{profile.username}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs font-medium text-zinc-500">
                      {getTeamRoleLabel(member.role)}
                    </span>
                    {member.functionRoles.length > 0 ? (
                      <div className="flex flex-wrap justify-end gap-2">
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
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Мероприятия</h2>
          {team.events.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {team.events.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="block border border-zinc-200 p-4 hover:border-zinc-950"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-950">
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
                    {event.region ? <span>{event.region}</span> : null}
                    {event.capacity ? (
                      <span>Количество мест: {event.capacity}</span>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">
              Открытых мероприятий пока нет.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
