import Link from "next/link";
import type { ReactNode } from "react";

import { signOut } from "@/server/auth";
import { getCurrentUser } from "@/server/auth/session";
import { isModeratorUser } from "@/server/moderation/permissions";

import { SiteMobileMenu } from "./site-mobile-menu";

const mainLinks = [
  { href: "/", label: "Главная" },
  { href: "/teams", label: "Команды" },
  { href: "/events", label: "Мероприятия" },
  { href: "/objects", label: "Объекты" },
  { href: "/feed", label: "Лента" },
];

const userLinks = [
  { href: "/feed/new", label: "Создать пост" },
  { href: "/teams/my", label: "Мои команды" },
  { href: "/events/my", label: "Мои мероприятия" },
  { href: "/applications/my", label: "Мои заявки" },
  { href: "/objects/my", label: "Мои объекты" },
  { href: "/profile", label: "Профиль" },
];

const moderatorLink = { href: "/moderation", label: "Модерация" };

export async function SiteHeader() {
  const user = await getCurrentUser();
  const isModerator = isModeratorUser(user);
  const availableUserLinks = user ? userLinks : [];
  const availableModeratorLinks = isModerator ? [moderatorLink] : [];
  const mobileLinks = [
    ...mainLinks,
    ...availableUserLinks,
    ...availableModeratorLinks,
  ];
  const userLabel = user?.email ?? user?.name ?? "Выполнен вход";

  return (
    <header className="relative z-20 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex min-w-0 items-center gap-5">
          <Link
            href="/"
            className="shrink-0 text-base font-semibold text-zinc-950"
          >
            ropejumping
          </Link>

          <nav
            className="hidden min-w-0 flex-wrap items-center gap-x-4 gap-y-2 md:flex"
            aria-label="Основная навигация"
          >
            {mainLinks.map((link) => (
              <HeaderLink key={link.href} href={link.href}>
                {link.label}
              </HeaderLink>
            ))}
          </nav>
        </div>

        <div className="hidden min-w-0 flex-1 flex-wrap items-center justify-end gap-x-4 gap-y-2 md:flex">
          {user ? (
            <>
              <nav
                className="flex min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-2"
                aria-label="Навигация пользователя"
              >
                {availableUserLinks.map((link) => (
                  <HeaderLink key={link.href} href={link.href}>
                    {link.label}
                  </HeaderLink>
                ))}
                {availableModeratorLinks.map((link) => (
                  <HeaderLink key={link.href} href={link.href}>
                    {link.label}
                  </HeaderLink>
                ))}
              </nav>
              <span className="max-w-40 truncate text-xs text-zinc-500 lg:max-w-56">
                {userLabel}
              </span>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/api/auth/signin"
              className="border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:border-zinc-950 hover:text-zinc-950"
            >
              Войти
            </Link>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-3 md:hidden">
          {user ? (
            <span className="hidden max-w-36 truncate text-xs text-zinc-500 sm:inline">
              {userLabel}
            </span>
          ) : null}
          <SiteMobileMenu
            links={mobileLinks}
            authAction={user ? <SignOutButton mobile /> : <MobileSignInLink />}
          />
        </div>
      </div>
    </header>
  );
}

function HeaderLink({
  children,
  href,
}: {
  children: ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="whitespace-nowrap text-xs text-zinc-600 hover:text-zinc-950 lg:text-sm"
    >
      {children}
    </Link>
  );
}

function MobileSignInLink() {
  return (
    <Link
      href="/api/auth/signin"
      className="block px-1 py-2 text-sm text-zinc-700 hover:text-zinc-950"
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
            ? "block w-full px-1 py-2 text-left text-sm text-zinc-700 hover:text-zinc-950"
            : "border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:border-zinc-950 hover:text-zinc-950"
        }
      >
        Выйти
      </button>
    </form>
  );
}
