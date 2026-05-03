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
          <Link
            href={`/teams/${team.slug}/members`}
            className="mt-4 inline-flex text-sm font-medium text-zinc-950 hover:text-zinc-600"
          >
            Участники команды
          </Link>
        </div>

        <TeamSettingsForm team={team} />
      </div>
    </main>
  );
}
