"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { EventStatus } from "@/generated/prisma/enums";
import { getEventStatusLabel } from "@/lib/display";
import { api } from "@/trpc/react";

const manuallySettableStatuses: EventStatus[] = [
  EventStatus.PUBLISHED,
  EventStatus.APPLICATIONS_OPEN,
  EventStatus.FULL,
  EventStatus.APPLICATIONS_CLOSED,
  EventStatus.POSTPONED,
  EventStatus.CANCELLED,
  EventStatus.ARCHIVED,
];

type EventStatusManagementProps = {
  currentStatus: EventStatus;
  eventSlug: string;
};

export function EventStatusManagement({
  currentStatus,
  eventSlug,
}: EventStatusManagementProps) {
  const router = useRouter();
  const [status, setStatus] = useState<EventStatus>(
    manuallySettableStatuses.includes(currentStatus)
      ? currentStatus
      : EventStatus.PUBLISHED,
  );
  const [saved, setSaved] = useState(false);
  const isCompleted = currentStatus === EventStatus.COMPLETED;

  const updateStatus = api.event.updateStatus.useMutation({
    onSuccess: () => {
      setSaved(true);
      router.refresh();
    },
  });

  return (
    <section className="mb-6 border border-zinc-200 bg-white p-6">
      <h2 className="text-xl font-semibold text-zinc-950">
        Статус мероприятия
      </h2>
      <p className="mt-2 text-sm text-zinc-600">
        Текущий статус: {getEventStatusLabel(currentStatus)}
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="grid gap-2">
          <label
            htmlFor="eventStatus"
            className="text-sm font-medium text-zinc-950"
          >
            Новый статус
          </label>
          <select
            id="eventStatus"
            name="eventStatus"
            value={status}
            onChange={(event) => {
              setSaved(false);
              setStatus(event.target.value as EventStatus);
            }}
            disabled={isCompleted || updateStatus.isPending}
            className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
          >
            {manuallySettableStatuses.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {getEventStatusLabel(statusOption)}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={isCompleted || updateStatus.isPending}
          onClick={() => {
            setSaved(false);
            updateStatus.mutate({
              slug: eventSlug,
              status,
            });
          }}
          className="bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {updateStatus.isPending ? "Сохранение..." : "Сохранить статус"}
        </button>
      </div>

      {isCompleted ? (
        <p className="mt-3 text-sm text-zinc-600">
          Завершённое мероприятие нельзя изменить через управление статусом.
        </p>
      ) : null}
      {updateStatus.error ? (
        <p className="mt-3 text-sm text-red-700">
          {updateStatus.error.message}
        </p>
      ) : null}
      {saved ? (
        <p className="mt-3 text-sm text-emerald-700">Статус сохранён.</p>
      ) : null}
    </section>
  );
}
