import { notFound } from "next/navigation";

import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { ApplicationsManagementList } from "./applications-management-list";

type ApplicationsPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ApplicationsPage({
  params,
}: ApplicationsPageProps) {
  const { slug } = await params;
  await requireCurrentUser(`/events/${slug}/applications`);

  const data = await api.application
    .getForEventManagement(slug)
    .catch(() => null);

  if (!data) {
    notFound();
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Заявки
          </h1>
          <p className="mt-2 text-sm text-zinc-600">{data.event.title}</p>
        </div>

        <ApplicationsManagementList applications={data.applications} />
      </div>
    </main>
  );
}
