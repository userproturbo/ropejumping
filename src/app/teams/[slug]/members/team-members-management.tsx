"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { TeamFunctionRole, TeamRole } from "@/generated/prisma/enums";
import { getTeamFunctionRoleLabel, getTeamRoleLabel } from "@/lib/display";
import { api, type RouterOutputs } from "@/trpc/react";

type TeamForMembersManagement =
  RouterOutputs["team"]["getForMembersManagement"];
type TeamMemberForManagement = TeamForMembersManagement["members"][number];
type ManageableTeamRole =
  | typeof TeamRole.ADMIN
  | typeof TeamRole.ORGANIZER
  | typeof TeamRole.MEMBER;

const manageableRoles = [
  TeamRole.ADMIN,
  TeamRole.ORGANIZER,
  TeamRole.MEMBER,
] satisfies ManageableTeamRole[];

const teamFunctionRoles = [
  TeamFunctionRole.OPERATOR,
  TeamFunctionRole.PHOTOGRAPHER,
  TeamFunctionRole.MEDIC,
  TeamFunctionRole.INSTRUCTOR,
  TeamFunctionRole.COORDINATOR,
  TeamFunctionRole.RADIO_OPERATOR,
] satisfies TeamFunctionRole[];

type TeamMembersManagementProps = {
  team: TeamForMembersManagement;
};

