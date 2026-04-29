import Link from "next/link";

import { getObjectTypeLabel } from "@/lib/display";
import { api } from "@/trpc/server";

export default async function ObjectsPage() {
  const objects = await api.object.listPublic();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Объекты
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Публичный каталог объектов с безопасным общим описанием.
            </p>
          </div>
          <Link
            href="/objects/new"
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
          >
            Создать объект
          </Link>
        </div>

        {objects.length > 0 ? (
          <div className="grid gap-4">
            {objects.map((object) => (
              <Link
                key={object.id}
                href={`/objects/${object.slug}`}
                className="block border border-zinc-200 bg-white p-5 hover:border-zinc-950"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-950">
                      {object.name}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      {getObjectTypeLabel(object.type)}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-zinc-500">
                    Мероприятий: {object.events.length}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-600">
                  {object.heightMeters ? (
                    <span>{object.heightMeters} м</span>
                  ) : null}
                  {object.region ? <span>{object.region}</span> : null}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Объектов пока нет
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Объекты появятся здесь после создания участниками.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
