import Link from "next/link";
import { notFound } from "next/navigation";

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
];

const getSearchParamValue = (
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) => {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
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
  });

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Модерация
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Жалобы на посты, комментарии и объекты.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/moderation?status=OPEN"
              className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
            >
              Открытые
            </Link>
            <Link
              href="/moderation?status=REVIEWED"
              className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
            >
              Рассмотренные
            </Link>
          </div>
        </div>

        <section className="mb-6 border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm leading-6 text-amber-900">
            Особое внимание: не допускайте публикации точных координат,
            способов доступа, точек крепления, технических схем и инструкций
            для самостоятельных прыжков.
          </p>
        </section>

        <form
          action="/moderation"
          method="get"
          className="mb-6 border border-zinc-200 bg-white p-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
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
              Сбросить
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
              Жалоб по выбранным фильтрам нет
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Попробуйте изменить параметры фильтра или сбросить фильтры.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
