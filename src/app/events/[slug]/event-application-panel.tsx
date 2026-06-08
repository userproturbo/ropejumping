"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { getApplicationStatusLabel } from "@/lib/display";
import { api, type RouterOutputs } from "@/trpc/react";

type EventApplication = RouterOutputs["application"]["getMineForEvent"];

type EventApplicationPanelProps = {
  application: EventApplication;
  canApply: boolean;
  eventSlug: string;
  hasProfile: boolean;
};

export function EventApplicationPanel({
  application,
  canApply,
  eventSlug,
  hasProfile,
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
    const statusHelp = getApplicationStatusHelp(application.status);

    return (
      <div className="mt-4 space-y-4">
        <div className="border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4">
          <h3 className="text-lg font-semibold text-[#e9eddc]">Ваша заявка</h3>
          <dl className="mt-3 grid gap-3 text-sm text-[#d7dcc5] sm:grid-cols-2">
            <div>
              <dt className="font-medium text-[#c7d988]">Статус заявки</dt>
              <dd className="mt-1">
                {getOwnApplicationStatusLabel(application.status)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[#c7d988]">Отправлена</dt>
              <dd className="mt-1">
                {formatApplicationDate(application.createdAt)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-[#aab497]">{statusHelp}</p>
          {application.message ? (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-[#c7d988]">
                Ваше сообщение
              </h4>
              <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-[#d7dcc5]">
                {application.message}
              </p>
            </div>
          ) : null}
          {application.organizerNote ? (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-[#c7d988]">
                Заметка организатора
              </h4>
              <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-[#d7dcc5]">
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
            className="border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988] disabled:cursor-not-allowed disabled:text-[#aab497]"
          >
            {cancel.isPending ? "Отмена..." : "Отменить заявку"}
          </button>
        ) : null}

        {cancel.error ? (
          <p className="text-sm text-red-300">{cancel.error.message}</p>
        ) : null}
      </div>
    );
  }

  if (!canApply) {
    return (
      <p className="mt-2 text-sm text-[#d7dcc5]">
        Подача заявок на это мероприятие сейчас недоступна.
      </p>
    );
  }

  if (!hasProfile) {
    return (
      <div className="mt-4 space-y-4">
        <p className="text-sm leading-6 text-[#d7dcc5]">
          Перед подачей заявки заполните профиль. Это поможет организатору
          понять ваш опыт.
        </p>
        <Link
          href="/profile/edit"
          className="inline-flex border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
        >
          Заполнить профиль
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleApply} className="mt-4 space-y-4">
      <div className="grid gap-2">
        <label htmlFor="message" className="text-sm font-medium text-[#c7d988]">
          Сообщение организатору
        </label>
        <textarea
          id="message"
          name="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={1000}
          rows={5}
          className="resize-y border border-[rgba(199,217,136,0.3)] bg-[#151a12] px-3 py-2 text-[#e9eddc] outline-none focus:border-[rgba(199,217,136,0.65)]"
        />
      </div>

      {submitApplication.error ? (
        <p className="text-sm text-red-300">
          {submitApplication.error.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitApplication.isPending}
        className="border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988] disabled:cursor-not-allowed disabled:text-[#aab497]"
      >
        {submitApplication.isPending ? "Отправка..." : "Подать заявку"}
      </button>
    </form>
  );
}

const getApplicationStatusHelp = (
  status: NonNullable<EventApplication>["status"],
) => {
  if (status === "PENDING") return "Организатор ещё не рассмотрел вашу заявку.";
  if (status === "ACCEPTED") {
    return "Ваша заявка принята. Вам доступен чат мероприятия и блок логистики.";
  }
  if (status === "REJECTED") return "Заявка отклонена.";
  if (status === "CANCELLED_BY_USER") return "Вы отменили заявку.";
  if (status === "CONFIRMED_PARTICIPATION") {
    return "Организатор подтвердил ваше участие.";
  }

  return "Организатор отметил, что вы не явились.";
};

const getOwnApplicationStatusLabel = (
  status: NonNullable<EventApplication>["status"],
) => {
  if (status === "CANCELLED_BY_USER") return "Отменена вами";

  return getApplicationStatusLabel(status);
};

const formatApplicationDate = (date: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
