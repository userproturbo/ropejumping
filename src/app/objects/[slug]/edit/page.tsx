import { notFound } from "next/navigation";

import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { ObjectForm } from "../../_components/object-form";

type EditObjectPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function EditObjectPage({ params }: EditObjectPageProps) {
  const { slug } = await params;
  await requireCurrentUser(`/objects/${slug}/edit`);

  const object = await api.object.getForEdit(slug).catch(() => null);

  if (!object) {
    notFound();
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Редактировать объект
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Slug объекта нельзя изменить после создания.
          </p>
        </div>

        <ObjectForm object={object} />
      </div>
    </main>
  );
}
