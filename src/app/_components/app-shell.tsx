import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { TeamRole } from "@/generated/prisma/enums";
import { signOut } from "@/server/auth";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { isModeratorUser } from "@/server/moderation/permissions";
import { api } from "@/trpc/server";

import { AnimatedLogo } from "./animated-logo";
import { RadioProvider } from "./radio-provider";
import {
  SiteMobileMenu,
  SiteNavLink,
  type MobileMenuSection,
} from "./site-mobile-menu";
import { SiteRadioPlayer } from "./site-radio-player";
import { ThemeToggle } from "./theme-toggle";

const mainLinks = [
  { href: "/", label: "Главная" },
  { href: "/teams", label: "Команды" },
  { href: "/users", label: "Участники" },
  { href: "/events", label: "Мероприятия" },
  { href: "/first-jump", label: "Первый прыжок" },
  { href: "/objects", label: "Объекты" },
  { href: "/feed", label: "Лента" },
];

const baseUserLinks = [
  { href: "/profile", label: "Профиль" },
  { href: "/notifications", label: "Уведомления" },
  { href: "/feed/new", label: "Создать пост" },
  { href: "/posts/my", label: "Мои публикации" },
  { href: "/teams/my", label: "Мои команды" },
  { href: "/events/my", label: "Мои мероприятия" },
  { href: "/applications/my", label: "Мои заявки" },
  { href: "/objects/my", label: "Мои объекты" },
  { href: "/profile/edit", label: "Редактировать профиль" },
];

const moderatorLink = { href: "/moderation", label: "Модерация" };
const radioAdminLink = { href: "/admin/radio", label: "Радио" };
const objectManagerRoles = [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.ORGANIZER];

