"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { api, type RouterOutputs } from "@/trpc/react";

type Notification = RouterOutputs["notification"]["listMine"][number];

type NotificationsListProps = {
  notifications: Notification[];
};

export function NotificationsList({ notifications }: NotificationsListProps) {
  const router = useRouter();
  const markRead = api.notification.markRead.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });
  const markAllRead = api.notification.markAllRead.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });
  const hasUnread = notifications.some((notification) => !notification.readAt);
  const error = markRead.error ?? markAllRead.error;

  if (notifications.length === 0) {
    return (
      <section className="border border-zinc-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-zinc-950">
          Уведомлений пока нет
        </h2>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      {hasUnread ? (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            {markAllRead.isPending
              ? "Сохранение..."
              : "Отметить все прочитанными"}
          </button>
        </div>
      ) : null}

      {notifications.map((notification) => {
        const isUnread = !notification.readAt;

        return (
          <article
            key={notification.id}
            className={
              isUnread
                ? "border border-zinc-300 bg-white p-5"
                : "border border-zinc-200 bg-white p-5"
            }
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-950">
                  {notification.title}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {formatNotificationDate(notification.createdAt)}
                </p>
              </div>
              {isUnread ? (
                <span className="text-xs font-medium text-zinc-500">
                  Новое
                </span>
              ) : null}
            </div>

            {notification.body ? (
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                {notification.body}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3">
              {notification.href ? (
                <Link
                  href={notification.href}
                  className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
                >
                  Открыть
                </Link>
              ) : null}
              {isUnread ? (
                <button
                  type="button"
                  disabled={markRead.isPending}
                  onClick={() =>
                    markRead.mutate({
                      notificationId: notification.id,
                    })
                  }
                  className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
                >
                  {markRead.isPending
                    ? "Сохранение..."
                    : "Отметить прочитанным"}
                </button>
              ) : null}
            </div>
          </article>
        );
      })}

      {error ? <p className="text-sm text-red-700">{error.message}</p> : null}
    </div>
  );
}

const formatNotificationDate = (date: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
