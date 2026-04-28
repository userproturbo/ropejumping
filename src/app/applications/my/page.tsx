import Link from "next/link";

import { getApplicationStatusLabel } from "@/lib/display";
import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { formatEventDateRange } from "../../events/_components/date-format";

export default async function MyApplicationsPage() {
  await requireCurrentUser("/applications/my");

  const applications = await api.application.getMine();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Мои заявки
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Заявки, которые вы отправили на мероприятия.
          </p>
        </div>

        {applications.length > 0 ? (
          <div className="grid gap-4">
            {applications.map((application) => (
              <section
                key={application.id}
                className="border border-zinc-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-950">
                      <Link
                        href={`/events/${application.event.slug}`}
                        className="hover:text-zinc-600"
                      >
                        {application.event.title}
                      </Link>
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      {formatEventDateRange(
                        application.event.startsAt,
                        application.event.endsAt,
                      )}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Команда: {application.event.team.name}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-zinc-500">
                    {getApplicationStatusLabel(application.status)}
                  </span>
                </div>

                <Link
                  href={`/events/${application.event.slug}`}
                  className="mt-4 inline-flex text-sm text-zinc-700 hover:text-zinc-950"
                >
                  Открыть мероприятие
                </Link>
              </section>
            ))}
          </div>
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Заявок пока нет
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Подайте заявку на открытое мероприятие, чтобы она появилась здесь.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
