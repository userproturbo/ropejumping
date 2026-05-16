import Link from "next/link";

import {
  getObjectTypeLabel,
  getTeamStatusLabel,
} from "@/lib/display";
import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

export default async function ProfileFollowsPage() {
  await requireCurrentUser("/profile/follows");

  const follows = await api.follow.getMyFollows();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Мои подписки
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Команды и объекты, за которыми вы следите.
            </p>
          </div>
          <Link
            href="/profile"
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
          >
            В профиль
          </Link>
        </div>

        <section className="border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Команды</h2>
          {follows.teams.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {follows.teams.map((follow) => (
                <Link
                  key={follow.id}
                  href={`/teams/${follow.team.slug}`}
                  className="block border border-zinc-200 p-4 hover:border-zinc-950"
                >
                  <div className="flex gap-4">
                    {follow.team.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={follow.team.logoUrl}
                        alt={
                          follow.team.logoMedia?.alt ??
                          `Логотип команды ${follow.team.name}`
                        }
                        className="h-14 w-14 shrink-0 border border-zinc-200 object-cover"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <h3 className="truncate font-medium text-zinc-950">
                        {follow.team.name}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        /teams/{follow.team.slug}
                      </p>
                      <p className="mt-2 text-sm text-zinc-600">
                        {getTeamStatusLabel(follow.team.status)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">
              Вы пока не подписаны на команды.
            </p>
          )}
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Объекты</h2>
          {follows.objects.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {follows.objects.map((follow) => (
                <Link
                  key={follow.id}
                  href={`/objects/${follow.object.slug}`}
                  className="block border border-zinc-200 p-4 hover:border-zinc-950"
                >
                  <div className="flex gap-4">
                    {follow.object.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={follow.object.coverImageUrl}
                        alt={
                          follow.object.coverMedia?.alt ??
                          `Фото объекта «${follow.object.name}»`
                        }
                        className="h-14 w-14 shrink-0 border border-zinc-200 object-cover"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <h3 className="truncate font-medium text-zinc-950">
                        {follow.object.name}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-sm text-zinc-600">
                        <span>{getObjectTypeLabel(follow.object.type)}</span>
                        {follow.object.region ? (
                          <span>{follow.object.region}</span>
                        ) : null}
                        {follow.object.heightMeters ? (
                          <span>{follow.object.heightMeters} м</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">
              Вы пока не подписаны на объекты.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
