import Link from "next/link";

import { signOut } from "@/server/auth";
import { getCurrentUser } from "@/server/auth/session";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
        <nav className="flex items-center gap-6">
          <Link href="/" className="text-base font-semibold text-zinc-950">
            ropejumping
          </Link>
          <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-950">
            Главная
          </Link>
          <Link
            href="/teams"
            className="text-sm text-zinc-600 hover:text-zinc-950"
          >
            Команды
          </Link>
          <Link
            href="/events"
            className="text-sm text-zinc-600 hover:text-zinc-950"
          >
            Мероприятия
          </Link>
          {user ? (
            <>
              <Link
                href="/teams/my"
                className="text-sm text-zinc-600 hover:text-zinc-950"
              >
                Мои команды
              </Link>
              <Link
                href="/events/my"
                className="text-sm text-zinc-600 hover:text-zinc-950"
              >
                Мои мероприятия
              </Link>
              <Link
                href="/profile"
                className="text-sm text-zinc-600 hover:text-zinc-950"
              >
                Профиль
              </Link>
            </>
          ) : null}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="hidden text-zinc-500 sm:inline">
                {user.email ?? user.name ?? "Выполнен вход"}
              </span>
              <form
                action={async () => {
                  "use server";

                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="border border-zinc-300 px-3 py-2 text-zinc-700 hover:border-zinc-950 hover:text-zinc-950"
                >
                  Выйти
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/api/auth/signin"
              className="border border-zinc-300 px-3 py-2 text-zinc-700 hover:border-zinc-950 hover:text-zinc-950"
            >
              Войти
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
