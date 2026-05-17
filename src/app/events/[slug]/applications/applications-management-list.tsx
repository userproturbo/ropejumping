"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getApplicationStatusLabel } from "@/lib/display";
import { api, type RouterOutputs } from "@/trpc/react";

type ManagedApplication =
  RouterOutputs["application"]["getForEventManagement"]["applications"][number];

type ApplicationsManagementListProps = {
  applications: ManagedApplication[];
};

export function ApplicationsManagementList({
  applications,
}: ApplicationsManagementListProps) {
  if (applications.length === 0) {
    return (
      <section className="border border-zinc-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-zinc-950">Заявок пока нет</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Заявки появятся здесь после отправки участниками.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      {applications.map((application) => (
        <ApplicationCard key={application.id} application={application} />
      ))}
    </div>
  );
}

function ApplicationCard({ application }: { application: ManagedApplication }) {
  const router = useRouter();
  const [organizerNote, setOrganizerNote] = useState(
    application.organizerNote ?? "",
  );

  const accept = api.application.accept.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });
  const reject = api.application.reject.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });
  const confirmParticipation = api.application.confirmParticipation.useMutation(
    {
      onSuccess: () => {
        router.refresh();
      },
    },
  );
  const markNoShow = api.application.markNoShow.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });
  const updateOrganizerNote = api.application.updateOrganizerNote.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });

  const profile = application.user.profile;
  const applicantName =
    profile?.displayName ??
    profile?.username ??
    application.user.name ??
    "Участник без имени";
  const isPending =
    accept.isPending ||
    reject.isPending ||
    confirmParticipation.isPending ||
    markNoShow.isPending ||
    updateOrganizerNote.isPending;
  const error =
    accept.error ??
    reject.error ??
    confirmParticipation.error ??
    markNoShow.error ??
    updateOrganizerNote.error;
  const canAccept = application.status === "PENDING";
  const canReject =
    application.status === "PENDING" || application.status === "ACCEPTED";
  const canConfirmParticipation = application.status === "ACCEPTED";
  const canMarkNoShow =
    application.status === "ACCEPTED" ||
    application.status === "CONFIRMED_PARTICIPATION";

  return (
    <section className="border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-950">
            {applicantName}
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
        <span className="text-xs font-medium text-zinc-500">
          {getApplicationStatusLabel(application.status)}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 text-sm text-zinc-600 sm:grid-cols-2">
        <div>
          <dt className="font-medium text-zinc-950">Отправлена</dt>
          <dd className="mt-1">
            {formatApplicationDate(application.createdAt)}
          </dd>
        </div>
        {profile?.selfReportedJumpCount !== null &&
        profile?.selfReportedJumpCount !== undefined ? (
          <div>
            <dt className="font-medium text-zinc-950">Прыжков</dt>
            <dd className="mt-1">{profile.selfReportedJumpCount}</dd>
          </div>
        ) : null}
        {profile?.selfReportedMaxHeightMeters !== null &&
        profile?.selfReportedMaxHeightMeters !== undefined ? (
          <div>
            <dt className="font-medium text-zinc-950">Максимальная высота</dt>
            <dd className="mt-1">{profile.selfReportedMaxHeightMeters} м</dd>
          </div>
        ) : null}
      </dl>

      {profile?.selfReportedExperience ? (
        <ExperienceBlock
          title="Опыт участника"
          body={profile.selfReportedExperience}
        />
      ) : null}

      {profile?.externalExperience ? (
        <ExperienceBlock
          title="Опыт вне платформы"
          body={profile.externalExperience}
        />
      ) : null}

      <div className="mt-5">
        <h3 className="text-sm font-medium text-zinc-950">Сообщение</h3>
        <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
          {application.message ?? "Сообщение не добавлено."}
        </p>
      </div>

      {application.organizerNote ? (
        <div className="mt-5">
          <h3 className="text-sm font-medium text-zinc-950">
            Текущая заметка организатора
          </h3>
          <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
            {application.organizerNote}
          </p>
        </div>
      ) : null}

      <div className="mt-5 grid gap-2">
        <label
          htmlFor={`organizerNote-${application.id}`}
          className="text-sm font-medium text-zinc-950"
        >
          Комментарий организатора
        </label>
        <textarea
          id={`organizerNote-${application.id}`}
          name={`organizerNote-${application.id}`}
          value={organizerNote}
          onChange={(event) => setOrganizerNote(event.target.value)}
          maxLength={1000}
          rows={3}
          className="resize-y border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
        />
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-700">{error.message}</p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        {canAccept ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              accept.mutate({
                applicationId: application.id,
                organizerNote,
              })
            }
            className="bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {accept.isPending ? "Принятие..." : "Принять"}
          </button>
        ) : null}
        {canReject ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              reject.mutate({
                applicationId: application.id,
                organizerNote,
              })
            }
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            {reject.isPending ? "Отклонение..." : "Отклонить"}
          </button>
        ) : null}
        {canConfirmParticipation ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              confirmParticipation.mutate({
                applicationId: application.id,
              })
            }
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            Подтвердить участие
          </button>
        ) : null}
        {canMarkNoShow ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              markNoShow.mutate({
                applicationId: application.id,
              })
            }
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            Не явился
          </button>
        ) : null}
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            updateOrganizerNote.mutate({
              applicationId: application.id,
              organizerNote,
            })
          }
          className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
        >
          {updateOrganizerNote.isPending
            ? "Сохранение..."
            : "Сохранить заметку"}
        </button>
      </div>
    </section>
  );
}

function ExperienceBlock({ body, title }: { body: string; title: string }) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-medium text-zinc-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
        {body}
      </p>
    </div>
  );
}

const formatApplicationDate = (date: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
