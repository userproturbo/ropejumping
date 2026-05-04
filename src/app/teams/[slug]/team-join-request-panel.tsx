"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { api, type RouterOutputs } from "@/trpc/react";

type JoinRequestState = RouterOutputs["teamJoinRequest"]["getMineForTeam"];

type TeamJoinRequestPanelProps = {
  teamSlug: string;
  isAuthenticated: boolean;
  state: JoinRequestState | null;
};

export function TeamJoinRequestPanel({
  teamSlug,
  isAuthenticated,
  state,
}: TeamJoinRequestPanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  const createRequest = api.teamJoinRequest.create.useMutation({
    onSuccess: () => {
      setMessage("");
      router.refresh();
    },
  });
  const cancelRequest = api.teamJoinRequest.cancelMine.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    createRequest.mutate({
      teamSlug,
      message,
    });
  };

  if (!isAuthenticated) {
    return (
      <section className="mt-6 border border-zinc-200 bg-white p-6">
        <Link
          href={`/api/auth/signin?callbackUrl=${encodeURIComponent(`/teams/${teamSlug}`)}`}
          className="inline-flex bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-800"
        >
          Войдите, чтобы подать заявку в команду
        </Link>
      </section>
    );
  }

  if (!state?.hasProfile) {
    return (
      <section className="mt-6 border border-zinc-200 bg-white p-6">
        <p className="text-sm text-zinc-700">
          Перед подачей заявки заполните профиль.
        </p>
        <Link
          href="/profile/edit"
          className="mt-4 inline-flex border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
        >
          Заполнить профиль
        </Link>
      </section>
    );
  }

  if (state.membership) {
    return (
      <section className="mt-6 border border-zinc-200 bg-white p-6">
        <p className="text-sm text-zinc-700">
          Вы уже состоите в этой команде.
        </p>
      </section>
    );
  }

  if (state.pendingJoinRequest) {
    return (
      <section className="mt-6 border border-zinc-200 bg-white p-6">
        <p className="text-sm text-zinc-700">Заявка отправлена.</p>
        <button
          type="button"
          disabled={cancelRequest.isPending}
          onClick={() =>
            cancelRequest.mutate({
              requestId: state.pendingJoinRequest?.id ?? "",
            })
          }
          className="mt-4 border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
        >
          {cancelRequest.isPending ? "Отмена..." : "Отменить заявку"}
        </button>
        {cancelRequest.error ? (
          <p className="mt-3 text-sm text-red-700">
            {cancelRequest.error.message}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="mt-6 border border-zinc-200 bg-white p-6">
      <h2 className="text-xl font-semibold text-zinc-950">
        Подать заявку в команду
      </h2>
      <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
        <div className="grid gap-2">
          <label
            htmlFor="teamJoinRequestMessage"
            className="text-sm font-medium text-zinc-950"
          >
            Сообщение
          </label>
          <textarea
            id="teamJoinRequestMessage"
            name="teamJoinRequestMessage"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={1000}
            rows={4}
            className="resize-y border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
          />
        </div>

        {createRequest.error ? (
          <p className="text-sm text-red-700">{createRequest.error.message}</p>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={createRequest.isPending}
            className="bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {createRequest.isPending ? "Отправка..." : "Подать заявку в команду"}
          </button>
        </div>
      </form>
    </section>
  );
}
