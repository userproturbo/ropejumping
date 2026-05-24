import { notFound } from "next/navigation";

import { requireCurrentUser, getCurrentUser } from "@/server/auth/session";
import { isModeratorUser } from "@/server/moderation/permissions";
import { api } from "@/trpc/server";

import { RadioAdminPanel } from "./radio-admin-panel";

export default async function RadioAdminPage() {
  await requireCurrentUser("/admin/radio");
  const user = await getCurrentUser();

  if (!isModeratorUser(user)) {
    notFound();
  }

  const tracks = await api.radio.listForAdmin();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Радио
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Управление треками сайта по настроению.
          </p>
        </div>

        <RadioAdminPanel initialTracks={tracks} />
      </div>
    </main>
  );
}
