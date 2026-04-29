import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentUser, requireCurrentUser } from "@/server/auth/session";
import { isModeratorUser } from "@/server/moderation/permissions";
import { api } from "@/trpc/server";

import { ReportCard } from "../_components/report-card";

export default async function ReviewedModerationPage() {
  await requireCurrentUser("/moderation/reviewed");
  const user = await getCurrentUser();

  if (!isModeratorUser(user)) {
    notFound();
  }

  const reports = await api.report.listReviewed();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Рассмотренные жалобы
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Закрытые и отклонённые жалобы.
            </p>
          </div>
          <Link
            href="/moderation"
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
          >
            Открытые
          </Link>
        </div>

        {reports.length > 0 ? (
          <div className="grid gap-4">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Рассмотренных жалоб нет
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Решённые и отклонённые жалобы появятся здесь.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
