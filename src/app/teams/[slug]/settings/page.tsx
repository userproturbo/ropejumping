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
            Team settings
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Edit basic team information. Slug changes are not implemented yet.
          </p>
        </div>

        <TeamSettingsForm team={team} />
      </div>
    </main>
  );
}
