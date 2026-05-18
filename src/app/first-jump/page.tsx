import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Первый прыжок | Ropejumping",
  description:
    "Как проходят мероприятия, как подать заявку и что важно знать перед первым прыжком.",
};

const flowSteps = [
  "Вы выбираете мероприятие.",
  "Подаёте заявку.",
  "Организатор рассматривает заявку.",
  "После принятия вам становятся доступны чат мероприятия и логистика.",
  "На месте вы проходите инструктаж и действуете по командам организаторов.",
  "После мероприятия организатор подтверждает участие.",
];

const beforeApplyingItems = [
  "проверьте дату и город/регион;",
  "уточните требования к участникам;",
  "честно укажите опыт, если форма это спрашивает;",
  "не подавайте заявку, если не готовы соблюдать правила организатора;",
  "если есть медицинские ограничения, заранее оцените риски и сообщите организатору.",
];

const bringItems = [
  "удобную одежду по погоде;",
  "закрытую обувь;",
  "воду и перекус;",
  "документы;",
  "заряженный телефон;",
  "личные лекарства, если они вам нужны;",
  "перчатки, если организатор просит;",
  "сменную одежду, если мероприятие у воды или в сложных погодных условиях.",
];

const safetyItems = [
  "слушайте организаторов и инструкторов;",
  "не заходите в рабочую зону без разрешения;",
  "не трогайте снаряжение без команды;",
  "не отвлекайте людей, которые готовят прыжок;",
  "не публикуйте координаты объектов, точки крепления и технические детали;",
  "не пытайтесь повторять прыжки самостоятельно.",
];

const medicalLimitationItems = [
  "травмы позвоночника, спины или шеи;",
  "сердечно-сосудистые заболевания;",
  "проблемы с артериальным давлением;",
  "респираторные заболевания и состояния, влияющие на дыхание;",
  "неврологические состояния;",
  "недавние операции или восстановление после травм;",
  "беременность;",
  "серьёзные проблемы со зрением или недавние операции на глазах;",
  "острые психиатрические состояния;",
  "другие состояния здоровья, которые могут повлиять на безопасность.",
];

const forbiddenObjectRules = [
  "находиться в состоянии алкогольного или наркотического опьянения;",
  "трогать снаряжение без разрешения;",
  "заходить в рабочую зону или подходить к краю без команды;",
  "отвлекать инструкторов и людей, которые готовят прыжок;",
  "бросать предметы с высоты;",
  "бегать, толкаться, драться или вести себя хаотично рядом со снаряжением;",
  "разводить огонь или курить рядом со снаряжением;",
  "оставлять мусор;",
  "устраивать конфликты;",
  "публиковать координаты, маршруты доступа, точки крепления и технические детали.",
];

const requiredObjectRules = [
  "слушать организаторов и инструкторов;",
  "выполнять команды без споров и задержек;",
  "сообщать о медицинских ограничениях и плохом самочувствии;",
  "убрать свободные предметы перед прыжком, если инструктор просит;",
  "входить в рабочую зону только после разрешения;",
  "прыгать только после команды;",
  "сообщать организаторам о подозрительных ситуациях.",
];

const faqItems = [
  {
    question: "Можно ли прыгать без опыта?",
    answer:
      "Зависит от мероприятия и требований организатора. Некоторые мероприятия подходят новичкам, другие рассчитаны на опытных участников.",
  },
  {
    question: "Что будет после подачи заявки?",
    answer:
      "Организатор рассмотрит заявку. Если её примут, вам станут доступны внутренние блоки мероприятия: чат и логистика.",
  },
  {
    question: "Можно ли приехать без заявки?",
    answer:
      "Обычно нет. Участие лучше согласовывать заранее через заявку, чтобы организатор понимал количество людей и мог подготовить мероприятие.",
  },
  {
    question: "Где точные координаты?",
    answer:
      "Точные координаты и технические детали не публикуются открыто. Организатор сообщает нужную информацию участникам безопасным способом.",
  },
  {
    question: "Можно ли снимать фото и видео?",
    answer:
      "Обычно можно, если это не мешает безопасности и правилам организатора. Уточняйте на конкретном мероприятии.",
  },
  {
    question: "Что если я передумал?",
    answer:
      "Если вы подали заявку, но не сможете приехать, отмените её заранее или предупредите организатора.",
  },
];

