import { notFound } from "next/navigation";

import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { EventEditForm } from "./event-edit-form";
import { EventStatusManagement } from "./event-status-management";

type EditEventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { slug } = await params;
  await requireCurrentUser(`/events/${slug}/edit`);

  const event = await api.event.getForEdit(slug).catch(() => null);
  const objects = await api.object.listPublic();

  if (!event) {
    notFound();
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Редактировать мероприятие
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Изменение slug и заявки пока не реализованы.
          </p>
        </div>

        <EventStatusManagement
          currentStatus={event.status}
          eventSlug={event.slug}
        />
        <EventEditForm event={event} objects={objects} />
      </div>
    </main>
  );
}
