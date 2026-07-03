import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { TeamRole } from "@/generated/prisma/enums";
import { signOut } from "@/server/auth";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { isModeratorUser } from "@/server/moderation/permissions";
import { api } from "@/trpc/server";

import { AnimatedLogo } from "./animated-logo";
import { RadioProvider } from "./radio-provider";
import { SiteMobileMenu, type MobileMenuSection } from "./site-mobile-menu";
import { SiteRadioPlayer } from "./site-radio-player";
import { ThemeToggle } from "./theme-toggle";

type NavigationLink = {
  href: string;
  iconSrc?: string;
  label: string;
};

const mainLinks: NavigationLink[] = [
  { href: "/", iconSrc: "/svg/Home.svg", label: "Главная" },
  { href: "/teams", iconSrc: "/svg/commands.svg", label: "Команды" },
  { href: "/users", iconSrc: "/svg/PeopleMultiple.svg", label: "Участники" },
  { href: "/events", iconSrc: "/svg/events.svg", label: "Мероприятия" },
  {
    href: "/first-jump",
    iconSrc: "/svg/logo-pope-clean.svg",
    label: "Первый прыжок",
  },
  { href: "/objects", iconSrc: "/svg/objects.svg", label: "Объекты" },
  { href: "/feed", iconSrc: "/svg/tape.svg", label: "Лента" },
];

const baseUserLinks: NavigationLink[] = [
  { href: "/profile", iconSrc: "/svg/profile.svg", label: "Профиль" },
  {
    href: "/notifications",
    iconSrc: "/svg/notifications.svg",
    label: "Уведомления",
  },
  { href: "/feed/new", iconSrc: "/svg/create-post.svg", label: "Создать пост" },
  {
    href: "/posts/my",
    iconSrc: "/svg/my-publications.svg",
    label: "Мои публикации",
  },
  { href: "/teams/my", label: "Мои команды" },
  {
    href: "/events/my",
    iconSrc: "/svg/my-events.svg",
    label: "Мои мероприятия",
  },
  {
    href: "/applications/my",
    iconSrc: "/svg/my-applications.svg",
    label: "Мои заявки",
  },
  { href: "/objects/my", label: "Мои объекты" },
  {
    href: "/profile/edit",
    iconSrc: "/svg/edit-profile.svg",
    label: "Редактировать профиль",
  },
];

const moderatorLink: NavigationLink = {
  href: "/moderation",
  iconSrc: "/svg/moderation.svg",
  label: "Модерация",
};
const radioAdminLink: NavigationLink = {
  href: "/admin/radio",
  iconSrc: "/svg/Radio.svg",
  label: "Радио",
};
const objectManagerRoles = [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.ORGANIZER];

type AppShellProps = {
  children: ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const user = await getCurrentUser();
  const isModerator = isModeratorUser(user);
  const [unreadNotifications, teamMembership, objectContext] = user
    ? await Promise.all([
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
    : [{ count: 0 }, null, null];
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
  const mobileSections: MobileMenuSection[] = [
    { label: "Навигация", links: mainLinks },
    ...(user ? [{ label: "Аккаунт", links: userLinks }] : []),
    ...(moderatorLinks.length > 0
      ? [{ label: "Модерация", links: moderatorLinks }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <style>{`
        .app-menu-icon,
        html[data-theme="dark"] .app-menu-icon {
          filter: brightness(0) invert(88%);
        }

        html[data-theme="light"] .app-menu-icon {
          filter: brightness(0) invert(22%);
        }
      `}</style>

      <RadioProvider>
        <header className="sticky top-0 z-30 border-b border-[var(--app-border)] bg-[var(--app-bg)] lg:hidden">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3">
            <Link
              href="/"
              className="block w-[clamp(180px,58vw,280px)] max-w-[calc(100vw-6rem)] text-[var(--app-text)] [--logo-color:var(--app-text)]"
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
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-full border border-[var(--app-border-strong)] bg-[var(--app-surface)]"
                >
                  <span className="h-0.5 w-4 bg-[var(--app-text-secondary)]" />
                  <span className="h-0.5 w-4 bg-[var(--app-text-secondary)]" />
                  <span className="h-0.5 w-4 bg-[var(--app-text-secondary)]" />
                </span>
              }
            />
          </div>
          <SiteRadioPlayer variant="mobile" />
        </header>

        <div className="hidden border-b border-[var(--app-border)] bg-[var(--app-bg)] lg:block">
          <div className="mx-auto grid w-full max-w-[1500px] grid-cols-[220px_minmax(0,1fr)_280px] px-5 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
            <div className="col-span-2 flex min-h-[132px] items-center py-5 pl-3">
              <Link
                href="/"
                className="block min-w-[280px] w-[min(720px,58vw)] max-w-full text-[var(--app-text)] [--logo-color:var(--app-text)] xl:w-[min(860px,58vw)]"
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
        <aside className="hidden border-r border-[var(--app-border)] bg-[var(--app-bg)] lg:block">
          <div className="sticky top-0 flex max-h-screen flex-col overflow-y-auto px-5 py-6">
            <nav className="grid gap-1" aria-label="Основная навигация">
              {mainLinks.map((link) => (
                <SidebarLink
                  key={link.href}
                  href={link.href}
                  iconSrc={link.iconSrc}
                >
                  {link.label}
                </SidebarLink>
              ))}
            </nav>
          </div>
        </aside>

        <main className="min-w-0">{children}</main>

        <aside className="hidden border-l border-[var(--app-border)] bg-[var(--app-bg)] lg:block">
          <div className="sticky top-0 h-screen overflow-y-auto px-5 py-6">
            {user ? (
              <div>
                <nav
                  className="grid gap-1"
                  aria-label="Навигация пользователя"
                >
                  {userLinks.map((link) => (
                    <SidebarLink
                      key={link.href}
                      href={link.href}
                      iconSrc={link.iconSrc}
                    >
                      {link.label}
                    </SidebarLink>
                  ))}
                  {moderatorLinks.map((link) => (
                    <SidebarLink
                      key={link.href}
                      href={link.href}
                      iconSrc={link.iconSrc}
                    >
                      {link.label}
                    </SidebarLink>
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
                <h2 className="text-base font-semibold text-[var(--app-text)]">
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
                  className="mt-3 inline-flex border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-4 py-2 text-sm font-medium text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]"
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

function SidebarLink({
  children,
  href,
  iconSrc,
}: {
  children: ReactNode;
  href: string;
  iconSrc?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 px-3 py-2.5 text-base text-[var(--app-text-secondary)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">
        {iconSrc ? (
          <Image
            src={iconSrc}
            alt=""
            aria-hidden="true"
            width={24}
            height={24}
            className="app-menu-icon h-[22px] w-[22px] opacity-95 transition duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100"
          />
        ) : null}
      </span>
      <span className="min-w-0 truncate">{children}</span>
    </Link>
  );
}

function MobileSignInLink() {
  return (
    <Link
      href="/login"
      className="block px-1 py-2 text-sm text-[var(--app-text-secondary)] hover:text-[var(--app-text)]"
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
            ? "block w-full px-1 py-2 text-left text-sm text-[var(--app-text-secondary)] hover:text-[var(--app-text)]"
            : "w-full border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-4 py-2 text-sm font-medium text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]"
        }
      >
        Выйти
      </button>
    </form>
  );
}
