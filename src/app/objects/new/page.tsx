import Link from "next/link";

import { TeamStatus } from "@/generated/prisma/enums";
import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { ObjectForm } from "../_components/object-form";

const manageableRoles = ["OWNER", "ADMIN", "ORGANIZER"];
const publicTeamStatuses: TeamStatus[] = [
  TeamStatus.REGULAR,
  TeamStatus.VERIFIED,
];

export default async function NewObjectPage() {
  await requireCurrentUser("/objects/new");

  const profile = await api.profile.getMine();
  const teams = await api.team.getMine();
  const manageableTeams = teams.filter((team) =>
    manageableRoles.includes(team.currentUserRole) &&
    publicTeamStatuses.includes(team.status),
  );

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Создать объект
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Добавьте общую публичную информацию без точных координат и
            технических деталей.
          </p>
        </div>

        {!profile ? (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Заполните профиль
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Перед созданием объекта заполните профиль. Так участники и
              организаторы будут понимать, кто добавил информацию.
            </p>
            <Link
              href="/profile/edit"
              className="mt-5 inline-flex bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-800"
            >
              Заполнить профиль
            </Link>
          </section>
        ) : manageableTeams.length > 0 ? (
          <ObjectForm teams={manageableTeams} />
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Нет команды для создания объекта
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Создавать объекты могут только организаторы команд.
            </p>
            <Link
              href="/teams/new"
              className="mt-5 inline-flex border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
            >
              Создать команду
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
