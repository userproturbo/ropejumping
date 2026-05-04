import Link from "next/link";

import { getTeamRoleLabel, getTeamStatusLabel } from "@/lib/display";
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
              Мои команды
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Команды, в которых вы состоите.
            </p>
          </div>
          <Link
            href="/teams/new"
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
          >
            Создать команду
          </Link>
        </div>

        {teams.length > 0 ? (
          <div className="grid gap-4">
            {teams.map((team) => {
              const canManageMembers =
                team.currentUserRole === "OWNER" ||
                team.currentUserRole === "ADMIN";

              return (
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
                        Ваша роль: {getTeamRoleLabel(team.currentUserRole)}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-zinc-500">
                      {getTeamStatusLabel(team.status)}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <Link
                      href={`/teams/${team.slug}`}
                      className="border border-zinc-300 px-3 py-2 text-zinc-800 hover:border-zinc-950"
                    >
                      Публичная страница
                    </Link>
                    {canManageMembers ? (
                      <>
                        <Link
                          href={`/teams/${team.slug}/settings`}
                          className="border border-zinc-300 px-3 py-2 text-zinc-800 hover:border-zinc-950"
                        >
                          Настройки
                        </Link>
                        <Link
                          href={`/teams/${team.slug}/members`}
                          className="bg-zinc-950 px-3 py-2 text-white hover:bg-zinc-800"
                        >
                          Участники
                        </Link>
                        <Link
                          href={`/teams/${team.slug}/join-requests`}
                          className="border border-zinc-300 px-3 py-2 text-zinc-800 hover:border-zinc-950"
                        >
                          Заявки
                        </Link>
                      </>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Вы пока не состоите в командах
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Создайте команду, чтобы стать ее владельцем.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
