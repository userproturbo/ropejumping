import { notFound } from "next/navigation";

import { getEventStatusLabel } from "@/lib/display";
import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { formatEventDateRange } from "../../_components/date-format";
import { EventCompletionForm } from "./event-completion-form";

type CompleteEventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CompleteEventPage({
  params,
}: CompleteEventPageProps) {
  const { slug } = await params;
  await requireCurrentUser(`/events/${slug}/complete`);

  const event = await api.event.getForCompletion(slug).catch(() => null);

  if (!event) {
    notFound();
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Завершить мероприятие
          </h1>
          <p className="mt-2 text-sm text-zinc-600">{event.title}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-500">
            <span>{formatEventDateRange(event.startsAt, event.endsAt)}</span>
            <span>{getEventStatusLabel(event.status)}</span>
          </div>
        </div>

        <EventCompletionForm event={event} />
      </div>
    </main>
  );
}
