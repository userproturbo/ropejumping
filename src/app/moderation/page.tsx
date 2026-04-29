import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentUser, requireCurrentUser } from "@/server/auth/session";
import { isModeratorUser } from "@/server/moderation/permissions";
import { api } from "@/trpc/server";

import { ReportCard } from "./_components/report-card";

export default async function ModerationPage() {
  await requireCurrentUser("/moderation");
  const user = await getCurrentUser();

  if (!isModeratorUser(user)) {
    notFound();
  }

  const reports = await api.report.listOpen();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Модерация
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Открытые жалобы на посты и комментарии.
            </p>
          </div>
          <Link
            href="/moderation/reviewed"
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
          >
            Рассмотренные
          </Link>
        </div>

        <section className="mb-6 border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm leading-6 text-amber-900">
            Особое внимание: не допускайте публикации точных координат,
            способов доступа, точек крепления, технических схем и инструкций
            для самостоятельных прыжков.
          </p>
        </section>

        {reports.length > 0 ? (
          <div className="grid gap-4">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} showActions />
            ))}
          </div>
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Открытых жалоб нет
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Новые жалобы появятся здесь после отправки пользователями.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
