import Link from "next/link";

import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { EventCreateForm } from "./event-create-form";

const manageableRoles = ["OWNER", "ADMIN", "ORGANIZER"];

export default async function NewEventPage() {
  await requireCurrentUser("/events/new");

  const teams = await api.team.getMine();
  const manageableTeams = teams.filter((team) =>
    manageableRoles.includes(team.currentUserRole),
  );

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Создать мероприятие
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Мероприятия пока публикуются сразу. Заявки еще не реализованы.
          </p>
        </div>

        {manageableTeams.length > 0 ? (
          <EventCreateForm teams={manageableTeams} />
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Нет команд для управления
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Чтобы создавать мероприятия, нужно быть владельцем,
              администратором или организатором команды.
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
