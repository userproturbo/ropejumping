/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import Link from "next/link";
import { notFound } from "next/navigation";

import { ObjectVisibility } from "@/generated/prisma/enums";
import { getBadgeCategoryLabel, getObjectTypeLabel } from "@/lib/display";
import { summarizeParticipationHistory } from "@/server/events/participation-history";
import { api } from "@/trpc/server";

import { formatEventDateRange } from "../../events/_components/date-format";

type PublicProfilePageProps = {
  params: Promise<{
    username: string;
  }>;
};

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { username } = await params;
  const profile = await api.profile.getByUsername(username);

  if (!profile) {
    notFound();
  }

  const hasSelfReportedStats =
    profile.selfReportedJumpCount !== null ||
    profile.selfReportedMaxHeightMeters !== null ||
    Boolean(profile.selfReportedExperience);
  const participationHistory = profile.user.eventParticipations;
  const participationSummary =
    summarizeParticipationHistory(participationHistory);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <section className="space-y-6 border border-zinc-200 bg-white p-6">
          <div className="flex items-start gap-4">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={
                  profile.avatarMedia?.alt ||
                  profile.displayName ||
                  profile.username ||
                  "Аватар пользователя"
                }
                className="h-20 w-20 border border-zinc-200 object-cover"
              />
            ) : null}
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
                {profile.displayName ?? profile.username}
              </h1>
              <p className="mt-1 text-sm text-zinc-500">@{profile.username}</p>
              {profile.city ? (
                <p className="mt-3 text-sm text-zinc-600">{profile.city}</p>
              ) : null}
            </div>
          </div>

          {profile.bio ? (
            <div>
              <h2 className="text-sm font-medium text-zinc-950">О себе</h2>
              <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
                {profile.bio}
              </p>
            </div>
          ) : null}

          {profile.externalExperience ? (
            <div>
              <h2 className="text-sm font-medium text-zinc-950">
                Опыт вне платформы
              </h2>
              <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
                {profile.externalExperience}
              </p>
            </div>
          ) : null}
        </section>

        {hasSelfReportedStats ? (
          <section className="mt-6 border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Заявленный опыт
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Данные указаны пользователем и не подтверждаются автоматически.
            </p>
            <div className="mt-5 grid gap-3 text-sm text-zinc-600">
              {profile.selfReportedJumpCount !== null ? (
                <p>
                  <span className="font-medium text-zinc-950">Прыжков:</span>{" "}
                  {profile.selfReportedJumpCount}
                </p>
              ) : null}
              {profile.selfReportedMaxHeightMeters !== null ? (
                <p>
                  <span className="font-medium text-zinc-950">
                    Максимальная высота:
                  </span>{" "}
                  {profile.selfReportedMaxHeightMeters} м
                </p>
              ) : null}
              {profile.selfReportedExperience ? (
                <p className="leading-6 whitespace-pre-wrap">
                  {profile.selfReportedExperience}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Бейджи</h2>
          {profile.user.badges.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {profile.user.badges.map((userBadge) => (
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
            <p className="mt-2 text-sm text-zinc-600">Пока нет бейджей.</p>
          )}
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">
            История участия
          </h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Подтверждённые мероприятия, в которых участник был отмечен
            организатором.
          </p>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <div className="border border-zinc-200 p-3">
              <dt className="font-medium text-zinc-950">
                Подтверждённых мероприятий
              </dt>
              <dd className="mt-1 text-zinc-600">
                {participationSummary.confirmedEventsCount}
              </dd>
            </div>
            <div className="border border-zinc-200 p-3">
              <dt className="font-medium text-zinc-950">Объектов</dt>
              <dd className="mt-1 text-zinc-600">
                {participationSummary.uniqueObjectsCount}
              </dd>
            </div>
            <div className="border border-zinc-200 p-3">
              <dt className="font-medium text-zinc-950">Максимальная высота</dt>
              <dd className="mt-1 text-zinc-600">
                {participationSummary.maxHeightMeters !== null
                  ? `${participationSummary.maxHeightMeters} м`
                  : "пока нет данных"}
              </dd>
            </div>
          </dl>

          {participationHistory.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {participationHistory.map((participation) => {
                const { event } = participation;
                const publicObject =
                  event.object?.visibility === ObjectVisibility.PUBLIC
                    ? event.object
                    : null;
                const hasHiddenObject = event.objectId && !publicObject;

                return (
                  <article
                    key={participation.id}
                    className="border border-zinc-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                          Мероприятие
                        </p>
                        <Link
                          href={`/events/${event.slug}`}
                          className="mt-1 inline-flex text-base font-semibold text-zinc-950 hover:underline"
                        >
                          {event.title}
                        </Link>
                        <p className="mt-1 text-sm text-zinc-500">
                          {formatEventDateRange(event.startsAt, event.endsAt)}
                        </p>
                      </div>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm text-zinc-600 sm:grid-cols-2">
                      <div>
                        <dt className="font-medium text-zinc-950">Команда</dt>
                        <dd className="mt-1">
                          <Link
                            href={`/teams/${event.team.slug}`}
                            className="hover:text-zinc-950 hover:underline"
                          >
                            {event.team.name}
                          </Link>
                        </dd>
                      </div>
                      {publicObject ? (
                        <div>
                          <dt className="font-medium text-zinc-950">Объект</dt>
                          <dd className="mt-1">
                            <Link
                              href={`/objects/${publicObject.slug}`}
                              className="hover:text-zinc-950 hover:underline"
                            >
                              {publicObject.name}
                            </Link>
                            <span className="text-zinc-500">
                              {" "}
                              · {getObjectTypeLabel(publicObject.type)}
                            </span>
                          </dd>
                        </div>
                      ) : hasHiddenObject ? (
                        <div>
                          <dt className="font-medium text-zinc-950">Объект</dt>
                          <dd className="mt-1">Объект скрыт</dd>
                        </div>
                      ) : null}
                      {publicObject?.heightMeters !== null &&
                      publicObject?.heightMeters !== undefined ? (
                        <div>
                          <dt className="font-medium text-zinc-950">Высота</dt>
                          <dd className="mt-1">
                            {publicObject.heightMeters} м
                          </dd>
                        </div>
                      ) : null}
                      {publicObject?.region ? (
                        <div>
                          <dt className="font-medium text-zinc-950">Регион</dt>
                          <dd className="mt-1">{publicObject.region}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">
              Подтверждённых мероприятий пока нет.
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
