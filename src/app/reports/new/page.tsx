import Link from "next/link";
import { notFound } from "next/navigation";

import { reportTargetTypeSchema } from "@/lib/validation/report";
import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { ReportCreateForm } from "./report-create-form";

type NewReportPageProps = {
  searchParams: Promise<{
    targetId?: string;
    targetType?: string;
  }>;
};

export default async function NewReportPage({
  searchParams,
}: NewReportPageProps) {
  await requireCurrentUser("/reports/new");

  const profile = await api.profile.getMine();
  const params = await searchParams;
  const parsedTargetType = reportTargetTypeSchema.safeParse(params.targetType);

  if (!parsedTargetType.success || !params.targetId) {
    notFound();
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Жалоба
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Отправьте жалобу на пост или комментарий.
          </p>
        </div>

        {profile ? (
          <ReportCreateForm
            targetId={params.targetId}
            targetType={parsedTargetType.data}
          />
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Заполните профиль
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Перед отправкой жалобы заполните профиль.
            </p>
            <Link
              href="/profile/edit"
              className="mt-5 inline-flex bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-800"
            >
              Заполнить профиль
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
