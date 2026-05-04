"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { TeamJoinRequestStatus } from "@/generated/prisma/enums";
import { getTeamJoinRequestStatusLabel } from "@/lib/display";
import { api, type RouterOutputs } from "@/trpc/react";

type TeamJoinRequestsData =
  RouterOutputs["teamJoinRequest"]["getForTeamManagement"];
type TeamJoinRequestForManagement =
  TeamJoinRequestsData["joinRequests"][number];

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

type TeamJoinRequestsManagementProps = {
  data: TeamJoinRequestsData;
};

export function TeamJoinRequestsManagement({
  data,
}: TeamJoinRequestsManagementProps) {
  if (data.joinRequests.length === 0) {
    return (
      <section className="border border-zinc-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-zinc-950">
          Заявок пока нет
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Новые заявки пользователей появятся здесь.
        </p>
        <Link
          href={`/teams/${data.team.slug}/settings`}
          className="mt-5 inline-flex text-sm text-zinc-600 hover:text-zinc-950"
        >
          Назад к настройкам
        </Link>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      {data.joinRequests.map((request) => (
        <TeamJoinRequestCard key={request.id} request={request} />
      ))}

      <div className="mt-2">
        <Link
          href={`/teams/${data.team.slug}/settings`}
          className="text-sm text-zinc-600 hover:text-zinc-950"
        >
          Назад к настройкам
        </Link>
      </div>
    </div>
  );
}

function TeamJoinRequestCard({
  request,
}: {
  request: TeamJoinRequestForManagement;
}) {
  const router = useRouter();
  const profile = request.user.profile;
  const displayName =
    profile?.displayName ??
    profile?.username ??
    request.user.name ??
    "Участник без имени";
  const avatarUrl = profile?.avatarUrl ?? request.user.image;
  const isPending = request.status === TeamJoinRequestStatus.PENDING;

  const accept = api.teamJoinRequest.accept.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });
  const reject = api.teamJoinRequest.reject.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });
  const isActionPending = accept.isPending || reject.isPending;

  return (
    <article className="border border-zinc-200 bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-12 w-12 border border-zinc-200 object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-zinc-950">
              {displayName}
            </h2>
            {profile?.username ? (
              <Link
                href={`/u/${profile.username}`}
                className="mt-1 block text-sm text-zinc-500 hover:text-zinc-950"
              >
                @{profile.username}
              </Link>
            ) : null}
            {profile?.city ? (
              <p className="mt-1 text-sm text-zinc-500">{profile.city}</p>
            ) : null}
          </div>
        </div>
        <span className="text-xs font-medium text-zinc-500">
          {getTeamJoinRequestStatusLabel(request.status)}
        </span>
      </div>

      <div className="mt-5 grid gap-4">
        <div>
          <h3 className="text-sm font-medium text-zinc-950">Заявка создана</h3>
          <p className="mt-1 text-sm text-zinc-600">
            {formatDate(request.createdAt)}
          </p>
        </div>

        {request.decidedAt ? (
          <div>
            <h3 className="text-sm font-medium text-zinc-950">Решение</h3>
            <p className="mt-1 text-sm text-zinc-600">
              {formatDate(request.decidedAt)}
            </p>
          </div>
        ) : null}

        {profile?.externalExperience ? (
          <div>
            <h3 className="text-sm font-medium text-zinc-950">
              Опыт вне платформы
            </h3>
            <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
              {profile.externalExperience}
            </p>
          </div>
        ) : null}

        <div>
          <h3 className="text-sm font-medium text-zinc-950">Сообщение</h3>
          <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
            {request.message ?? "Сообщение не добавлено."}
          </p>
        </div>
      </div>

      {accept.error ? (
        <p className="mt-3 text-sm text-red-700">{accept.error.message}</p>
      ) : null}
      {reject.error ? (
        <p className="mt-3 text-sm text-red-700">{reject.error.message}</p>
      ) : null}

      {isPending ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isActionPending}
            onClick={() =>
              accept.mutate({
                requestId: request.id,
              })
            }
            className="bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {accept.isPending ? "Принятие..." : "Принять"}
          </button>
          <button
            type="button"
            disabled={isActionPending}
            onClick={() =>
              reject.mutate({
                requestId: request.id,
              })
            }
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            {reject.isPending ? "Отклонение..." : "Отклонить"}
          </button>
        </div>
      ) : null}
    </article>
  );
}
