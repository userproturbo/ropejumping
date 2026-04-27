import Link from "next/link";
import { notFound } from "next/navigation";

import { api } from "@/trpc/server";

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
                  {team.status}
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
                  No description yet.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Members</h2>
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
                        {displayName ?? "Unnamed member"}
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
                  <span className="text-xs font-medium text-zinc-500">
                    {member.role}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Events</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Events are not implemented yet.
          </p>
        </section>
      </div>
    </main>
  );
}
