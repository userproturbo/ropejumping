import Link from "next/link";

import { getBadgeCategoryLabel } from "@/lib/display";
import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { formatEventDateRange } from "../events/_components/date-format";
import { BadgeRecalculateButton } from "./badge-recalculate-button";

export default async function ProfilePage() {
  await requireCurrentUser("/profile");

  const profile = await api.profile.getMine();
  const participations = await api.profile.getMyParticipations();
  const badges = await api.badge.getMine();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Мой профиль
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Основная информация, которая отображается в публичном профиле.
            </p>
          </div>
          <Link
            href="/profile/edit"
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
          >
            {profile ? "Редактировать" : "Создать"}
          </Link>
        </div>

        {profile ? (
          <section className="space-y-6 border border-zinc-200 bg-white p-6">
            <div className="flex items-start gap-4">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="h-20 w-20 border border-zinc-200 object-cover"
                />
              ) : null}
              <div>
                <h2 className="text-2xl font-semibold text-zinc-950">
                  {profile.displayName ?? profile.username ?? "Профиль без имени"}
                </h2>
                {profile.username ? (
                  <Link
                    href={`/u/${profile.username}`}
                    className="text-sm text-zinc-500 hover:text-zinc-950"
                  >
                    @{profile.username}
                  </Link>
                ) : (
                  <p className="text-sm text-zinc-500">
                    Добавьте имя пользователя, чтобы открыть публичную ссылку на профиль.
                  </p>
                )}
              </div>
            </div>

            <dl className="grid gap-5 text-sm">
              <div>
                <dt className="font-medium text-zinc-950">Город</dt>
                <dd className="mt-1 whitespace-pre-wrap text-zinc-600">
                  {profile.city ?? "Не указано"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-950">О себе</dt>
                <dd className="mt-1 whitespace-pre-wrap text-zinc-600">
                  {profile.bio ?? "Не указано"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-950">
                  Опыт вне платформы
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-zinc-600">
                  {profile.externalExperience ?? "Не указано"}
                </dd>
              </div>
            </dl>
          </section>
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Профиль еще не создан
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">
              Создайте профиль с именем пользователя, отображаемым именем,
              городом, описанием и опытом вне платформы.
            </p>
            <Link
              href="/profile/edit"
              className="mt-5 inline-flex border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
            >
              Создать профиль
            </Link>
          </section>
        )}

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-zinc-950">Бейджи</h2>
            <BadgeRecalculateButton />
          </div>
          {badges.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {badges.map((userBadge) => (
                <div key={userBadge.id} className="border border-zinc-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-zinc-950">
                        {userBadge.badge.name}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        {getBadgeCategoryLabel(userBadge.badge.category)}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-500">
                      {formatBadgeDate(userBadge.awardedAt)}
                    </span>
                  </div>
                  {userBadge.badge.description ? (
                    <p className="mt-3 text-sm leading-6 text-zinc-600">
                      {userBadge.badge.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">
              Пока нет бейджей. Они появятся после подтверждённых участий.
            </p>
          )}
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">
            История участия
          </h2>
          {participations.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {participations.map((participation) => (
                <Link
                  key={participation.id}
                  href={`/events/${participation.event.slug}`}
                  className="block border border-zinc-200 p-4 hover:border-zinc-950"
                >
                  <h3 className="text-base font-semibold text-zinc-950">
                    {participation.event.title}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    {formatEventDateRange(
                      participation.event.startsAt,
                      participation.event.endsAt,
                    )}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    Команда: {participation.event.team.name}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">
              Пока нет подтверждённых участий.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

const formatBadgeDate = (date: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
  }).format(date);