export function TeamMembersManagement({ team }: TeamMembersManagementProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<ManageableTeamRole>(TeamRole.MEMBER);
  const [functionRoles, setFunctionRoles] = useState<TeamFunctionRole[]>([]);

  const addMember = api.team.addMember.useMutation({
    onSuccess: () => {
      setUsername("");
      setRole(TeamRole.MEMBER);
      setFunctionRoles([]);
      router.refresh();
    },
  });

  const handleAddMember = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    addMember.mutate({
      teamSlug: team.slug,
      username,
      role,
      functionRoles,
    });
  };

  return (
    <div className="grid gap-6">
      <section className="border border-zinc-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-zinc-950">
          Добавить участника
        </h2>

        <form
          onSubmit={handleAddMember}
          className="mt-5 grid gap-4"
        >
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="grid gap-2">
              <label
                htmlFor="memberUsername"
                className="text-sm font-medium text-zinc-950"
              >
                Username пользователя
              </label>
              <input
                id="memberUsername"
                name="memberUsername"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value.toLowerCase())
                }
                required
                minLength={3}
                maxLength={32}
                pattern="[a-z0-9_-]*"
                className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
                placeholder="username"
              />
            </div>

            <div className="grid gap-2">
              <label
                htmlFor="memberRole"
                className="text-sm font-medium text-zinc-950"
              >
                Роль доступа
              </label>
              <select
                id="memberRole"
                name="memberRole"
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as ManageableTeamRole)
                }
                className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
              >
                {manageableRoles.map((roleOption) => (
                  <option key={roleOption} value={roleOption}>
                    {getTeamRoleLabel(roleOption)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <FunctionRoleCheckboxes
            idPrefix="newMemberFunctionRole"
            selected={functionRoles}
            onChange={setFunctionRoles}
          />

          <div>
            <button
              type="submit"
              disabled={addMember.isPending}
              className="bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {addMember.isPending ? "Добавление..." : "Добавить"}
            </button>
          </div>
        </form>

        {addMember.error ? (
          <p className="mt-3 text-sm text-red-700">{addMember.error.message}</p>
        ) : null}
      </section>

      <section className="border border-zinc-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-zinc-950">
          Участники команды
        </h2>

        <div className="mt-5 grid gap-4">
          {team.members.map((member) => (
            <TeamMemberCard key={member.id} member={member} />
          ))}
        </div>

        <div className="mt-6">
          <Link
            href={`/teams/${team.slug}/settings`}
            className="text-sm text-zinc-600 hover:text-zinc-950"
          >
            Назад к настройкам
          </Link>
          <Link
            href={`/teams/${team.slug}/join-requests`}
            className="ml-4 text-sm text-zinc-600 hover:text-zinc-950"
          >
            Заявки в команду
          </Link>
        </div>
      </section>
    </div>
  );
}

function TeamMemberCard({ member }: { member: TeamMemberForManagement }) {
  const router = useRouter();
  const [role, setRole] = useState<ManageableTeamRole>(
    member.role === TeamRole.OWNER ? TeamRole.MEMBER : member.role,
  );
  const [functionRoles, setFunctionRoles] = useState<TeamFunctionRole[]>(
    member.functionRoles,
  );
  const profile = member.user.profile;
  const displayName =
    profile?.displayName ?? profile?.username ?? member.user.name ?? "Участник без имени";
  const avatarUrl = profile?.avatarUrl ?? member.user.image;
  const isOwner = member.role === TeamRole.OWNER;

  const updateRole = api.team.updateMemberRole.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });
  const removeMember = api.team.removeMember.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });
  const updateFunctionRoles = api.team.updateMemberFunctionRoles.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });
  const isPending =
    updateRole.isPending ||
    removeMember.isPending ||
    updateFunctionRoles.isPending;
  const functionRolesChanged =
    functionRoles.length !== member.functionRoles.length ||
    functionRoles.some((functionRole) => !member.functionRoles.includes(functionRole));

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
            {displayName}
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
          <p className="mt-2 text-xs font-medium text-zinc-500">
            {getTeamRoleLabel(member.role)}
          </p>
          {member.functionRoles.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {member.functionRoles.map((functionRole) => (
                <span
                  key={functionRole}
                  className="border border-zinc-200 px-2 py-1 text-xs text-zinc-600"
                >
                  {getTeamFunctionRoleLabel(functionRole)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium text-zinc-950">Роль доступа</h3>
          {isOwner ? (
            <p className="mt-2 text-sm text-zinc-600">
              Владелец защищён от изменения в этой версии.
            </p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-[220px_auto_auto] lg:block lg:space-y-3">
              <div className="grid gap-2">
                <label
                  htmlFor={`memberRole-${member.id}`}
                  className="text-sm font-medium text-zinc-950"
                >
                  Роль
                </label>
                <select
                  id={`memberRole-${member.id}`}
                  name={`memberRole-${member.id}`}
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value as ManageableTeamRole)
                  }
                  disabled={isPending}
                  className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
                >
                  {manageableRoles.map((roleOption) => (
                    <option key={roleOption} value={roleOption}>
                      {getTeamRoleLabel(roleOption)}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                disabled={isPending || role === member.role}
                onClick={() =>
                  updateRole.mutate({
                    membershipId: member.id,
                    role,
                  })
                }
                className="bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {updateRole.isPending ? "Изменение..." : "Изменить роль"}
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  removeMember.mutate({
                    membershipId: member.id,
                  })
                }
                className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
              >
                {removeMember.isPending ? "Удаление..." : "Удалить из команды"}
              </button>
            </div>
          )}
        </div>

        <div>
          <FunctionRoleCheckboxes
            idPrefix={`memberFunctionRole-${member.id}`}
            selected={functionRoles}
            onChange={setFunctionRoles}
            disabled={isPending}
          />
          <button
            type="button"
            disabled={isPending || !functionRolesChanged}
            onClick={() =>
              updateFunctionRoles.mutate({
                membershipId: member.id,
                functionRoles,
              })
            }
            className="mt-3 bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {updateFunctionRoles.isPending
              ? "Сохранение..."
              : "Сохранить функции"}
          </button>
        </div>
      </div>

      {updateRole.error ? (
        <p className="mt-3 text-sm text-red-700">{updateRole.error.message}</p>
      ) : null}
      {updateFunctionRoles.error ? (
        <p className="mt-3 text-sm text-red-700">
          {updateFunctionRoles.error.message}
        </p>
      ) : null}
      {removeMember.error ? (
        <p className="mt-3 text-sm text-red-700">{removeMember.error.message}</p>
      ) : null}
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
      <h3 className="text-sm font-medium text-zinc-950">Функции в команде</h3>
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
