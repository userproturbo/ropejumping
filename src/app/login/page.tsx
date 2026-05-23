import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getCurrentUser } from "@/server/auth/session";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Вход | ropejumping",
  description: "Вход в ropejumping.",
};

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/profile");
  }

  const params = await searchParams;
  const callbackUrl = getSingleSearchParam(params.callbackUrl) ?? "/profile";

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6 lg:min-h-[calc(100vh-9rem)] lg:px-8 lg:py-12">
      <section className="mx-auto flex w-full max-w-xl flex-col gap-8">
        <div>
          <Link
            href="/"
            className="font-brand inline-block text-5xl leading-none tracking-[0.08em] text-[var(--app-text)] sm:text-6xl"
          >
            ropejumping
          </Link>
          <p className="mt-4 max-w-md text-sm leading-6 text-[var(--app-text-muted)]">
            Войдите, чтобы подавать заявки на мероприятия, писать посты и
            сохранять историю участия.
          </p>
        </div>

        <div className="border border-[var(--app-border-strong)] bg-[var(--app-surface)] p-6 shadow-sm shadow-black/10 sm:p-8">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[var(--app-border-strong)] bg-[var(--app-surface-muted)] p-2">
              <Image
                src="/img/roup.svg"
                alt=""
                width={40}
                height={40}
                className="h-full w-full"
              />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-[var(--app-text)]">
                Вход в ropejumping
              </h1>
              <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                Аккаунт сообщества
              </p>
            </div>
          </div>

          <LoginForm callbackUrl={callbackUrl} />
        </div>

        <Link
          href="/"
          className="w-fit text-sm text-[var(--app-text-secondary)] hover:text-[var(--app-text)]"
        >
          Вернуться на главную
        </Link>
      </section>
    </div>
  );
}

function getSingleSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}
