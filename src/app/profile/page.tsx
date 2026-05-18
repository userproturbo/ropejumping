/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import Link from "next/link";

import { getBadgeCategoryLabel } from "@/lib/display";
import { requireCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { summarizeParticipationHistory } from "@/server/events/participation-history";
import { isModeratorUser } from "@/server/moderation/permissions";
import { api } from "@/trpc/server";

import { formatEventDateRange } from "../events/_components/date-format";
import { BadgeRecalculateButton } from "./badge-recalculate-button";

export default async function ProfilePage() {
  const user = await requireCurrentUser("/profile");

  const [
    profile,
    participations,
    badges,
    eventChats,
    teamChats,
    unreadNotifications,
    postsCount,
    teamFollowsCount,
    objectFollowsCount,
    applicationsCount,
    teamMembershipsCount,
  ] = await Promise.all([
    api.profile.getMine(),
    api.profile.getMyParticipations(),
    api.badge.getMine(),
    api.eventChat.getMyChats(),
    api.teamChat.getMyChats(),
    api.notification.getUnreadCount(),
    db.post.count({
      where: {
        authorId: user.id,
        hiddenAt: null,
      },
    }),
    db.teamFollow.count({
      where: {
        userId: user.id,
      },
    }),
    db.objectFollow.count({
      where: {
        userId: user.id,
      },
    }),
    db.eventApplication.count({
      where: {
        userId: user.id,
      },
    }),
    db.teamMember.count({
      where: {
        userId: user.id,
      },
    }),
  ]);
  const totalUnread = [...eventChats, ...teamChats].reduce(
    (total, chat) => total + chat.unreadCount,
    0,
  );
  const followsCount = teamFollowsCount + objectFollowsCount;
  const participationSummary = summarizeParticipationHistory(participations);
  const canModerate = isModeratorUser(user);
  const hasSelfReportedStats =
    profile !== null &&
    (profile.selfReportedJumpCount !== null ||
      profile.selfReportedMaxHeightMeters !== null ||
      Boolean(profile.selfReportedExperience));

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Личный кабинет
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Профиль, чаты, публикации и основные разделы платформы.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/profile/edit"
              className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
            >
              {profile ? "Редактировать профиль" : "Создать профиль"}
            </Link>
            {profile?.username ? (
              <Link
                href={`/u/${profile.username}`}
                className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
              >
                Открыть публичный профиль
              </Link>
            ) : null}
          </div>
        </div>

        {profile ? (
          <section className="space-y-6 border border-zinc-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
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
                  <h2 className="text-2xl font-semibold text-zinc-950">
                    {profile.displayName ??
                      profile.username ??
                      "Профиль без имени"}
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
                      Заполните username, чтобы появился публичный профиль.
                    </p>
                  )}
                  {profile.city ? (
                    <p className="mt-2 text-sm text-zinc-600">{profile.city}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-sm">
                {profile.selfReportedJumpCount !== null ? (
                  <span className="border border-zinc-200 px-3 py-2 text-zinc-700">
                    Прыжков: {profile.selfReportedJumpCount}
                  </span>
                ) : null}
                {profile.selfReportedMaxHeightMeters !== null ? (
                  <span className="border border-zinc-200 px-3 py-2 text-zinc-700">
                    Макс. высота: {profile.selfReportedMaxHeightMeters} м
                  </span>
                ) : null}
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

        {profile ? (
          <section className="mt-6 border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Заявленный опыт
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Данные указаны пользователем и не подтверждаются автоматически.
            </p>
            {hasSelfReportedStats ? (
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
            ) : (
              <p className="mt-4 text-sm text-zinc-600">
                Вы можете добавить свой опыт в{" "}
                <Link
                  href="/profile/edit"
                  className="text-zinc-950 underline underline-offset-4"
                >
                  настройках профиля
                </Link>
                .
              </p>
            )}
          </section>
        ) : null}

        <section className="mt-6">
          <h2 className="text-xl font-semibold text-zinc-950">
            Быстрые действия
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DashboardCard
              href="/profile/chats"
              title="Мои чаты"
              description="Открыть чаты мероприятий и команд."
              meta={`Непрочитанных: ${totalUnread}`}
            />
            <DashboardCard
              href="/profile/follows"
              title="Мои подписки"
              description="Команды и объекты, на которые вы подписаны."
              meta={`Подписок: ${followsCount}`}
            />
            <DashboardCard
              href="/posts/my"
              title="Мои публикации"
              description="Посты, которые вы создали."
              meta={`Публикаций: ${postsCount}`}
            />
            <DashboardCard
              href="/notifications"
              title="Уведомления"
              description="Заявки, ответы, подписки и события."
              meta={`Новых: ${unreadNotifications.count}`}
            />
            <DashboardCard
              href="/events/my"
              title="Мои мероприятия"
              description="Мероприятия, которые вы создали или в которых участвуете."
              meta={`Заявок: ${applicationsCount}`}
            />
            <DashboardCard
              href="/teams"
              title="Мои команды"
              description="Команды сообщества и ваши командные страницы."
              meta={`Команд: ${teamMembershipsCount}`}
            />
            {canModerate ? (
              <DashboardCard
                href="/moderation"
                title="Модерация"
                description="Жалобы и действия модераторов."
              />
            ) : null}
          </div>
        </section>

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
            Подтверждённые участия
          </h2>
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
              <dt className="font-medium text-zinc-950">Объектов в истории</dt>
              <dd className="mt-1 text-zinc-600">
                {participationSummary.uniqueObjectsCount}
              </dd>
            </div>
            <div className="border border-zinc-200 p-3">
              <dt className="font-medium text-zinc-950">
                Максимальная подтверждённая высота
              </dt>
              <dd className="mt-1 text-zinc-600">
                {participationSummary.maxHeightMeters !== null
                  ? `${participationSummary.maxHeightMeters} м`
                  : "пока нет данных"}
              </dd>
            </div>
          </dl>
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

function DashboardCard({
  href,
  title,
  description,
  meta,
}: {
  href: string;
  title: string;
  description: string;
  meta?: string;
}) {
  return (
    <Link
      href={href}
      className="block border border-zinc-200 bg-white p-5 hover:border-zinc-950"
    >
      <h3 className="text-base font-semibold text-zinc-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
      {meta ? <p className="mt-3 text-xs text-zinc-500">{meta}</p> : null}
    </Link>
  );
}

const formatBadgeDate = (date: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
  }).format(date);