export default function FirstJumpPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <section className="border border-zinc-200 bg-white p-6 sm:p-8">
          <p className="text-sm font-medium tracking-[0.18em] text-zinc-500 uppercase">
            Для новичков
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
            Первый прыжок
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
            Коротко о том, как проходят мероприятия, как подать заявку и что
            важно знать перед первым прыжком.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
            Если вы впервые хотите попасть на мероприятие, начните отсюда.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/events"
              className="bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-800"
            >
              Смотреть мероприятия
            </Link>
            <Link
              href="/feed"
              className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
            >
              Задать вопрос в ленте
            </Link>
          </div>
        </section>

        <div className="mt-6 grid gap-6">
          <InfoSection title="Что такое роупджампинг">
            <div className="grid gap-3 text-sm leading-6 text-zinc-600">
              <p>
                Роупджампинг на этой платформе рассматривается только как
                участие в организованных мероприятиях: человек прыгает с высоты,
                а систему безопасности заранее готовит команда организаторов.
              </p>
              <p>
                Участник не собирает систему и не принимает технические решения.
                Его задача — пройти инструктаж, слушать команды инструктора и
                действовать только в рамках правил конкретного мероприятия.
              </p>
              <p className="border border-amber-200 bg-amber-50 p-3 text-amber-900">
                Эта страница не является инструкцией для самостоятельных прыжков
                и не описывает подготовку системы, расчёты или техническую
                организацию прыжка.
              </p>
            </div>
          </InfoSection>

          <InfoSection title="Как это обычно проходит">
            <ol className="grid gap-3 text-sm leading-6 text-zinc-600">
              {flowSteps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-zinc-300 text-xs font-medium text-zinc-700">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </InfoSection>

          <InfoSection title="Перед подачей заявки">
            <p className="text-sm leading-6 text-zinc-600">
              Внимательно прочитайте описание мероприятия, требования
              организатора, уровень подготовки и ограничения.
            </p>
            <BulletList items={beforeApplyingItems} />
          </InfoSection>

          <InfoSection title="Медицинские ограничения">
            <p className="text-sm leading-6 text-zinc-600">
              Роупджампинг связан с нагрузкой, стрессом и резкими ощущениями.
              Некоторые состояния здоровья могут быть несовместимы с участием
              или требуют отдельного обсуждения до подачи заявки.
            </p>
            <BulletList items={medicalLimitationItems} />
            <p className="mt-4 border border-zinc-200 bg-zinc-50 p-3 text-sm leading-6 text-zinc-600">
              Этот список не является полным. Если есть сомнения, хронические
              заболевания, травмы или недавние операции — проконсультируйтесь с
              врачом до подачи заявки и заранее сообщите организатору о важных
              ограничениях.
            </p>
          </InfoSection>

          <InfoSection title="Что взять с собой">
            <BulletList items={bringItems} />
            <p className="mt-4 border border-zinc-200 bg-zinc-50 p-3 text-sm leading-6 text-zinc-600">
              Точный список может отличаться. Ориентируйтесь на описание
              конкретного мероприятия и сообщения организатора.
            </p>
          </InfoSection>

          <InfoSection title="Главное про безопасность">
            <p className="text-sm leading-6 text-zinc-600">
              Безопасность важнее красивого кадра, скорости и эмоций.
            </p>
            <BulletList items={safetyItems} />
          </InfoSection>

          <InfoSection title="Трезвость — обязательное условие">
            <p className="text-sm leading-6 text-zinc-600">
              Если человек приехал на мероприятие в состоянии алкогольного или
              наркотического опьянения, он не допускается к прыжкам. Это
              касается не только участников, но и людей, находящихся на объекте:
              безопасность команды и окружающих важнее любых планов.
            </p>
          </InfoSection>

          <InfoSection title="Правила поведения на объекте">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-base font-semibold text-zinc-950">
                  На объекте нельзя
                </h3>
                <BulletList items={forbiddenObjectRules} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-zinc-950">
                  На объекте необходимо
                </h3>
                <BulletList items={requiredObjectRules} />
              </div>
            </div>
          </InfoSection>

          <InfoSection title="Как добраться">
            <p className="text-sm leading-6 text-zinc-600">
              После принятия заявки в мероприятии могут быть доступны чат и блок
              “Как добраться / Попутки”. Там участники договариваются о машинах,
              свободных местах и совместной дороге.
            </p>
            <p className="mt-4 border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              Не публикуйте точные координаты объекта в публичных местах.
            </p>
          </InfoSection>

          <InfoSection title="Частые вопросы">
            <div className="grid gap-4">
              {faqItems.map((item) => (
                <div key={item.question} className="border border-zinc-200 p-4">
                  <h3 className="text-base font-semibold text-zinc-950">
                    {item.question}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </InfoSection>

          <section className="border border-zinc-200 bg-white p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
                  Готовы выбрать мероприятие?
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Посмотрите ближайшие события и требования организаторов.
                </p>
              </div>
              <Link
                href="/events"
                className="inline-flex justify-center bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-800"
              >
                Перейти к мероприятиям
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function InfoSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="border border-zinc-200 bg-white p-6">
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 grid gap-2 text-sm leading-6 text-zinc-600">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-zinc-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
