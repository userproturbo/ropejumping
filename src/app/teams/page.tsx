import Link from "next/link";

import { api } from "@/trpc/server";

export default async function TeamsPage() {
  const teams = await api.team.listPublic();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Teams
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Public ropejumping teams registered on the platform.
            </p>
          </div>
          <Link
            href="/teams/new"
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
          >
            Create team
          </Link>
        </div>

        {teams.length > 0 ? (
          <div className="grid gap-4">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.slug}`}
                className="block border border-zinc-200 bg-white p-5 hover:border-zinc-950"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-950">
                      {team.name}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      /teams/{team.slug}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-zinc-500">
                    {team.status}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-600">
                  {team.region ? <span>{team.region}</span> : null}
                  <span>
                    {team._count.members}{" "}
                    {team._count.members === 1 ? "member" : "members"}
                  </span>
                </div>
                {team.description ? (
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-zinc-600">
                    {team.description}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              No teams yet
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Teams will appear here after they are created.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
