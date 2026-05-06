"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { TeamFunctionRole } from "@/generated/prisma/enums";
import {
  getTeamFunctionRoleLabel,
  getTeamRoleLabel,
} from "@/lib/display";
import { api, type RouterOutputs } from "@/trpc/react";

type EventCrewManagementData = RouterOutputs["event"]["getCrewManagement"];
type TeamMemberForCrew = EventCrewManagementData["teamMembers"][number];
type CrewMemberForManagement =
  EventCrewManagementData["crewMembers"][number];

const teamFunctionRoles: TeamFunctionRole[] = [
  TeamFunctionRole.OPERATOR,
  TeamFunctionRole.PHOTOGRAPHER,
  TeamFunctionRole.MEDIC,
  TeamFunctionRole.INSTRUCTOR,
  TeamFunctionRole.COORDINATOR,
  TeamFunctionRole.RADIO_OPERATOR,
];

const getTeamMemberDisplayName = (teamMember: TeamMemberForCrew) => {
  const profile = teamMember.user.profile;

  return (
    profile?.displayName ??
    profile?.username ??
    teamMember.user.name ??
    "Участник без имени"
  );
};

const getCrewMemberDisplayName = (crewMember: CrewMemberForManagement) => {
  const profile = crewMember.teamMember.user.profile;

  return (
    profile?.displayName ??
    profile?.username ??
    crewMember.teamMember.user.name ??
    "Участник без имени"
  );
};

type EventCrewManagementProps = {
  data: EventCrewManagementData;
};

