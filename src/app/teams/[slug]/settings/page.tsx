import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { TeamSettingsForm } from "./team-settings-form";

type TeamSettingsPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function TeamSettingsPage({
  params,
}: TeamSettingsPageProps) {
  const { slug } = await params;
  await requireCurrentUser(`/teams/${slug}/settings`);

  const team = await api.team.getForSettings(slug).catch(() => null);

  if (!team) {
    notFound();
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Настройки команды
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Редактирование основной информации команды. Изменение slug пока
            недоступно.
          </p>
        </div>

        <section className="mb-6 border border-zinc-200 bg-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">
                Участники команды
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Добавляйте участников, меняйте роли и удаляйте людей из команды.
              </p>
            </div>
            <Link
              href={`/teams/${team.slug}/members`}
              className="inline-flex items-center justify-center bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-800"
            >
              Управлять участниками
            </Link>
          </div>
        </section>

        <TeamSettingsForm team={team} />
      </div>
    </main>
  );
}
