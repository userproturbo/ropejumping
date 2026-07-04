"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { TeamInvitationStatus } from "@/generated/prisma/enums";
import {
  getTeamFunctionRoleLabel,
  getTeamInvitationStatusLabel,
  getTeamRoleLabel,
} from "@/lib/display";
import { api, type RouterOutputs } from "@/trpc/react";

type TeamInvitation = RouterOutputs["teamInvitation"]["getMine"][number];

type TeamInvitationsPanelProps = {
  invitations: TeamInvitation[];
};

export function TeamInvitationsPanel({
  invitations,
}: TeamInvitationsPanelProps) {
  return (
    <section className="mb-8 border border-zinc-200 bg-white p-6">
      <h2 className="text-xl font-semibold text-zinc-950">
        Приглашения в команды
      </h2>

      {invitations.length > 0 ? (
        <div className="mt-5 grid gap-4">
          {invitations.map((invitation) => (
            <TeamInvitationCard
              key={invitation.id}
              invitation={invitation}
            />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-zinc-600">
          Активных приглашений пока нет.
        </p>
      )}
    </section>
  );
}

function TeamInvitationCard({ invitation }: { invitation: TeamInvitation }) {
  const router = useRouter();
  const acceptInvitation = api.teamInvitation.acceptMine.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });
  const rejectInvitation = api.teamInvitation.rejectMine.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });
  const isPending = acceptInvitation.isPending || rejectInvitation.isPending;
  const error = acceptInvitation.error ?? rejectInvitation.error;
  const invitedByProfile = invitation.invitedBy?.profile;
  const invitedByName =
    invitedByProfile?.displayName ??
    invitedByProfile?.username ??
    invitation.invitedBy?.name;

  return (
    <article className="border border-zinc-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {invitation.team.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={invitation.team.logoUrl}
              alt=""
              className="h-12 w-12 aspect-square rounded-full border border-zinc-200 object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <h3 className="truncate font-medium text-zinc-950">
              <Link
                href={`/teams/${invitation.team.slug}`}
                className="hover:text-zinc-600"
              >
                {invitation.team.name}
              </Link>
            </h3>
            <div className="mt-1 flex flex-wrap gap-3 text-sm text-zinc-600">
              {invitation.team.region ? (
                <span>{invitation.team.region}</span>
              ) : null}
              <span>Роль: {getTeamRoleLabel(invitation.role)}</span>
            </div>
          </div>
        </div>
        <span className="text-xs font-medium text-zinc-500">
          {getTeamInvitationStatusLabel(invitation.status)}
        </span>
      </div>

      {invitation.functionRoles.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {invitation.functionRoles.map((functionRole) => (
            <span
              key={functionRole}
              className="border border-zinc-200 px-2 py-1 text-xs text-zinc-600"
            >
              {getTeamFunctionRoleLabel(functionRole)}
            </span>
          ))}
        </div>
      ) : null}

      {invitation.message ? (
        <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
          {invitation.message}
        </p>
      ) : null}

      {invitedByName ? (
        <p className="mt-3 text-sm text-zinc-500">
          Пригласил: {invitedByName}
        </p>
      ) : null}

      {invitation.status === TeamInvitationStatus.PENDING ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              acceptInvitation.mutate({
                invitationId: invitation.id,
              })
            }
            className="bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {acceptInvitation.isPending ? "Принятие..." : "Принять"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              rejectInvitation.mutate({
                invitationId: invitation.id,
              })
            }
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            {rejectInvitation.isPending ? "Отклонение..." : "Отклонить"}
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-700">{error.message}</p> : null}
    </article>
  );
}
