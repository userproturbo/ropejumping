"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { TeamRole } from "@/generated/prisma/enums";
import { getTeamRoleLabel } from "@/lib/display";
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
  const leaveTeam = api.team.leaveMine.useMutation({
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
      <section className="mt-6 border border-[rgba(199,217,136,0.25)] bg-[#10150e] p-4 text-[#d7dcc5] sm:p-6">
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(`/teams/${teamSlug}`)}`}
          className="inline-flex border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
        >
          Войдите, чтобы подать заявку в команду
        </Link>
      </section>
    );
  }

  if (!state?.hasProfile) {
    return (
      <section className="mt-6 border border-[rgba(199,217,136,0.25)] bg-[#10150e] p-4 text-[#d7dcc5] sm:p-6">
        <p className="text-sm text-[#d7dcc5]">
          Перед подачей заявки заполните профиль.
        </p>
        <Link
          href="/profile/edit"
          className="mt-4 inline-flex border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
        >
          Заполнить профиль
        </Link>
      </section>
    );
  }

  if (state.membership) {
    const isOwner = state.membership.role === TeamRole.OWNER;

    return (
      <section className="mt-6 border border-[rgba(199,217,136,0.25)] bg-[#10150e] p-4 text-[#d7dcc5] sm:p-6">
        <p className="text-sm text-[#d7dcc5]">
          Вы уже состоите в этой команде.
        </p>
        <p className="mt-2 text-sm text-[#aab497]">
          Ваша роль: {getTeamRoleLabel(state.membership.role)}
        </p>

        {isOwner ? (
          <p className="mt-4 text-sm text-[#aab497]">
            Владелец не может выйти из команды. Сначала передайте владение
            другому участнику.
          </p>
        ) : (
          <button
            type="button"
            disabled={leaveTeam.isPending}
            onClick={() => {
              if (!window.confirm("Вы уверены, что хотите выйти из команды?")) {
                return;
              }

              leaveTeam.mutate({ teamSlug });
            }}
            className="mt-4 border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988] disabled:cursor-not-allowed disabled:text-[#aab497]"
          >
            {leaveTeam.isPending ? "Выход..." : "Выйти из команды"}
          </button>
        )}

        {leaveTeam.error ? (
          <p className="mt-3 text-sm text-red-300">{leaveTeam.error.message}</p>
        ) : null}
      </section>
    );
  }

  if (state.pendingJoinRequest) {
    return (
      <section className="mt-6 border border-[rgba(199,217,136,0.25)] bg-[#10150e] p-4 text-[#d7dcc5] sm:p-6">
        <p className="text-sm text-[#d7dcc5]">Заявка отправлена.</p>
        <button
          type="button"
          disabled={cancelRequest.isPending}
          onClick={() =>
            cancelRequest.mutate({
              requestId: state.pendingJoinRequest?.id ?? "",
            })
          }
          className="mt-4 border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988] disabled:cursor-not-allowed disabled:text-[#aab497]"
        >
          {cancelRequest.isPending ? "Отмена..." : "Отменить заявку"}
        </button>
        {cancelRequest.error ? (
          <p className="mt-3 text-sm text-red-300">
            {cancelRequest.error.message}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="mt-6 border border-[rgba(199,217,136,0.25)] bg-[#10150e] p-4 text-[#d7dcc5] sm:p-6">
      <h2 className="text-xl font-semibold text-[#e9eddc]">
        Подать заявку в команду
      </h2>
      <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
        <div className="grid gap-2">
          <label
            htmlFor="teamJoinRequestMessage"
            className="text-sm font-medium text-[#c7d988]"
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
            className="resize-y border border-[rgba(199,217,136,0.3)] bg-[#151a12] px-3 py-2 text-[#e9eddc] outline-none focus:border-[rgba(199,217,136,0.65)]"
          />
        </div>

        {createRequest.error ? (
          <p className="text-sm text-red-300">{createRequest.error.message}</p>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={createRequest.isPending}
            className="border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988] disabled:cursor-not-allowed disabled:text-[#aab497]"
          >
            {createRequest.isPending
              ? "Отправка..."
              : "Подать заявку в команду"}
          </button>
        </div>
      </form>
    </section>
  );
}
