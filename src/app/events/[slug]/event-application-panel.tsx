"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { getApplicationStatusLabel } from "@/lib/display";
import { api, type RouterOutputs } from "@/trpc/react";

type EventApplication = RouterOutputs["application"]["getMineForEvent"];

type EventApplicationPanelProps = {
  application: EventApplication;
  canApply: boolean;
  eventSlug: string;
};

export function EventApplicationPanel({
  application,
  canApply,
  eventSlug,
}: EventApplicationPanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  const submitApplication = api.application.submit.useMutation({
    onSuccess: () => {
      setMessage("");
      router.refresh();
    },
  });

  const cancel = api.application.cancelMine.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });

  const handleApply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    submitApplication.mutate({
      eventSlug,
      message,
    });
  };

  if (application) {
    const canCancel =
      application.status === "PENDING" || application.status === "ACCEPTED";

    return (
      <div className="mt-4 space-y-4">
        <div className="border border-zinc-200 p-4">
          <p className="text-sm font-medium text-zinc-950">
            Статус заявки: {getApplicationStatusLabel(application.status)}
          </p>
          {application.message ? (
            <div className="mt-3">
              <h3 className="text-sm font-medium text-zinc-950">Сообщение</h3>
              <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
                {application.message}
              </p>
            </div>
          ) : null}
          {application.organizerNote ? (
            <div className="mt-3">
              <h3 className="text-sm font-medium text-zinc-950">
                Комментарий организатора
              </h3>
              <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
                {application.organizerNote}
              </p>
            </div>
          ) : null}
        </div>

        {canCancel ? (
          <button
            type="button"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate({ applicationId: application.id })}
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            {cancel.isPending ? "Отмена..." : "Отменить заявку"}
          </button>
        ) : null}

        {cancel.error ? (
          <p className="text-sm text-red-700">{cancel.error.message}</p>
        ) : null}
      </div>
    );
  }

  if (!canApply) {
    return (
      <p className="mt-2 text-sm text-zinc-600">
        Подача заявок на это мероприятие сейчас недоступна.
      </p>
    );
  }

  return (
    <form onSubmit={handleApply} className="mt-4 space-y-4">
      <div className="grid gap-2">
        <label htmlFor="message" className="text-sm font-medium text-zinc-950">
          Сообщение организатору
        </label>
        <textarea
          id="message"
          name="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={1000}
          rows={5}
          className="resize-y border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
        />
      </div>

      {submitApplication.error ? (
        <p className="text-sm text-red-700">
          {submitApplication.error.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitApplication.isPending}
        className="bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {submitApplication.isPending ? "Отправка..." : "Подать заявку"}
      </button>
    </form>
  );
}
