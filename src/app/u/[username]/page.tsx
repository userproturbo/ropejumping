/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import Link from "next/link";
import { notFound } from "next/navigation";

import { ObjectVisibility, type BadgeCategory } from "@/generated/prisma/enums";
import {
  getBadgeCategoryLabel,
  getObjectTypeLabel,
  getTeamRoleLabel,
} from "@/lib/display";
import { summarizeParticipationHistory } from "@/server/events/participation-history";
import { api } from "@/trpc/server";

import { formatEventDateRange } from "../../events/_components/date-format";

type PublicProfilePageProps = {
  params: Promise<{
    username: string;
  }>;
};

type PublicBadge = {
  id: string;
  awardedAt: Date;
  badge: {
    name: string;
    description: string | null;
    category: BadgeCategory;
    iconUrl: string | null;
  };
};

type PublicPostPreview = {
  id: string;
  content: string;
  imageUrl: string | null;
  viewsCount: number;
  imageMedia?: {
    alt: string | null;
  } | null;
  createdAt: Date;
  author: {
    name: string | null;
    image: string | null;
    profile: {
      username: string | null;
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
  team?: {
    name: string;
  } | null;
  event?: {
    title: string;
  } | null;
  object?: {
    name: string;
  } | null;
  _count: {
    likes: number;
    comments: number;
  };
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
  const displayName = profile.displayName ?? profile.username ?? username;
  const avatarAlt =
    profile.avatarMedia?.alt ||
    profile.displayName ||
    profile.username ||
    "Аватар пользователя";

  return (
    <main className="min-h-[calc(100vh-4rem)] overflow-hidden bg-[#202020] text-[#e9eddc]">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="relative overflow-hidden border border-[rgba(199,217,136,0.28)] bg-[#10150e]">
          <div className="absolute inset-0 [background-image:linear-gradient(90deg,transparent_0_48%,rgba(199,217,136,0.08)_49%,transparent_51%),linear-gradient(0deg,transparent_0_48%,rgba(199,217,136,0.08)_49%,transparent_51%)] [background-size:46px_46px] opacity-30" />
          <div className="absolute top-0 right-0 h-60 w-60 bg-[radial-gradient(circle,rgba(199,217,136,0.2),transparent_66%)]" />
          <div className="relative grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="grid gap-5 md:grid-cols-[13rem_minmax(0,1fr)]">
              <div className="relative min-h-72 overflow-hidden rounded-[28px_28px_88px_28px] border border-[rgba(199,217,136,0.35)] bg-[#050705]">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt={avatarAlt}
                    className="h-full min-h-72 w-full object-cover contrast-125 grayscale-[18%] saturate-[0.72]"
                  />
                ) : (
                  <div className="flex h-full min-h-72 items-center justify-center bg-[#151a12] text-6xl font-semibold text-[#c7d988]">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(16,21,14,0.72)),repeating-linear-gradient(0deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_7px)]" />
                <div className="absolute right-3 bottom-3 left-3 border border-[rgba(199,217,136,0.3)] bg-[rgba(5,7,5,0.72)] px-3 py-2 text-xs [overflow-wrap:anywhere] text-[#aab497] backdrop-blur">
                  <span className="text-[#c7d988]">Публичный профиль</span>
                  <span className="mx-2 text-[rgba(233,237,220,0.35)]">/</span>@
                  {profile.username}
                </div>
              </div>

              <div className="flex min-w-0 flex-col justify-between gap-6">
                <div>
                  <p className="text-xs font-medium tracking-[0.24em] text-[#aab497] uppercase">
                    Досье участника
                  </p>
                  <h1 className="mt-3 text-4xl leading-tight font-semibold tracking-tight [overflow-wrap:anywhere] text-[#c7d988] sm:text-5xl">
                    {displayName}
                  </h1>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-[#aab497]">
                    <span className="min-w-0 border border-[rgba(199,217,136,0.25)] bg-[rgba(255,255,255,0.04)] px-3 py-1 [overflow-wrap:anywhere]">
                      @{profile.username}
                    </span>
                    {profile.city ? (
                      <span className="min-w-0 border border-[rgba(199,217,136,0.25)] bg-[rgba(255,255,255,0.04)] px-3 py-1 [overflow-wrap:anywhere]">
                        {profile.city}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-5 max-w-2xl text-sm leading-6 whitespace-pre-wrap text-[#d7dcc5]">
                    {profile.bio ?? "Пользователь пока не добавил описание."}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoBlock
                    label="Опыт вне платформы"
                    value={
                      profile.externalExperience ??
                      "Опыт вне платформы пока не указан."
                    }
                  />
                  <InfoBlock
                    label="Подтверждённая сводка"
                    value={`Мероприятий: ${participationSummary.confirmedEventsCount} · Объектов: ${participationSummary.uniqueObjectsCount}`}
                  />
                </div>
              </div>
            </div>

            <aside className="border border-[rgba(17,20,15,0.28)] bg-[#d7dcc5] p-4 text-[#11140f] lg:min-h-full">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase">
                Сигналы профиля
              </p>
              <dl className="mt-4 grid gap-3">
                <ProfileStatCard
                  label="Мероприятий"
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
            </aside>
          </div>
        </section>

        {hasSelfReportedStats ? (
          <DossierPanel className="mt-6" title="Заявленный опыт">
            <p className="text-sm text-[#aab497]">
              Эти данные указаны пользователем самостоятельно и не считаются
              подтверждённой статистикой платформы.
            </p>
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
          </DossierPanel>
        ) : null}

        <DossierPanel className="mt-6" title="Бейджи">
          <p className="text-sm leading-6 text-[#aab497]">
            Бейджи — это отметки опыта и участия, а не рейтинг.
          </p>
          <DossierBadgeList badges={profile.user.badges} />
        </DossierPanel>

        <DossierPanel className="mt-6" title="История участия">
          <p className="text-sm leading-6 text-[#aab497]">
            Подтверждённые мероприятия, в которых участник был отмечен
            организатором.
          </p>

          {participationHistory.length > 10 ? (
            <p className="mt-4 text-sm text-[#aab497]">
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
                    className="border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium tracking-[0.18em] text-[#aab497] uppercase">
                          Мероприятие
                        </p>
                        <Link
                          href={`/events/${event.slug}`}
                          className="mt-1 inline-flex text-base font-semibold text-[#e9eddc] hover:text-[#c7d988] hover:underline"
                        >
                          {event.title}
                        </Link>
                        <p className="mt-1 text-sm text-[#aab497]">
                          {formatEventDateRange(event.startsAt, event.endsAt)}
                        </p>
                      </div>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm text-[#d7dcc5] sm:grid-cols-2">
                      <div>
                        <dt className="font-medium text-[#c7d988]">Команда</dt>
                        <dd className="mt-1">
                          <Link
                            href={`/teams/${event.team.slug}`}
                            className="hover:text-[#c7d988] hover:underline"
                          >
                            {event.team.name}
                          </Link>
                        </dd>
                      </div>
                      {publicObject ? (
                        <div>
                          <dt className="font-medium text-[#c7d988]">Объект</dt>
                          <dd className="mt-1">
                            <Link
                              href={`/objects/${publicObject.slug}`}
                              className="hover:text-[#c7d988] hover:underline"
                            >
                              {publicObject.name}
                            </Link>
                            <span className="text-[#aab497]">
                              {" "}
                              · {getObjectTypeLabel(publicObject.type)}
                            </span>
                          </dd>
                        </div>
                      ) : hasHiddenObject ? (
                        <div>
                          <dt className="font-medium text-[#c7d988]">Объект</dt>
                          <dd className="mt-1">Объект скрыт</dd>
                        </div>
                      ) : null}
                      {publicObject?.heightMeters !== null &&
                      publicObject?.heightMeters !== undefined ? (
                        <div>
                          <dt className="font-medium text-[#c7d988]">Высота</dt>
                          <dd className="mt-1">
                            {publicObject.heightMeters} м
                          </dd>
                        </div>
                      ) : null}
                      {publicObject?.region ? (
                        <div>
                          <dt className="font-medium text-[#c7d988]">Регион</dt>
                          <dd className="mt-1">{publicObject.region}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-5 border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4 text-sm text-[#d7dcc5]">
              Подтверждённых мероприятий пока нет.
            </p>
          )}
        </DossierPanel>

        {profile.user.teamMemberships.length > 0 ? (
          <DossierPanel className="mt-6" title="Команды">
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {profile.user.teamMemberships.map((membership) => (
                <Link
                  key={membership.id}
                  href={`/teams/${membership.team.slug}`}
                  className="block border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4 hover:border-[rgba(199,217,136,0.55)]"
                >
                  <h3 className="font-medium text-[#e9eddc]">
                    {membership.team.name}
                  </h3>
                  <p className="mt-1 text-sm text-[#aab497]">
                    {getTeamRoleLabel(membership.role)}
                  </p>
                </Link>
              ))}
            </div>
          </DossierPanel>
        ) : null}

        <DossierPanel className="mt-6" title="Публикации">
          {profile.user.posts.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {profile.user.posts.map((post) => (
                <DossierPostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[#d7dcc5]">
              Участник пока не публиковал истории, отчёты или заметки.
            </p>
          )}
        </DossierPanel>
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
    <div className="border border-[rgba(17,20,15,0.2)] bg-[rgba(17,20,15,0.06)] p-3">
      <dt className="text-xs font-semibold tracking-[0.16em] text-[#5f6f38] uppercase">
        {label}
      </dt>
      <dd className="mt-2 text-2xl font-semibold text-[#11140f]">{value}</dd>
    </div>
  );
}

function DossierPanel({
  title,
  className = "",
  children,
}: {
  title: string;
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
          профиль
        </span>
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-3">
      <h2 className="text-xs font-medium tracking-[0.18em] text-[#c7d988] uppercase">
        {label}
      </h2>
      <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-[#aab497]">
        {value}
      </p>
    </div>
  );
}

function DossierBadgeList({ badges }: { badges: PublicBadge[] }) {
  if (badges.length === 0) {
    return (
      <div className="mt-5 border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4 text-sm text-[#d7dcc5]">
        <p>Бейджей пока нет.</p>
        <p className="mt-1 text-[#aab497]">
          Бейджи появятся после подтверждённого участия в мероприятиях.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      {badges.map((userBadge) => (
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

function DossierPostCard({ post }: { post: PublicPostPreview }) {
  const profile = post.author.profile;
  const authorDisplayName =
    profile?.displayName ??
    profile?.username ??
    post.author.name ??
    "Участник без имени";
  const avatarUrl = profile?.avatarUrl ?? post.author.image ?? null;
  const imageAlt =
    post.imageMedia?.alt ||
    (post.event
      ? `Изображение к посту о мероприятии «${post.event.title}»`
      : post.object
        ? `Изображение к посту об объекте «${post.object.name}»`
        : post.team
          ? `Изображение к посту команды «${post.team.name}»`
          : "Изображение к посту");

  return (
    <Link
      href={`/posts/${post.id}`}
      className="block border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4 hover:border-[rgba(199,217,136,0.55)]"
    >
      <div className="flex items-start gap-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-10 w-10 border border-[rgba(199,217,136,0.28)] object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center border border-[rgba(199,217,136,0.28)] bg-[#151a12] text-sm font-semibold text-[#c7d988]">
            {authorDisplayName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#e9eddc]">
            {authorDisplayName}
          </p>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-[#aab497]">
            {profile?.username ? <span>@{profile.username}</span> : null}
            <span>{formatShortDate(post.createdAt)}</span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-[#d7dcc5]">
        {getPostPreview(post.content)}
      </p>

      {post.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.imageUrl}
          alt={imageAlt}
          className="mt-4 h-48 w-full border border-[rgba(199,217,136,0.22)] object-cover contrast-110 grayscale-[12%] saturate-[0.78]"
        />
      ) : null}

      {post.team || post.event || post.object ? (
        <div className="mt-4 flex flex-wrap gap-2 text-sm text-[#aab497]">
          {post.team ? (
            <span className="border border-[rgba(199,217,136,0.22)] px-2 py-1">
              Команда: {post.team.name}
            </span>
          ) : null}
          {post.event ? (
            <span className="border border-[rgba(199,217,136,0.22)] px-2 py-1">
              Мероприятие: {post.event.title}
            </span>
          ) : null}
          {post.object ? (
            <span className="border border-[rgba(199,217,136,0.22)] px-2 py-1">
              Объект: {post.object.name}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-4 border-t border-[rgba(199,217,136,0.18)] pt-3 text-xs text-[#aab497]">
        <span>{post.viewsCount} просмотров</span>
        <span>{post._count.likes} лайков</span>
        <span>{post._count.comments} комментариев</span>
      </div>
    </Link>
  );
}

const getPostPreview = (content: string) => {
  const normalizedContent = content.trim();

  return normalizedContent.length > 240
    ? `${normalizedContent.slice(0, 240)}...`
    : normalizedContent;
};

const formatShortDate = (date: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
