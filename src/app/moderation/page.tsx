import Link from "next/link";
import { notFound } from "next/navigation";

import {
  FilterSummary,
  type FilterChip,
} from "@/app/_components/filter-summary";
import { ReportStatus } from "@/generated/prisma/enums";
import { getCurrentUser, requireCurrentUser } from "@/server/auth/session";
import { isModeratorUser } from "@/server/moderation/permissions";
import { api } from "@/trpc/server";

import { ReportCard } from "./_components/report-card";

type ModerationPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const statusOptions = [
  { value: "OPEN", label: "Открытые" },
  { value: "REVIEWED", label: "Рассмотренные" },
  { value: "RESOLVED", label: "Решённые" },
  { value: "DISMISSED", label: "Отклонённые" },
  { value: "ALL", label: "Все" },
];

const targetTypeOptions = [
  { value: "POST", label: "Пост" },
  { value: "COMMENT", label: "Комментарий" },
  { value: "OBJECT", label: "Объект" },
  { value: "OBJECT_IMPRESSION", label: "Впечатление об объекте" },
  { value: "EVENT_CHAT_MESSAGE", label: "Сообщение в чате мероприятия" },
  { value: "EVENT_LOGISTICS_POST", label: "Запись в логистике мероприятия" },
  { value: "TEAM_CHAT_MESSAGE", label: "Сообщение в чате команды" },
];

const sortOptions = [
  { value: "createdAtDesc", label: "Сначала новые" },
  { value: "createdAtAsc", label: "Сначала старые" },
];

const getSearchParamValue = (
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) => {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
};

const getOptionLabel = (
  options: Array<{ value: string; label: string }>,
  value: string,
) => options.find((option) => option.value === value)?.label ?? value;

const buildModerationHref = (
  params: Record<string, string | boolean | undefined>,
) => {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === false) continue;
    searchParams.set(key, value === true ? "1" : value);
  }

  const query = searchParams.toString();
  return query ? `/moderation?${query}` : "/moderation";
};

export default async function ModerationPage({
  searchParams,
}: ModerationPageProps) {
  await requireCurrentUser("/moderation");
  const user = await getCurrentUser();

  if (!isModeratorUser(user)) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const { reports, filters, counts } = await api.report.listForModeration({
    status: getSearchParamValue(resolvedSearchParams, "status"),
    targetType: getSearchParamValue(resolvedSearchParams, "targetType"),
    safety: getSearchParamValue(resolvedSearchParams, "safety"),
    sort: getSearchParamValue(resolvedSearchParams, "sort"),
  });
  const activeFilterChips: FilterChip[] = [
    {
      label: "Статус",
      value: getOptionLabel(statusOptions, filters.status),
    },
    ...(filters.targetType
      ? [
          {
            label: "Тип",
            value: getOptionLabel(targetTypeOptions, filters.targetType),
          },
        ]
      : []),
    ...(filters.safety
      ? [
          {
            label: "Фокус",
            value: "Только потенциально опасные",
          },
        ]
      : []),
    ...(filters.sort === "createdAtAsc"
      ? [
          {
            label: "Сортировка",
            value: getOptionLabel(sortOptions, filters.sort),
          },
        ]
      : []),
  ];
  const quickLinkBase = {
    targetType: filters.targetType,
    safety: filters.safety,
    sort: filters.sort,
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Модерация
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Жалобы на посты, комментарии, объекты, впечатления, логистику и
              сообщения в чатах.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {statusOptions.map((option) => (
              <Link
                key={option.value}
                href={buildModerationHref({
                  ...quickLinkBase,
                  status: option.value,
                })}
                className={`border px-4 py-2 text-sm hover:border-zinc-950 ${
                  filters.status === option.value
                    ? "border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-800"
                    : "border-zinc-300 text-zinc-800"
                }`}
              >
                {option.label} ({getStatusCount(counts, option.value)})
              </Link>
            ))}
          </div>
        </div>

        <section className="mb-6 border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm leading-6 text-amber-900">
            Особое внимание: не допускайте публикации точных координат, способов
            доступа, точек крепления, технических схем и инструкций для
            самостоятельных прыжков.
          </p>
        </section>

        <form
          action="/moderation"
          method="get"
          className="mb-6 border border-zinc-200 bg-white p-5"
        >
          <div className="grid gap-4 md:grid-cols-4">
            <div className="grid gap-2">
              <label
                htmlFor="status"
                className="text-sm font-medium text-zinc-950"
              >
                Статус
              </label>
              <select
                id="status"
                name="status"
                defaultValue={filters.status}
                className="border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label
                htmlFor="targetType"
                className="text-sm font-medium text-zinc-950"
              >
                Тип жалобы
              </label>
              <select
                id="targetType"
                name="targetType"
                defaultValue={filters.targetType}
                className="border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
              >
                <option value="">Все типы</option>
                {targetTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label
                htmlFor="sort"
                className="text-sm font-medium text-zinc-950"
              >
                Сортировка
              </label>
              <select
                id="sort"
                name="sort"
                defaultValue={filters.sort}
                className="border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-end gap-2 text-sm font-medium text-zinc-950">
              <input
                type="checkbox"
                name="safety"
                value="1"
                defaultChecked={filters.safety}
                className="mb-2 size-4 border-zinc-300 text-zinc-950"
              />
              <span className="pb-1">Только потенциально опасные</span>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-800"
            >
              Применить фильтры
            </button>
            <Link
              href="/moderation"
              className="text-sm text-zinc-600 hover:text-zinc-950"
            >
              Сбросить всё
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-xs text-zinc-500">
            <span>Открытые: {counts.open}</span>
            <span>Рассмотренные: {counts.reviewed}</span>
            <span>Решённые: {counts.resolved}</span>
            <span>Отклонённые: {counts.dismissed}</span>
            <span>Все: {counts.all}</span>
          </div>
        </form>

        <FilterSummary
          chips={activeFilterChips}
          resetHref="/moderation"
          resultCount={reports.length}
          resultLabel="Найдено жалоб"
        />

        {reports.length > 0 ? (
          <div className="grid gap-4">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                showActions={report.status === ReportStatus.OPEN}
              />
            ))}
          </div>
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Жалоб по выбранным фильтрам нет.
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Попробуйте изменить фильтры или сбросить их.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

const getStatusCount = (
  counts: {
    open: number;
    reviewed: number;
    resolved: number;
    dismissed: number;
    all: number;
  },
  status: string,
) => {
  if (status === "OPEN") return counts.open;
  if (status === "REVIEWED") return counts.reviewed;
  if (status === "RESOLVED") return counts.resolved;
  if (status === "DISMISSED") return counts.dismissed;

  return counts.all;
};
