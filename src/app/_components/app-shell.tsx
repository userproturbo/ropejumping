import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { signOut } from "@/server/auth";
import { getCurrentUser } from "@/server/auth/session";
import { isModeratorUser } from "@/server/moderation/permissions";
import { api } from "@/trpc/server";

import { SiteMobileMenu, type MobileMenuSection } from "./site-mobile-menu";

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

type AppShellProps = {
  children: ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const user = await getCurrentUser();
  const isModerator = isModeratorUser(user);
  const [profile, unreadNotifications] = user
    ? await Promise.all([
        api.profile.getMine().catch(() => null),
        api.notification.getUnreadCount(),
      ])
    : [null, { count: 0 }];

  const userLinks = user
    ? baseUserLinks.map((link) =>
        link.href === "/notifications" && unreadNotifications.count > 0
          ? { ...link, label: `Уведомления (${unreadNotifications.count})` }
          : link,
      )
    : [];
  const moderatorLinks = isModerator ? [moderatorLink] : [];
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
    <div className="min-h-screen bg-[#202020] text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#202020] lg:hidden">
        <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/"
            className="font-brand inline-block text-2xl leading-none tracking-[0.06em] text-zinc-50"
          >
            ropejumping
          </Link>
          <SiteMobileMenu
            authAction={user ? <SignOutButton mobile /> : <MobileSignInLink />}
            sections={mobileSections}
            trigger={
              user ? (
                <Avatar imageUrl={avatarImageUrl} label={userLabel} size="sm" />
              ) : (
                <GuestAvatar size="sm" />
              )
            }
          />
        </div>
      </header>

      <div className="hidden border-b border-white/10 bg-[#202020] lg:block">
        <div className="mx-auto grid w-full max-w-[1500px] grid-cols-[220px_minmax(0,1fr)_280px] px-5 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
          <div className="col-span-2 px-3 py-7">
            <Link
              href="/"
              className="font-brand inline-block w-fit text-7xl leading-none tracking-[0.08em] text-zinc-50 xl:text-8xl"
            >
              ropejumping
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full lg:grid lg:min-h-[calc(100vh-9rem)] lg:max-w-[1500px] lg:grid-cols-[220px_minmax(0,1fr)_280px] xl:grid-cols-[240px_minmax(0,1fr)_300px]">
        <aside className="hidden border-r border-white/10 bg-[#202020] lg:block">
          <div className="sticky top-0 flex max-h-screen flex-col overflow-y-auto px-5 py-6">
            <nav className="grid gap-1" aria-label="Основная навигация">
              {mainLinks.map((link) => (
                <SidebarLink key={link.href} href={link.href}>
                  {link.label}
                </SidebarLink>
              ))}
            </nav>
          </div>
        </aside>

        <main className="min-w-0">{children}</main>

        <aside className="hidden border-l border-white/10 bg-[#202020] lg:block">
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
                    <p className="truncate text-sm font-medium text-zinc-50">
                      {userLabel}
                    </p>
                    {userSubLabel ? (
                      <p className="mt-0.5 truncate text-xs text-zinc-400">
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
                    <SidebarLink key={link.href} href={link.href}>
                      {link.label}
                    </SidebarLink>
                  ))}
                  {moderatorLinks.map((link) => (
                    <SidebarLink key={link.href} href={link.href}>
                      {link.label}
                    </SidebarLink>
                  ))}
                </nav>

                <div className="mt-6 border-t border-white/10 pt-4">
                  <SignOutButton />
                </div>
              </div>
            ) : (
              <div>
                <GuestAvatar size="lg" />
                <p className="mt-3 text-sm font-medium text-zinc-50">Jumper</p>
                <h2 className="mt-4 text-base font-semibold text-zinc-50">
                  Авторизуйтесь
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Войдите, чтобы стать частью сообщества.
                </p>
                <Link
                  href="/api/auth/signin"
                  className="mt-5 inline-flex border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-white/10 hover:text-white"
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
}: {
  children: ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
    >
      {children}
    </Link>
  );
}

function MobileSignInLink() {
  return (
    <Link
      href="/api/auth/signin"
      className="block px-1 py-2 text-sm text-zinc-300 hover:text-white"
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
            ? "block w-full px-1 py-2 text-left text-sm text-zinc-300 hover:text-white"
            : "w-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-white/10 hover:text-white"
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
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 bg-cover bg-center font-medium text-zinc-200`}
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
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10`}
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
