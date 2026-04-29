import Link from "next/link";

import { TeamStatus } from "@/generated/prisma/enums";
import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { PostCreateForm } from "./post-create-form";

const manageableRoles = ["OWNER", "ADMIN", "ORGANIZER"];
const publicTeamStatuses: TeamStatus[] = [
  TeamStatus.REGULAR,
  TeamStatus.VERIFIED,
];

export default async function NewPostPage() {
  await requireCurrentUser("/feed/new");

  const profile = await api.profile.getMine();
  const teams = await api.team.getMine();
  const manageableTeams = teams.filter(
    (team) =>
      manageableRoles.includes(team.currentUserRole) &&
      publicTeamStatuses.includes(team.status),
  );
  const events = await api.event.listPublic();
  const objects = await api.object.listPublic();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Новый пост
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Опубликуйте короткую запись в общей ленте.
          </p>
        </div>

        {profile ? (
          <PostCreateForm
            events={events}
            objects={objects}
            teams={manageableTeams}
          />
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Заполните профиль
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Перед публикацией поста заполните профиль.
            </p>
            <Link
              href="/profile/edit"
              className="mt-5 inline-flex bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-800"
            >
              Заполнить профиль
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
