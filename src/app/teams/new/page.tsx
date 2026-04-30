import Link from "next/link";

import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { TeamCreateForm } from "./team-create-form";

export default async function NewTeamPage() {
  await requireCurrentUser("/teams/new");

  const profile = await api.profile.getMine();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Создать команду
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Добавьте основную публичную информацию. Приглашения участников пока
            не реализованы.
          </p>
        </div>

        {profile ? (
          <TeamCreateForm />
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Сначала заполните профиль
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Перед созданием команды нужно заполнить публичный профиль. Так
              участники смогут понять, кто стоит за командой.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href="/profile/edit"
                className="inline-flex bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-800"
              >
                Заполнить профиль
              </Link>
              <Link
                href="/teams"
                className="text-sm text-zinc-600 hover:text-zinc-950"
              >
                Вернуться к командам
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
