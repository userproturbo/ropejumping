import { HydrateClient } from "@/trpc/server";

export default async function Home() {
  return (
    <HydrateClient>
      <main className="min-h-[calc(100vh-4rem)] bg-zinc-950 text-zinc-100">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col justify-center gap-8 px-6 py-16">
          <div className="space-y-4">
            <p className="text-sm font-medium tracking-[0.18em] text-emerald-300 uppercase">
              ПЛАТФОРМА СООБЩЕСТВА
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
              ropejumping
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-zinc-300">
              Платформа для команд, мероприятий и участников
              роупджампинг-сообщества. Команды и мероприятия уже доступны.
              Объекты, бейджи и лента появятся позже.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-zinc-300 sm:grid-cols-2 lg:grid-cols-3">
            <div className="border border-zinc-800 bg-zinc-900/60 p-4">
              Авторизация
            </div>
            <div className="border border-zinc-800 bg-zinc-900/60 p-4">
              Профиль участника
            </div>
            <div className="border border-zinc-800 bg-zinc-900/60 p-4">
              Публичная страница
            </div>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
