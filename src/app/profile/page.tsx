/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import Link from "next/link";

import type { BadgeCategory } from "@/generated/prisma/enums";
import { getBadgeCategoryLabel } from "@/lib/display";
import { requireCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { summarizeParticipationHistory } from "@/server/events/participation-history";
import { isModeratorUser } from "@/server/moderation/permissions";
import { api } from "@/trpc/server";

import { formatEventDateRange } from "../events/_components/date-format";
import { BadgeRecalculateButton } from "./badge-recalculate-button";

type DashboardBadge = {
  id: string;
  awardedAt: Date;
  badge: {
    name: string;
    description: string | null;
    category: BadgeCategory;
    iconUrl: string | null;
  };
};

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
  const missingProfileFields = profile
    ? [
        profile.username ? null : "username",
        profile.displayName ? null : "отображаемое имя",
        profile.city ? null : "город",
        profile.avatarUrl ? null : "аватар",
        profile.bio ? null : "описание",
        hasSelfReportedStats || profile.externalExperience ? null : "опыт",
      ].filter((item): item is string => item !== null)
    : [];
  const displayName =
    profile?.displayName ??
    profile?.username ??
    user.name ??
    "Профиль без имени";
  const avatarAlt =
    profile?.avatarMedia?.alt ||
    profile?.displayName ||
    profile?.username ||
    user.name ||
    "Аватар пользователя";

  return (
    <main className="min-h-[calc(100vh-4rem)] overflow-hidden bg-[#202020] text-[#e9eddc]">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="relative overflow-hidden border border-[rgba(199,217,136,0.28)] bg-[#10150e]">
          <div className="absolute inset-0 [background-image:linear-gradient(90deg,transparent_0_48%,rgba(199,217,136,0.08)_49%,transparent_51%),linear-gradient(0deg,transparent_0_48%,rgba(199,217,136,0.08)_49%,transparent_51%)] [background-size:46px_46px] opacity-25" />
          <div className="absolute top-0 right-0 h-64 w-64 bg-[radial-gradient(circle,rgba(199,217,136,0.2),transparent_66%)]" />
          <div className="relative grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <div className="grid gap-5 md:grid-cols-[12rem_minmax(0,1fr)]">
              <div className="relative min-h-64 overflow-hidden rounded-[28px_28px_76px_28px] border border-[rgba(199,217,136,0.35)] bg-[#050705]">
                {profile?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt={avatarAlt}
                    className="h-full min-h-64 w-full object-cover contrast-125 grayscale-[18%] saturate-[0.72]"
                  />
                ) : (
                  <div className="flex h-full min-h-64 items-center justify-center bg-[#151a12] text-6xl font-semibold text-[#c7d988]">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(16,21,14,0.72)),repeating-linear-gradient(0deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_7px)]" />
                <div className="absolute right-3 bottom-3 left-3 border border-[rgba(199,217,136,0.3)] bg-[rgba(5,7,5,0.72)] px-3 py-2 text-xs [overflow-wrap:anywhere] text-[#aab497] backdrop-blur">
                  <span className="text-[#c7d988]">Личный штаб</span>
                  <span className="mx-2 text-[rgba(233,237,220,0.35)]">/</span>
                  {profile?.username
                    ? `@${profile.username}`
                    : "профиль не опубликован"}
                </div>
              </div>

              <div className="flex min-w-0 flex-col justify-between gap-6">
                <div>
                  <p className="text-xs font-medium tracking-[0.24em] text-[#aab497] uppercase">
                    Панель управления профилем
                  </p>
                  <h1 className="mt-3 text-4xl leading-tight font-semibold tracking-tight [overflow-wrap:anywhere] text-[#c7d988] sm:text-5xl">
                    {displayName}
                  </h1>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-[#aab497]">
                    {profile?.username ? (
                      <span className="min-w-0 border border-[rgba(199,217,136,0.25)] bg-[rgba(255,255,255,0.04)] px-3 py-1 [overflow-wrap:anywhere]">
                        @{profile.username}
                      </span>
                    ) : (
                      <span className="min-w-0 border border-[rgba(199,217,136,0.25)] bg-[rgba(255,255,255,0.04)] px-3 py-1">
                        username не задан
                      </span>
                    )}
                    {profile?.city ? (
                      <span className="min-w-0 border border-[rgba(199,217,136,0.25)] bg-[rgba(255,255,255,0.04)] px-3 py-1 [overflow-wrap:anywhere]">
                        {profile.city}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-5 max-w-2xl text-sm leading-6 whitespace-pre-wrap text-[#d7dcc5]">
                    {profile?.bio ??
                      "Здесь собраны профиль, чаты, публикации и основные разделы платформы."}
                  </p>
                </div>

                <div className="grid gap-3">
                  <InfoBlock
                    label="История"
                    lines={[
                      `Мероприятий: ${participationSummary.confirmedEventsCount}`,
                      `Объектов: ${participationSummary.uniqueObjectsCount}`,
                    ]}
                  />
                  <InfoBlock
                    label="Сигналы"
                    lines={[
                      `Чаты: ${totalUnread}`,
                      `Уведомления: ${unreadNotifications.count}`,
                    ]}
                  />
                </div>
              </div>
            </div>

            <aside className="border border-[rgba(17,20,15,0.28)] bg-[#d7dcc5] p-4 text-[#11140f]">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase">
                Быстрый доступ
              </p>
              <div className="mt-4 grid gap-3">
                {profile?.username ? (
                  <Link
                    href={`/u/${profile.username}`}
                    className="border border-[rgba(17,20,15,0.22)] bg-[rgba(17,20,15,0.06)] px-4 py-3 text-sm font-medium hover:border-[#11140f]"
                  >
                    Открыть публичный профиль
                  </Link>
                ) : (
                  <div className="border border-[rgba(17,20,15,0.22)] bg-[rgba(17,20,15,0.06)] px-4 py-3 text-sm">
                    Заполните username, чтобы появился публичный профиль.
                  </div>
                )}
                <Link
                  href="/profile/chats"
                  className="border border-[rgba(17,20,15,0.22)] bg-[rgba(17,20,15,0.06)] px-4 py-3 text-sm font-medium hover:border-[#11140f]"
                >
                  Чаты: {totalUnread} непрочитанных
                </Link>
                <Link
                  href="/notifications"
                  className="border border-[rgba(17,20,15,0.22)] bg-[rgba(17,20,15,0.06)] px-4 py-3 text-sm font-medium hover:border-[#11140f]"
                >
                  Уведомления: {unreadNotifications.count}
                </Link>
              </div>
            </aside>
          </div>
        </section>

        {profile ? (
          <DossierPanel className="mt-6" marker="статус" title="Статус профиля">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4">
                <h2 className="text-base font-semibold text-[#e9eddc]">
                  Заполните профиль
                </h2>
                {missingProfileFields.length > 0 ? (
                  <>
                    <p className="mt-2 text-sm leading-6 text-[#aab497]">
                      Осталось добавить: {missingProfileFields.join(", ")}.
                    </p>
                    <Link
                      href="/profile/edit"
                      className="mt-4 inline-flex border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
                    >
                      Перейти к редактированию
                    </Link>
                  </>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-[#aab497]">
                    Профиль выглядит заполненным. Публичное досье готово к
                    просмотру участниками.
                  </p>
                )}
              </div>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <DashboardStat
                  label="Мероприятий"
                  value={participationSummary.confirmedEventsCount}
                />
                <DashboardStat
                  label="Объектов"
                  value={participationSummary.uniqueObjectsCount}
                />
                <DashboardStat
                  label="Макс. высота"
                  value={
                    participationSummary.maxHeightMeters !== null
                      ? `${participationSummary.maxHeightMeters} м`
                      : "нет данных"
                  }
                />
                <DashboardStat label="Бейджей" value={badges.length} />
              </dl>
            </div>
          </DossierPanel>
        ) : (
          <DossierPanel
            className="mt-6"
            marker="старт"
            title="Профиль еще не создан"
          >
            <p className="max-w-xl text-sm leading-6 text-[#aab497]">
              Создайте профиль с именем пользователя, отображаемым именем,
              городом, описанием и опытом вне платформы.
            </p>
            <Link
              href="/profile/edit"
              className="mt-5 inline-flex border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
            >
              Создать профиль
            </Link>
          </DossierPanel>
        )}

        {profile ? (
          <DossierPanel className="mt-6" marker="опыт" title="Заявленный опыт">
            <p className="text-sm text-[#aab497]">
              Эти данные вы указываете самостоятельно. Они не считаются
              подтверждённой историей платформы.
            </p>
            {hasSelfReportedStats ? (
              <div className="mt-5 grid gap-3 text-sm text-[#d7dcc5]">
                {profile.selfReportedJumpCount !== null ? (
                  <p>
                    <span className="font-medium text-[#c7d988]">Прыжков:</span>{" "}
                    {profile.selfReportedJumpCount}
                  </p>
                ) : null}
                {profile.selfReportedMaxHeightMeters !== null ? (
                  <p>
                    <span className="font-medium text-[#c7d988]">
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
              <p className="mt-4 text-sm text-[#d7dcc5]">
                Вы можете добавить свой опыт в{" "}
                <Link
                  href="/profile/edit"
                  className="text-[#c7d988] underline underline-offset-4"
                >
                  настройках профиля
                </Link>
                .
              </p>
            )}
          </DossierPanel>
        ) : null}

        <DossierPanel
          className="mt-6"
          marker="действия"
          title="Быстрые действия"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        </DossierPanel>

        <DossierPanel className="mt-6" marker="бейджи" title="Мои бейджи">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <p className="max-w-xl text-sm leading-6 text-[#aab497]">
              Бейджи — это отметки опыта и участия, а не рейтинг.
            </p>
            <BadgeRecalculateButton />
          </div>
          <DossierBadgeList badges={badges} />
        </DossierPanel>

        <DossierPanel
          className="mt-6"
          marker="история"
          title="Подтверждённые участия"
        >
          {participations.length > 0 ? (
            <div className="grid gap-4">
              {participations.map((participation) => (
                <Link
                  key={participation.id}
                  href={`/events/${participation.event.slug}`}
                  className="block border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4 hover:border-[rgba(199,217,136,0.55)]"
                >
                  <p className="text-xs font-medium tracking-[0.18em] text-[#aab497] uppercase">
                    Мероприятие
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-[#e9eddc]">
                    {participation.event.title}
                  </h3>
                  <p className="mt-1 text-sm text-[#aab497]">
                    {formatEventDateRange(
                      participation.event.startsAt,
                      participation.event.endsAt,
                    )}
                  </p>
                  <p className="mt-3 text-sm text-[#d7dcc5]">
                    <span className="font-medium text-[#c7d988]">Команда:</span>{" "}
                    {participation.event.team.name}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4 text-sm text-[#d7dcc5]">
              Пока нет подтверждённых участий.
            </p>
          )}
        </DossierPanel>
      </div>
    </main>
  );
}

function DossierPanel({
  title,
  marker,
  className = "",
  children,
}: {
  title: string;
  marker: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`${className} border border-[rgba(199,217,136,0.25)] bg-[#10150e] p-4 sm:p-6`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(199,217,136,0.18)] pb-4">
        <h2 className="text-xl font-semibold text-[#e9eddc]">{title}</h2>
        <span className="text-xs tracking-[0.2em] text-[#aab497] uppercase">
          {marker}
        </span>
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}

function InfoBlock({ label, lines }: { label: string; lines: string[] }) {
  return (
    <div className="border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-3">
      <h2 className="text-xs font-medium tracking-[0.18em] text-[#c7d988] uppercase">
        {label}
      </h2>
      <div className="mt-2 grid gap-1 text-sm leading-6 text-[#aab497]">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
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
      className="block border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-5 hover:border-[rgba(199,217,136,0.55)]"
    >
      <h3 className="text-base font-semibold text-[#e9eddc]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#aab497]">{description}</p>
      {meta ? <p className="mt-3 text-xs text-[#c7d988]">{meta}</p> : null}
    </Link>
  );
}

function DashboardStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-3">
      <dt className="text-xs font-semibold tracking-[0.16em] text-[#aab497] uppercase">
        {label}
      </dt>
      <dd className="mt-2 text-2xl font-semibold text-[#c7d988]">{value}</dd>
    </div>
  );
}

function DossierBadgeList({ badges }: { badges: DashboardBadge[] }) {
  const visibleBadges = badges.slice(0, 6);

  if (visibleBadges.length === 0) {
    return (
      <div className="mt-5 border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4 text-sm text-[#d7dcc5]">
        <p>Бейджей пока нет.</p>
        <p className="mt-1 text-[#aab497]">
          Они появятся после подтверждённого участия в мероприятиях.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      {visibleBadges.map((userBadge) => (
        <article
          key={userBadge.id}
          className="border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4"
        >
          <div className="flex items-start gap-3">
            {userBadge.badge.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userBadge.badge.iconUrl}
                alt=""
                className="h-10 w-10 border border-[rgba(199,217,136,0.3)] object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center border border-[rgba(199,217,136,0.3)] bg-[#151a12] text-sm font-semibold text-[#c7d988]">
                {userBadge.badge.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium text-[#e9eddc]">
                    {userBadge.badge.name}
                  </h3>
                  <p className="mt-1 text-xs text-[#aab497]">
                    {getBadgeCategoryLabel(userBadge.badge.category)}
                  </p>
                </div>
                <time
                  dateTime={userBadge.awardedAt.toISOString()}
                  className="text-xs text-[#aab497]"
                >
                  {formatShortDate(userBadge.awardedAt)}
                </time>
              </div>
              {userBadge.badge.description ? (
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#d7dcc5]">
                  {userBadge.badge.description}
                </p>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

const formatShortDate = (date: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
