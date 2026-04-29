"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import type { ReportTargetType } from "@/lib/validation/report";
import { api } from "@/trpc/react";

type ReportCreateFormProps = {
  targetId: string;
  targetType: ReportTargetType;
};

export function ReportCreateForm({
  targetId,
  targetType,
}: ReportCreateFormProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [sent, setSent] = useState(false);

  const createReport = api.report.create.useMutation({
    onSuccess: () => {
      setSent(true);
      setReason("");
      setDetails("");
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(false);

    createReport.mutate({
      targetType,
      targetId,
      reason,
      details,
    });
  };

  if (sent) {
    return (
      <section className="border border-zinc-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-zinc-950">
          Жалоба отправлена
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Жалоба отправлена. Спасибо, что помогаете поддерживать порядок.
        </p>
        <Link
          href={targetType === "POST" ? `/posts/${targetId}` : "/feed"}
          className="mt-5 inline-flex border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
        >
          Вернуться
        </Link>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 border border-zinc-200 bg-white p-6"
    >
      <div className="grid gap-2">
        <label htmlFor="reason" className="text-sm font-medium text-zinc-950">
          Причина
        </label>
        <input
          id="reason"
          name="reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
          minLength={3}
          maxLength={120}
          className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="details" className="text-sm font-medium text-zinc-950">
          Подробности
        </label>
        <textarea
          id="details"
          name="details"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          maxLength={1000}
          rows={6}
          className="resize-y border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
        />
      </div>

      {createReport.error ? (
        <p className="text-sm text-red-700">{createReport.error.message}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={createReport.isPending}
          className="bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {createReport.isPending ? "Отправка..." : "Отправить жалобу"}
        </button>
        <Link href="/feed" className="text-sm text-zinc-600 hover:text-zinc-950">
          Отмена
        </Link>
      </div>
    </form>
  );
}
