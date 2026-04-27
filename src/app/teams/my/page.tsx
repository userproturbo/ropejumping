import Link from "next/link";

import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

export default async function MyTeamsPage() {
  await requireCurrentUser("/teams/my");

  const teams = await api.team.getMine();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              My teams
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Teams where you are listed as a member.
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
              <section
                key={team.id}
                className="border border-zinc-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-950">
                      <Link
                        href={`/teams/${team.slug}`}
                        className="hover:text-zinc-600"
                      >
                        {team.name}
                      </Link>
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      Your role: {team.currentUserRole}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-zinc-500">
                    {team.status}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <Link
                    href={`/teams/${team.slug}`}
                    className="text-zinc-700 hover:text-zinc-950"
                  >
                    Public page
                  </Link>
                  {team.currentUserRole === "OWNER" ||
                  team.currentUserRole === "ADMIN" ? (
                    <Link
                      href={`/teams/${team.slug}/settings`}
                      className="text-zinc-700 hover:text-zinc-950"
                    >
                      Settings
                    </Link>
                  ) : null}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              No team memberships yet
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Create a team to become its owner.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
