import { notFound } from "next/navigation";

import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { EventCrewManagement } from "./event-crew-management";

type EventCrewPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function EventCrewPage({ params }: EventCrewPageProps) {
  const { slug } = await params;
  await requireCurrentUser(`/events/${slug}/crew`);

  const data = await api.event.getCrewManagement(slug).catch(() => null);

  if (!data) {
    notFound();
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Состав мероприятия
          </h1>
          <p className="mt-2 text-sm text-zinc-600">{data.event.title}</p>
        </div>

        <EventCrewManagement data={data} />
      </div>
    </main>
  );
}
