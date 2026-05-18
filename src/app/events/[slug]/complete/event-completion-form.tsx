"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { ApplicationStatus } from "@/generated/prisma/enums";
import { getApplicationStatusLabel } from "@/lib/display";
import { api, type RouterOutputs } from "@/trpc/react";

type EventForCompletion = NonNullable<
  RouterOutputs["event"]["getForCompletion"]
>;

type EventCompletionFormProps = {
  event: EventForCompletion;
};

export function EventCompletionForm({ event }: EventCompletionFormProps) {
  const router = useRouter();
  const initialConfirmedApplicationIds = useMemo(
    () =>
      event.applications
        .filter(
          (application) =>
            application.status === ApplicationStatus.CONFIRMED_PARTICIPATION,
        )
        .map((application) => application.id),
    [event.applications],
  );
  const [confirmedApplicationIds, setConfirmedApplicationIds] = useState<
    string[]
  >(initialConfirmedApplicationIds);
  const [markUnselectedAcceptedAsNoShow, setMarkUnselectedAcceptedAsNoShow] =
    useState(false);

  const completeEvent = api.event.complete.useMutation({
    onSuccess: () => {
      router.push(`/events/${event.slug}`);
      router.refresh();
    },
  });

  const toggleConfirmedApplication = (applicationId: string) => {
    setConfirmedApplicationIds((currentApplicationIds) =>
      currentApplicationIds.includes(applicationId)
        ? currentApplicationIds.filter(
            (currentApplicationId) => currentApplicationId !== applicationId,
          )
        : [...currentApplicationIds, applicationId],
    );
  };

  const handleSubmit = (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();

    completeEvent.mutate({
      eventId: event.id,
      confirmedApplicationIds,
      markUnselectedAcceptedAsNoShow,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 border border-zinc-200 bg-white p-6"
    >
      <section>
        <div>
          <h2 className="text-xl font-semibold text-zinc-950">
            Участники для подтверждения
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Отметьте тех, кто действительно был на мероприятии.
          </p>
        </div>

        {event.applications.length > 0 ? (
          <div className="mt-5 grid gap-4">
            {event.applications.map((application) => {
              const profile = application.user.profile;
              const displayName =
                profile?.displayName ??
                profile?.username ??
                application.user.name ??
                "Участник без имени";
              const isConfirmed = confirmedApplicationIds.includes(
                application.id,
              );

              return (
                <label
                  key={application.id}
                  className="block border border-zinc-200 p-4"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isConfirmed}
                      onChange={() =>
                        toggleConfirmedApplication(application.id)
                      }
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-zinc-950">
                          {displayName}
                        </p>
                        <span className="border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600">
                          {isConfirmed
                            ? "Участвовал"
                            : application.status === ApplicationStatus.NO_SHOW
                              ? "Не явился"
                              : getApplicationStatusLabel(application.status)}
                        </span>
                      </div>
                      {profile?.username ? (
                        <p className="mt-1 text-sm text-zinc-500">
                          @{profile.username}
                        </p>
                      ) : null}
                      {profile?.city ? (
                        <p className="mt-1 text-sm text-zinc-500">
                          {profile.city}
                        </p>
                      ) : null}

                      <dl className="mt-4 grid gap-3 text-sm text-zinc-600 sm:grid-cols-2">
                        {profile?.selfReportedJumpCount !== null &&
                        profile?.selfReportedJumpCount !== undefined ? (
                          <div>
                            <dt className="font-medium text-zinc-950">
                              Прыжков
                            </dt>
                            <dd className="mt-1">
                              {profile.selfReportedJumpCount}
                            </dd>
                          </div>
                        ) : null}
                        {profile?.selfReportedMaxHeightMeters !== null &&
                        profile?.selfReportedMaxHeightMeters !== undefined ? (
                          <div>
                            <dt className="font-medium text-zinc-950">
                              Макс. высота
                            </dt>
                            <dd className="mt-1">
                              {profile.selfReportedMaxHeightMeters} м
                            </dd>
                          </div>
                        ) : null}
                      </dl>

                      {profile?.selfReportedExperience ? (
                        <TextBlock
                          title="Опыт участника"
                          body={profile.selfReportedExperience}
                        />
                      ) : null}
                      {application.message ? (
                        <TextBlock
                          title="Сообщение в заявке"
                          body={application.message}
                        />
                      ) : null}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 border border-zinc-200 p-5">
            <h3 className="text-lg font-semibold text-zinc-950">
              Нет принятых заявок для подтверждения участия.
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Мероприятие можно завершить с нулём подтверждённых участников.
            </p>
          </div>
        )}
      </section>

      <label className="flex items-start gap-3 border border-zinc-200 p-4 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={markUnselectedAcceptedAsNoShow}
          onChange={(event) =>
            setMarkUnselectedAcceptedAsNoShow(event.target.checked)
          }
          className="mt-1"
        />
        <span>
          Отметить неприсутствовавших принятых участников как “Не явился”
        </span>
      </label>

      <section className="border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        После завершения мероприятия чат и логистика перейдут в режим архива.
        Участники с подтверждённым участием останутся в истории мероприятия.
      </section>

      {completeEvent.error ? (
        <p className="text-sm text-red-700">{completeEvent.error.message}</p>
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

function TextBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-zinc-950">{title}</h3>
      <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
        {body}
      </p>
    </div>
  );
}
