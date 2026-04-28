import Link from "next/link";
import { notFound } from "next/navigation";

import { api } from "@/trpc/server";

import { formatEventDateRange } from "../../events/_components/date-format";

type PublicProfilePageProps = {
  params: Promise<{
    username: string;
  }>;
};

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { username } = await params;
  const profile = await api.profile.getByUsername(username);

  if (!profile) {
    notFound();
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <section className="space-y-6 border border-zinc-200 bg-white p-6">
          <div className="flex items-start gap-4">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt=""
                className="h-20 w-20 border border-zinc-200 object-cover"
              />
            ) : null}
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
                {profile.displayName ?? profile.username}
              </h1>
              <p className="mt-1 text-sm text-zinc-500">@{profile.username}</p>
              {profile.city ? (
                <p className="mt-3 text-sm text-zinc-600">{profile.city}</p>
              ) : null}
            </div>
          </div>

          {profile.bio ? (
            <div>
              <h2 className="text-sm font-medium text-zinc-950">О себе</h2>
              <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
                {profile.bio}
              </p>
            </div>
          ) : null}

          {profile.externalExperience ? (
            <div>
              <h2 className="text-sm font-medium text-zinc-950">
                Опыт вне платформы
              </h2>
              <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
                {profile.externalExperience}
              </p>
            </div>
          ) : null}
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">
            История участия
          </h2>
          {profile.user.eventParticipations.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {profile.user.eventParticipations.map((participation) => (
                <Link
                  key={participation.id}
                  href={`/events/${participation.event.slug}`}
                  className="block border border-zinc-200 p-4 hover:border-zinc-950"
                >
                  <h3 className="text-base font-semibold text-zinc-950">
                    {participation.event.title}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    {formatEventDateRange(
                      participation.event.startsAt,
                      participation.event.endsAt,
                    )}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    Команда: {participation.event.team.name}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">
              Пока нет подтверждённых участий.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
