import { notFound } from "next/navigation";

import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { TeamMembersManagement } from "./team-members-management";

type TeamMembersPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function TeamMembersPage({ params }: TeamMembersPageProps) {
  const { slug } = await params;
  await requireCurrentUser(`/teams/${slug}/members`);

  const team = await api.team.getForMembersManagement(slug).catch(() => null);

  if (!team) {
    notFound();
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Участники команды
          </h1>
          <p className="mt-2 text-sm text-zinc-600">{team.name}</p>
        </div>

        <TeamMembersManagement team={team} />
      </div>
    </main>
  );
}
