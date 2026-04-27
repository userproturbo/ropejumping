import { requireCurrentUser } from "@/server/auth/session";

import { TeamCreateForm } from "./team-create-form";

export default async function NewTeamPage() {
  await requireCurrentUser("/teams/new");

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

        <TeamCreateForm />
      </div>
    </main>
  );
}
