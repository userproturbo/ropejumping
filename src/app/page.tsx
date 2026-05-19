import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Ropejumping — мероприятия, команды и история участия",
  description:
    "Платформа для роупджампинг-мероприятий: заявки, команды, логистика, чаты, история участия и бейджи.",
};

const heroFragments = [
  "первый прыжок",
  "ночь на объекте",
  "разговоры у костра",
  "старые мосты",
  "новые люди",
  "история высоты",
];

const atmosphereCards = [
  {
    title: "Дорога",
    text: "Иногда всё начинается не на объекте, а в машине по пути туда.",
  },
  {
    title: "Люди",
    text: "На объекте встречаются новички, старые друзья, команды, фотографы и те, кто “просто приехал посмотреть”.",
  },
  {
    title: "Истории",
    text: "Кто-то считает первые прыжки, кто-то вспоминает объекты десятилетней давности.",
  },
  {
    title: "Ночь",
    text: "Если остаёшься с ночёвкой, разговоры часто продолжаются у костра — про прыжки, походы, доски, парашюты и новые планы.",
  },
];

const experiencedLinks = [
  { href: "/events", label: "Мероприятия" },
  { href: "/teams", label: "Команды" },
  { href: "/feed", label: "Лента" },
];

const communityItems = [
  "мероприятия и заявки",
  "команды и участники",
  "чат мероприятия",
  "логистика и попутки",
  "история профиля",
  "бейджи опыта",
];

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-950 text-zinc-100">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(16,185,129,0.22),transparent_30%),radial-gradient(circle_at_78%_12%,rgba(244,114,182,0.16),transparent_28%),linear-gradient(135deg,#09090b_0%,#18181b_48%,#030712_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />
        <div className="absolute top-24 right-[8%] hidden h-80 w-56 rotate-6 border border-white/15 bg-white/8 shadow-2xl shadow-black/40 backdrop-blur md:block" />
        <div className="absolute right-[18%] bottom-20 hidden h-56 w-72 -rotate-3 border border-emerald-200/20 bg-emerald-300/10 shadow-2xl shadow-emerald-950/30 backdrop-blur md:block" />
        <div className="absolute top-44 right-[31%] hidden h-44 w-44 rotate-12 border border-rose-200/20 bg-rose-300/10 shadow-2xl shadow-black/30 backdrop-blur lg:block" />

        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-10 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-medium tracking-[0.18em] text-emerald-300 uppercase">
              СООБЩЕСТВО, ВЫЕЗДЫ И ВЫСОТА
            </p>
            <h1 className="mt-5 text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Роупджампинг — это больше, чем прыжок
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-200">
              Место для тех, кто ездит на объекты, встречает друзей, подаёт
              заявки на мероприятия и сохраняет свою историю участия.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/events" variant="primary">
                Смотреть мероприятия
              </ButtonLink>
              <ButtonLink href="/first-jump" variant="secondary">
                Первый прыжок
              </ButtonLink>
              <ButtonLink href="/feed" variant="ghost">
                Лента сообщества
              </ButtonLink>
            </div>
          </div>

          <div className="relative min-h-[380px] lg:min-h-[540px]">
            <div className="absolute inset-x-2 top-6 border border-white/15 bg-zinc-950/60 p-5 shadow-2xl shadow-black/40 backdrop-blur">
              <div className="flex items-center justify-between gap-4 text-xs text-zinc-400">
                <span>Вечер перед прыжком</span>
                <span className="text-emerald-300">команда рядом</span>
              </div>
              <div className="mt-10 h-36 border border-white/10 bg-[linear-gradient(140deg,rgba(255,255,255,0.18),rgba(16,185,129,0.12)_44%,rgba(244,114,182,0.12))]" />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {heroFragments.slice(0, 4).map((fragment) => (
                  <div
                    key={fragment}
                    className="border border-white/10 bg-white/5 p-3 text-sm text-white"
                  >
                    {fragment}
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute right-0 bottom-4 left-8 border border-white/15 bg-white/10 p-5 shadow-2xl shadow-black/30 backdrop-blur">
              <p className="text-sm text-zinc-300">Остаётся после выезда</p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-white">
                {heroFragments.slice(2).map((fragment) => (
                  <span key={fragment} className="border border-white/10 px-3 py-2">
                    {fragment}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-zinc-50 text-zinc-950">
        <div className="mx-auto w-full max-w-7xl px-6 py-16 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-medium tracking-[0.18em] text-zinc-500 uppercase">
              Атмосфера
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight">
              Это не только про прыжок
            </h2>
            <p className="mt-5 text-base leading-7 text-zinc-600">
              Роупджампинг — это дорога до объекта, ожидание своей очереди,
              разговоры с теми, кого давно не видел, истории про старые мосты,
              новые знакомства и момент, когда страх превращается в улыбку.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {atmosphereCards.map((card) => (
              <section key={card.title} className="border border-zinc-200 bg-white p-6">
                <h3 className="text-xl font-semibold text-zinc-950">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  {card.text}
                </p>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white text-zinc-950">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-16 lg:grid-cols-2">
          <InfoPanel title="Если вы впервые">
            <p>
              Новичку не нужно знать всё сразу. Начните с простого: выберите
              мероприятие, прочитайте описание, подайте заявку и дождитесь
              ответа организатора.
            </p>
            <p className="mt-4">
              На месте организаторы проводят инструктаж и объясняют правила
              поведения.
            </p>
            <div className="mt-6">
              <ButtonLink href="/first-jump" variant="dark">
                Что знать перед первым прыжком
              </ButtonLink>
            </div>
          </InfoPanel>

          <InfoPanel title="Если вы уже в теме">
            <p>
              Здесь можно следить за мероприятиями, командами, объектами, лентой
              сообщества, историей участия и бейджами. Не как рейтинг, а как
              личная память о том, где вы были и с кем прыгали.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {experiencedLinks.map((link) => (
                <ButtonLink key={link.href} href={link.href} variant="light">
                  {link.label}
                </ButtonLink>
              ))}
            </div>
          </InfoPanel>
        </div>
      </section>

      <section className="bg-zinc-100 text-zinc-950">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-sm font-medium tracking-[0.18em] text-zinc-500 uppercase">
              Реальные выезды
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight">
              Сообщество вокруг реальных событий
            </h2>
            <p className="mt-5 text-base leading-7 text-zinc-600">
              Посты, фото, вопросы, заявки, чаты мероприятий, попутки и история
              участия собираются вокруг настоящих выездов, а не вокруг случайной
              ленты.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {communityItems.map((item) => (
              <div
                key={item}
                className="border border-zinc-200 bg-white p-4 text-sm text-zinc-700"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-zinc-950 text-zinc-100">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-medium tracking-[0.18em] text-emerald-300 uppercase">
              Safety first
            </p>
            <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-white">
              Безопасность важнее красивого кадра
            </h2>
          </div>
          <div>
            <p className="text-base leading-7 text-zinc-300">
              На объекте важно слушать организаторов, не лезть в рабочую зону
              без команды и не публиковать координаты, точки крепления, маршруты
              доступа и технические детали.
            </p>
            <div className="mt-6">
              <ButtonLink href="/first-jump" variant="secondary">
                Первый прыжок
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white text-zinc-950">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-6 px-6 py-16 sm:flex-row sm:items-center">
          <div>
            <h2 className="max-w-xl text-4xl font-semibold tracking-tight">
              Найдите ближайшее мероприятие
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-600">
              Посмотрите события, выберите подходящее и подайте заявку. А дальше
              — дорога, команда, объект и ваша история.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/events" variant="dark">
              Смотреть мероприятия
            </ButtonLink>
            <ButtonLink href="/first-jump" variant="light">
              Первый прыжок
            </ButtonLink>
          </div>
        </div>
      </section>
    </main>
  );
}

function ButtonLink({
  children,
  href,
  variant,
}: {
  children: ReactNode;
  href: string;
  variant: "primary" | "secondary" | "ghost" | "dark" | "light";
}) {
  const classes = {
    primary:
      "bg-emerald-300 px-5 py-3 text-sm font-medium text-zinc-950 hover:bg-emerald-200",
    secondary:
      "border border-white/25 bg-white/10 px-5 py-3 text-sm font-medium text-white hover:bg-white/15",
    ghost: "px-5 py-3 text-sm font-medium text-zinc-300 hover:text-white",
    dark: "bg-zinc-950 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800",
    light:
      "border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-800 hover:border-zinc-950",
  };

  return (
    <Link href={href} className={classes[variant]}>
      {children}
    </Link>
  );
}

function InfoPanel({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="border border-zinc-200 bg-white p-6 sm:p-8">
      <h2 className="text-3xl font-semibold tracking-tight text-zinc-950">
        {title}
      </h2>
      <div className="mt-4 text-sm leading-6 text-zinc-600">{children}</div>
    </section>
  );
}
