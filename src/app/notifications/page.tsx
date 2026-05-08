import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { NotificationsList } from "./notifications-list";

export default async function NotificationsPage() {
  await requireCurrentUser("/notifications");

  const notifications = await api.notification.listMine();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Уведомления
          </h1>
        </div>

        <NotificationsList notifications={notifications} />
      </div>
    </main>
  );
}