type AppShellProps = {
  children: ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const user = await getCurrentUser();
  const isModerator = isModeratorUser(user);
  const [profile, unreadNotifications, teamMembership, objectContext] = user
    ? await Promise.all([
        api.profile.getMine().catch(() => null),
        api.notification.getUnreadCount(),
        db.teamMember.findFirst({
          where: {
            userId: user.id,
          },
          select: {
            id: true,
          },
        }),
        db.jumpObject.findFirst({
          where: {
            OR: [
              {
                createdById: user.id,
              },
              {
                createdByTeam: {
                  members: {
                    some: {
                      userId: user.id,
                      role: {
                        in: objectManagerRoles,
                      },
                    },
                  },
                },
              },
            ],
          },
          select: {
            id: true,
          },
        }),
      ])
    : [null, { count: 0 }, null, null];
  const showMyTeams = Boolean(teamMembership);
  const showMyObjects = Boolean(objectContext);

  const userLinks = user
    ? baseUserLinks
        .filter((link) => {
          if (link.href === "/teams/my") return showMyTeams;
          if (link.href === "/objects/my") return showMyObjects;

          return true;
        })
        .map((link) =>
          link.href === "/notifications" && unreadNotifications.count > 0
            ? { ...link, label: `Уведомления (${unreadNotifications.count})` }
            : link,
        )
    : [];
  const moderatorLinks = isModerator ? [moderatorLink, radioAdminLink] : [];
  const userLabel = getUserLabel({ profile, user });
  const userSubLabel =
    profile?.username && profile.displayName
      ? profile.displayName
      : user?.name && user.email
        ? user.email
        : null;
  const avatarImageUrl = profile?.avatarUrl ?? user?.image ?? null;
  const mobileSections: MobileMenuSection[] = [
    { label: "Навигация", links: mainLinks },
    ...(user ? [{ label: "Аккаунт", links: userLinks }] : []),
    ...(moderatorLinks.length > 0
      ? [{ label: "Модерация", links: moderatorLinks }]
      : []),
  ];

  return (
    <div className="iron-app-shell min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <RadioProvider>
        <header className="iron-mobile-header sticky top-0 z-30 border-b border-[var(--app-border-strong)] lg:hidden">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3">
            <Link
              href="/"
              className="block w-[clamp(180px,58vw,280px)] max-w-[calc(100vw-6rem)] text-[var(--app-text)] [--logo-color:var(--app-text)] [--logo-shadow-color:rgba(224,106,36,0.72)]"
            >
              <AnimatedLogo replayOnClick={false} />
            </Link>
            <SiteMobileMenu
              authAction={
                <>
                  <ThemeToggle />
                  {user ? <SignOutButton mobile /> : <MobileSignInLink />}
                </>
              }
              sections={mobileSections}
              trigger={
                user ? (
                  <Avatar
                    imageUrl={avatarImageUrl}
                    label={userLabel}
                    size="sm"
                  />
                ) : (
                  <GuestAvatar size="sm" />
                )
              }
            />
          </div>
          <SiteRadioPlayer variant="mobile" />
        </header>

        <div className="iron-hero-header hidden border-b border-[var(--app-border-strong)] lg:block">
          <div className="mx-auto grid w-full max-w-[1500px] grid-cols-[220px_minmax(0,1fr)_280px] px-5 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
            <div className="col-span-2 flex min-h-[132px] items-center py-5 pl-3">
              <Link
                href="/"
                className="block w-[min(720px,58vw)] max-w-full min-w-[280px] text-[var(--app-text)] drop-shadow-[0_2px_18px_rgba(0,0,0,0.9)] [--logo-color:var(--app-text)] [--logo-shadow-color:rgba(224,106,36,0.72)] xl:w-[min(860px,58vw)]"
              >
                <AnimatedLogo replayOnClick={false} />
              </Link>
            </div>
            <div className="flex min-h-[132px] items-center justify-end py-5 pr-3">
              <SiteRadioPlayer variant="desktop" />
            </div>
          </div>
        </div>
      </RadioProvider>

      <div className="mx-auto w-full lg:grid lg:min-h-[calc(100vh-9rem)] lg:max-w-[1500px] lg:grid-cols-[220px_minmax(0,1fr)_280px] xl:grid-cols-[240px_minmax(0,1fr)_300px]">
        <aside className="iron-sidebar hidden border-r border-[var(--app-border-strong)] lg:block">
          <div className="sticky top-0 flex max-h-screen flex-col overflow-y-auto px-5 py-6">
            <nav className="grid gap-1" aria-label="Основная навигация">
              {mainLinks.map((link) => (
                <SiteNavLink
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 text-sm font-medium"
                >
                  {link.label}
                </SiteNavLink>
              ))}
            </nav>
          </div>
        </aside>

        <main className="min-w-0">{children}</main>

        <aside className="iron-user-panel hidden border-l border-[var(--app-border-strong)] lg:block">
          <div className="sticky top-0 h-screen overflow-y-auto px-5 py-6">
            {user ? (
              <div>
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar
                    imageUrl={avatarImageUrl}
                    label={userLabel}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--app-text)]">
                      {userLabel}
                    </p>
                    {userSubLabel ? (
                      <p className="mt-0.5 truncate text-xs text-[var(--app-text-muted)]">
                        {userSubLabel}
                      </p>
                    ) : null}
                  </div>
                </div>

                <nav
                  className="mt-6 grid gap-1"
                  aria-label="Навигация пользователя"
                >
                  {userLinks.map((link) => (
                    <SiteNavLink
                      key={link.href}
                      href={link.href}
                      className="px-3 py-2 text-sm font-medium"
                    >
                      {link.label}
                    </SiteNavLink>
                  ))}
                  {moderatorLinks.map((link) => (
                    <SiteNavLink
                      key={link.href}
                      href={link.href}
                      className="px-3 py-2 text-sm font-medium"
                    >
                      {link.label}
                    </SiteNavLink>
                  ))}
                </nav>

                <div className="mt-6 border-t border-[var(--app-border)] pt-4">
                  <ThemeToggle />
                </div>
                <div className="mt-3">
                  <SignOutButton />
                </div>
              </div>
            ) : (
              <div>
                <GuestAvatar size="lg" />
                <p className="mt-3 text-sm font-medium text-[var(--app-text)]">
                  Jumper
                </p>
                <h2 className="mt-4 text-base font-semibold text-[var(--app-text)]">
                  Авторизуйтесь
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">
                  Войдите, чтобы стать частью сообщества.
                </p>
                <div className="mt-5">
                  <ThemeToggle />
                </div>
                <Link
                  href="/login"
                  className="iron-button mt-3 inline-flex px-4 py-2 text-sm font-medium"
                >
                  Войти
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function MobileSignInLink() {
  return (
    <Link
      href="/login"
      className="block px-1 py-2 text-sm text-[var(--app-text-secondary)] hover:text-[var(--iron-accent)]"
    >
      Войти
    </Link>
  );
}

function SignOutButton({ mobile = false }: { mobile?: boolean }) {
  return (
    <form
      action={async () => {
        "use server";

        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className={
          mobile
            ? "block w-full px-1 py-2 text-left text-sm text-[var(--app-text-secondary)] hover:text-[var(--iron-accent)]"
            : "iron-button w-full px-4 py-2 text-sm font-medium"
        }
      >
        Выйти
      </button>
    </form>
  );
}

type ShellUser = Awaited<ReturnType<typeof getCurrentUser>>;
type ShellProfile = Awaited<ReturnType<typeof api.profile.getMine>>;

function getUserLabel({
  profile,
  user,
}: {
  profile: ShellProfile;
  user: ShellUser;
}) {
  if (profile?.username) return `@${profile.username}`;

  return profile?.displayName ?? user?.name ?? user?.email ?? "Jumper";
}

function Avatar({
  imageUrl,
  label,
  size,
}: {
  imageUrl: string | null;
  label: string;
  size: "sm" | "lg";
}) {
  const initial = label.trim().charAt(0).toUpperCase() || "?";
  const imageStyle = imageUrl
    ? ({
        backgroundImage: `url("${imageUrl}")`,
      } satisfies CSSProperties)
    : undefined;
  const sizeClass = size === "sm" ? "h-9 w-9 text-sm" : "h-12 w-12 text-base";

  return (
    <span
      aria-hidden="true"
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-[var(--app-border-strong)] bg-[var(--app-surface)] bg-cover bg-center font-medium text-[var(--app-text-secondary)] shadow-[0_0_20px_rgba(224,106,36,0.08)]`}
      style={imageStyle}
    >
      {imageUrl ? null : initial}
    </span>
  );
}

function GuestAvatar({ size }: { size: "sm" | "lg" }) {
  const sizeClass = size === "sm" ? "h-9 w-9 p-1.5" : "h-14 w-14 p-2";

  return (
    <span
      aria-hidden="true"
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-[var(--app-border-strong)] bg-[var(--app-surface)] shadow-[0_0_20px_rgba(224,106,36,0.08)]`}
    >
      <Image
        src="/img/roup.svg"
        alt=""
        width={size === "sm" ? 28 : 40}
        height={size === "sm" ? 28 : 40}
        className="h-full w-full"
      />
    </span>
  );
}
