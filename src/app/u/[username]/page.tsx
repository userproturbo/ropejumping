/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import Link from "next/link";
import { notFound } from "next/navigation";

import { BadgeList } from "@/app/_components/badge-list";
import { EntityPostPreviewCard } from "@/app/posts/_components/entity-post-preview-card";
import { ObjectVisibility } from "@/generated/prisma/enums";
import { getObjectTypeLabel, getTeamRoleLabel } from "@/lib/display";
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
  const visibleParticipationHistory = participationHistory.slice(0, 10);
  const participationSummary =
    summarizeParticipationHistory(participationHistory);
  const displayName = profile.displayName ?? profile.username;
  const avatarAlt =
    profile.avatarMedia?.alt ||
    profile.displayName ||
    profile.username ||
    "Аватар пользователя";

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <section className="space-y-6 border border-zinc-200 bg-white p-6">
          <div className="flex flex-wrap items-start gap-5">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={avatarAlt}
                className="h-24 w-24 border border-zinc-200 object-cover"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
                {displayName}
              </h1>
              <p className="mt-1 text-sm text-zinc-500">@{profile.username}</p>
              {profile.city ? (
                <p className="mt-3 text-sm text-zinc-600">{profile.city}</p>
              ) : null}
              <p className="mt-4 max-w-2xl text-sm leading-6 whitespace-pre-wrap text-zinc-600">
                {profile.bio ?? "Пользователь пока не добавил описание."}
              </p>
            </div>
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <ProfileStatCard
              label="Подтверждённых мероприятий"
              value={participationSummary.confirmedEventsCount}
            />
            <ProfileStatCard
              label="Объектов"
              value={participationSummary.uniqueObjectsCount}
            />
            <ProfileStatCard
              label="Макс. высота"
              value={
                participationSummary.maxHeightMeters !== null
                  ? `${participationSummary.maxHeightMeters} м`
                  : "нет данных"
              }
            />
            <ProfileStatCard
              label="Бейджей"
              value={profile.user.badges.length}
            />
          </dl>

          <div>
            <h2 className="text-sm font-medium text-zinc-950">
              Опыт вне платформы
            </h2>
            <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
              {profile.externalExperience ??
                "Опыт вне платформы пока не указан."}
            </p>
          </div>
        </section>

        {hasSelfReportedStats ? (
          <section className="mt-6 border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Заявленный опыт
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Эти данные указаны пользователем самостоятельно и не считаются
              подтверждённой статистикой платформы.
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
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Бейджи — это отметки опыта и участия, а не рейтинг.
          </p>
          <BadgeList
            badges={profile.user.badges}
            emptyText="Бейджей пока нет."
            emptyHint="Бейджи появятся после подтверждённого участия в мероприятиях."
          />
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

          {participationHistory.length > 10 ? (
            <p className="mt-4 text-sm text-zinc-500">
              Показаны последние 10 подтверждённых мероприятий.
            </p>
          ) : null}

          {visibleParticipationHistory.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {visibleParticipationHistory.map((participation) => {
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

        {profile.user.teamMemberships.length > 0 ? (
          <section className="mt-6 border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">Команды</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {profile.user.teamMemberships.map((membership) => (
                <Link
                  key={membership.id}
                  href={`/teams/${membership.team.slug}`}
                  className="block border border-zinc-200 p-4 hover:border-zinc-950"
                >
                  <h3 className="font-medium text-zinc-950">
                    {membership.team.name}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    {getTeamRoleLabel(membership.role)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Публикации</h2>
          {profile.user.posts.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {profile.user.posts.map((post) => (
                <EntityPostPreviewCard
                  key={post.id}
                  post={post}
                  isPinned={false}
                />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Участник пока не публиковал истории, отчёты или заметки.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

function ProfileStatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="border border-zinc-200 p-3">
      <dt className="font-medium text-zinc-950">{label}</dt>
      <dd className="mt-1 text-zinc-600">{value}</dd>
    </div>
  );
}
