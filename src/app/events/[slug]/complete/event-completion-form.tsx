"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { api, type RouterOutputs } from "@/trpc/react";

type EventForCompletion = NonNullable<
  RouterOutputs["event"]["getForCompletion"]
>;
type AwardedBadges = RouterOutputs["event"]["complete"]["awardedBadges"];

type CompletionCandidate = {
  applicationMessage: string | null;
  city: string | null;
  displayName: string;
  externalExperience: string | null;
  userId: string;
  username: string | null;
};

type EventCompletionFormProps = {
  event: EventForCompletion;
};

export function EventCompletionForm({ event }: EventCompletionFormProps) {
  const router = useRouter();
  const candidates = useMemo(() => buildCandidates(event), [event]);
  const existingParticipantIds = useMemo(
    () => event.participations.map((participation) => participation.userId),
    [event.participations],
  );
  const [confirmedUserIds, setConfirmedUserIds] = useState<string[]>(
    existingParticipantIds,
  );
  const [awardedBadges, setAwardedBadges] = useState<AwardedBadges | null>(
    null,
  );

  const completeEvent = api.event.complete.useMutation({
    onSuccess: (result) => {
      setAwardedBadges(result.awardedBadges);
      router.refresh();
    },
  });

  const toggleConfirmedUser = (userId: string) => {
    setConfirmedUserIds((currentUserIds) =>
      currentUserIds.includes(userId)
        ? currentUserIds.filter((currentUserId) => currentUserId !== userId)
        : [...currentUserIds, userId],
    );
  };

  const handleSubmit = (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    setAwardedBadges(null);

    completeEvent.mutate({
      eventSlug: event.slug,
      confirmedUserIds,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 border border-zinc-200 bg-white p-6"
    >
      {candidates.length > 0 ? (
        <div className="grid gap-4">
          {candidates.map((candidate) => (
            <label
              key={candidate.userId}
              className="block border border-zinc-200 p-4"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={confirmedUserIds.includes(candidate.userId)}
                  onChange={() => toggleConfirmedUser(candidate.userId)}
                  className="mt-1"
                />
                <div className="min-w-0">
                  <p className="font-medium text-zinc-950">
                    {candidate.displayName}
                  </p>
                  {candidate.username ? (
                    <p className="mt-1 text-sm text-zinc-500">
                      @{candidate.username}
                    </p>
                  ) : null}
                  {candidate.city ? (
                    <p className="mt-1 text-sm text-zinc-500">
                      {candidate.city}
                    </p>
                  ) : null}
                  {candidate.externalExperience ? (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-zinc-950">
                        Опыт вне платформы
                      </h3>
                      <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
                        {candidate.externalExperience}
                      </p>
                    </div>
                  ) : null}
                  {candidate.applicationMessage ? (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-zinc-950">
                        Сообщение в заявке
                      </h3>
                      <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
                        {candidate.applicationMessage}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
              <span className="mt-3 inline-flex text-sm text-zinc-600">
                Участвовал
              </span>
            </label>
          ))}
        </div>
      ) : (
        <section className="border border-zinc-200 p-5">
          <h2 className="text-xl font-semibold text-zinc-950">
            Нет принятых заявок для подтверждения участия.
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Мероприятие можно завершить с нулём подтверждённых участников.
          </p>
        </section>
      )}

      {completeEvent.error ? (
        <p className="text-sm text-red-700">{completeEvent.error.message}</p>
      ) : null}

      {awardedBadges ? (
        <section className="border border-zinc-200 p-4">
          <h2 className="text-sm font-medium text-zinc-950">
            Результат пересчёта бейджей
          </h2>
          {awardedBadges.some((award) => award.badges.length > 0) ? (
            <div className="mt-3 grid gap-2 text-sm text-zinc-600">
              {awardedBadges.map((award) =>
                award.badges.length > 0 ? (
                  <p key={award.userId}>
                    Пользователь получил бейджи:{" "}
                    {award.badges
                      .map((userBadge) => userBadge.badge.name)
                      .join(", ")}
                  </p>
                ) : null,
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">
              Новых бейджей нет.
            </p>
          )}
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={completeEvent.isPending}
          className="bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {completeEvent.isPending ? "Завершение..." : "Завершить мероприятие"}
        </button>
        <Link
          href={`/events/${event.slug}`}
          className="text-sm text-zinc-600 hover:text-zinc-950"
        >
          Отмена
        </Link>
      </div>
    </form>
  );
}

const buildCandidates = (event: EventForCompletion) => {
  const candidates = new Map<string, CompletionCandidate>();

  event.applications.forEach((application) => {
    const profile = application.user.profile;
    candidates.set(application.userId, {
      applicationMessage: application.message,
      city: profile?.city ?? null,
      displayName:
        profile?.displayName ??
        profile?.username ??
        application.user.name ??
        application.user.email ??
        "Участник без имени",
      externalExperience: profile?.externalExperience ?? null,
      userId: application.userId,
      username: profile?.username ?? null,
    });
  });

  event.participations.forEach((participation) => {
    const profile = participation.user.profile;
    if (!candidates.has(participation.userId)) {
      candidates.set(participation.userId, {
        applicationMessage: null,
        city: profile?.city ?? null,
        displayName:
          profile?.displayName ??
          profile?.username ??
          participation.user.name ??
          participation.user.email ??
          "Участник без имени",
        externalExperience: profile?.externalExperience ?? null,
        userId: participation.userId,
        username: profile?.username ?? null,
      });
    }
  });

  return Array.from(candidates.values());
};