export function EventCrewManagement({ data }: EventCrewManagementProps) {
  const router = useRouter();
  const assignedTeamMemberIds = new Set(
    data.crewMembers.map((crewMember) => crewMember.teamMemberId),
  );
  const availableTeamMembers = data.teamMembers.filter(
    (teamMember) => !assignedTeamMemberIds.has(teamMember.id),
  );
  const [teamMemberId, setTeamMemberId] = useState("");
  const [functionRoles, setFunctionRoles] = useState<TeamFunctionRole[]>([]);
  const [note, setNote] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const upsertCrewMember = api.event.upsertCrewMember.useMutation({
    onSuccess: () => {
      setTeamMemberId("");
      setFunctionRoles([]);
      setNote("");
      setValidationError(null);
      router.refresh();
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);

    if (functionRoles.length === 0) {
      setValidationError("Выберите хотя бы одну функцию.");
      return;
    }

    if (!teamMemberId) return;

    upsertCrewMember.mutate({
      eventSlug: data.event.slug,
      teamMemberId,
      functionRoles,
      note,
    });
  };

  return (
    <div className="grid gap-6">
      <section className="border border-zinc-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-zinc-950">
          Добавить в состав
        </h2>

        {availableTeamMembers.length > 0 ? (
          <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
            <div className="grid gap-2">
              <label
                htmlFor="crewTeamMember"
                className="text-sm font-medium text-zinc-950"
              >
                Участник команды
              </label>
              <select
                id="crewTeamMember"
                name="crewTeamMember"
                value={teamMemberId}
                onChange={(event) => setTeamMemberId(event.target.value)}
                required
                className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
              >
                <option value="">Выберите участника</option>
                {availableTeamMembers.map((teamMember) => (
                  <option key={teamMember.id} value={teamMember.id}>
                    {getTeamMemberDisplayName(teamMember)} ·{" "}
                    {getTeamRoleLabel(teamMember.role)}
                  </option>
                ))}
              </select>
            </div>

            <FunctionRoleCheckboxes
              idPrefix="newCrewFunctionRole"
              selected={functionRoles}
              onChange={setFunctionRoles}
            />

            <div className="grid gap-2">
              <label
                htmlFor="crewNote"
                className="text-sm font-medium text-zinc-950"
              >
                Комментарий
              </label>
              <textarea
                id="crewNote"
                name="crewNote"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
                rows={3}
                className="resize-y border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
              />
            </div>

            {validationError ? (
              <p className="text-sm text-red-700">{validationError}</p>
            ) : null}
            {upsertCrewMember.error ? (
              <p className="text-sm text-red-700">
                {upsertCrewMember.error.message}
              </p>
            ) : null}

            <div>
              <button
                type="submit"
                disabled={upsertCrewMember.isPending}
                className="bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {upsertCrewMember.isPending
                  ? "Сохранение..."
                  : "Добавить в состав"}
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-2 text-sm text-zinc-600">
            Все участники команды уже добавлены в состав.
          </p>
        )}
      </section>

      <section className="border border-zinc-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-zinc-950">
          Текущий состав
        </h2>

        {data.crewMembers.length > 0 ? (
          <div className="mt-5 grid gap-4">
            {data.crewMembers.map((crewMember) => (
              <CrewMemberCard
                key={crewMember.id}
                crewMember={crewMember}
                eventSlug={data.event.slug}
              />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-600">
            Состав пока не добавлен.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-4">
          <Link
            href={`/events/${data.event.slug}`}
            className="text-sm text-zinc-600 hover:text-zinc-950"
          >
            Публичная страница
          </Link>
          <Link
            href={`/events/${data.event.slug}/edit`}
            className="text-sm text-zinc-600 hover:text-zinc-950"
          >
            Редактировать мероприятие
          </Link>
        </div>
      </section>
    </div>
  );
}

function CrewMemberCard({
  crewMember,
  eventSlug,
}: {
  crewMember: CrewMemberForManagement;
  eventSlug: string;
}) {
  const router = useRouter();
  const [functionRoles, setFunctionRoles] = useState<TeamFunctionRole[]>(
    crewMember.functionRoles,
  );
  const [note, setNote] = useState(crewMember.note ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);
  const profile = crewMember.teamMember.user.profile;
  const avatarUrl = profile?.avatarUrl ?? crewMember.teamMember.user.image;
  const isChanged =
    note !== (crewMember.note ?? "") ||
    functionRoles.length !== crewMember.functionRoles.length ||
    functionRoles.some(
      (functionRole) => !crewMember.functionRoles.includes(functionRole),
    );

  const upsertCrewMember = api.event.upsertCrewMember.useMutation({
    onSuccess: () => {
      setValidationError(null);
      router.refresh();
    },
  });
  const removeCrewMember = api.event.removeCrewMember.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });
  const isPending = upsertCrewMember.isPending || removeCrewMember.isPending;

  const handleSave = () => {
    setValidationError(null);

    if (functionRoles.length === 0) {
      setValidationError("Выберите хотя бы одну функцию.");
      return;
    }

    upsertCrewMember.mutate({
      eventSlug,
      teamMemberId: crewMember.teamMemberId,
      functionRoles,
      note,
    });
  };

  return (
    <article className="border border-zinc-200 p-4">
      <div className="flex min-w-0 items-start gap-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-12 w-12 border border-zinc-200 object-cover"
          />
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-950">
            {getCrewMemberDisplayName(crewMember)}
          </p>
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
          <div className="mt-2 flex flex-wrap gap-2">
            {crewMember.functionRoles.map((functionRole) => (
              <span
                key={functionRole}
                className="border border-zinc-200 px-2 py-1 text-xs text-zinc-600"
              >
                {getTeamFunctionRoleLabel(functionRole)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <FunctionRoleCheckboxes
          idPrefix={`crewFunctionRole-${crewMember.id}`}
          selected={functionRoles}
          onChange={setFunctionRoles}
          disabled={isPending}
        />

        <div className="grid gap-2">
          <label
            htmlFor={`crewNote-${crewMember.id}`}
            className="text-sm font-medium text-zinc-950"
          >
            Комментарий
          </label>
          <textarea
            id={`crewNote-${crewMember.id}`}
            name={`crewNote-${crewMember.id}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={isPending}
            maxLength={500}
            rows={3}
            className="resize-y border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
          />
        </div>

        {validationError ? (
          <p className="text-sm text-red-700">{validationError}</p>
        ) : null}
        {upsertCrewMember.error ? (
          <p className="text-sm text-red-700">
            {upsertCrewMember.error.message}
          </p>
        ) : null}
        {removeCrewMember.error ? (
          <p className="text-sm text-red-700">
            {removeCrewMember.error.message}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isPending || !isChanged}
            onClick={handleSave}
            className="bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {upsertCrewMember.isPending ? "Сохранение..." : "Сохранить"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              removeCrewMember.mutate({
                eventSlug,
                crewMemberId: crewMember.id,
              })
            }
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            {removeCrewMember.isPending ? "Удаление..." : "Удалить из состава"}
          </button>
        </div>
      </div>
    </article>
  );
}

function FunctionRoleCheckboxes({
  idPrefix,
  selected,
  onChange,
  disabled = false,
}: {
  idPrefix: string;
  selected: TeamFunctionRole[];
  onChange: (roles: TeamFunctionRole[]) => void;
  disabled?: boolean;
}) {
  const toggleFunctionRole = (functionRole: TeamFunctionRole) => {
    if (selected.includes(functionRole)) {
      onChange(selected.filter((selectedRole) => selectedRole !== functionRole));
      return;
    }

    onChange([...selected, functionRole]);
  };

  return (
    <div>
      <h3 className="text-sm font-medium text-zinc-950">
        Функции на мероприятии
      </h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {teamFunctionRoles.map((functionRole) => (
          <label
            key={functionRole}
            htmlFor={`${idPrefix}-${functionRole}`}
            className="flex items-center gap-2 text-sm text-zinc-700"
          >
            <input
              id={`${idPrefix}-${functionRole}`}
              type="checkbox"
              checked={selected.includes(functionRole)}
              disabled={disabled}
              onChange={() => toggleFunctionRole(functionRole)}
              className="h-4 w-4"
            />
            {getTeamFunctionRoleLabel(functionRole)}
          </label>
        ))}
      </div>
    </div>
  );
}
