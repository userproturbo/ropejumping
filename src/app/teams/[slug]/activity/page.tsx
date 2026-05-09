import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AuditAction,
  TeamFunctionRole,
  TeamRole,
} from "@/generated/prisma/enums";
import { getTeamFunctionRoleLabel, getTeamRoleLabel } from "@/lib/display";
import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

type TeamActivityPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type AuditMetadata = Record<string, unknown>;

const auditActionLabels: Partial<Record<AuditAction, string>> = {
  TEAM_UPDATED: "Команда обновлена",
  TEAM_MEMBER_ADDED: "Участник добавлен",
  TEAM_MEMBER_REMOVED: "Участник удалён",
  TEAM_MEMBER_ROLE_UPDATED: "Роль участника изменена",
  TEAM_MEMBER_FUNCTION_ROLES_UPDATED: "Функции участника изменены",
  TEAM_OWNER_TRANSFERRED: "Владелец команды изменён",
  TEAM_MEMBER_LEFT: "Участник вышел из команды",
  TEAM_JOIN_REQUEST_ACCEPTED: "Заявка в команду принята",
  TEAM_JOIN_REQUEST_REJECTED: "Заявка в команду отклонена",
  TEAM_INVITATION_CREATED: "Приглашение отправлено",
  TEAM_INVITATION_CANCELLED: "Приглашение отменено",
  TEAM_INVITATION_ACCEPTED: "Приглашение принято",
  TEAM_INVITATION_REJECTED: "Приглашение отклонено",
};

const fieldLabels: Record<string, string> = {
  name: "название",
  description: "описание",
  region: "регион",
  logoUrl: "логотип",
};

const formatActivityDate = (date: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

const isMetadata = (metadata: unknown): metadata is AuditMetadata =>
  Boolean(metadata) && typeof metadata === "object" && !Array.isArray(metadata);

const getStringValue = (metadata: AuditMetadata, key: string) => {
  const value = metadata[key];

  return typeof value === "string" ? value : null;
};

const getStringArrayValue = (metadata: AuditMetadata, key: string) => {
  const value = metadata[key];

  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
};

const isTeamRole = (value: string | null): value is TeamRole =>
  value !== null && Object.values(TeamRole).includes(value as TeamRole);

const isTeamFunctionRole = (value: string): value is TeamFunctionRole =>
  Object.values(TeamFunctionRole).includes(value as TeamFunctionRole);

const formatRole = (role: string | null) =>
  isTeamRole(role) ? getTeamRoleLabel(role) : role;

const formatFunctionRoles = (roles: string[]) => {
  if (roles.length === 0) return "нет";

  return roles
    .map((role) =>
      isTeamFunctionRole(role) ? getTeamFunctionRoleLabel(role) : role,
    )
    .join(", ");
};

const getActorName = (actor: {
  name: string | null;
  profile: {
    username: string | null;
    displayName: string | null;
  } | null;
} | null) => {
  if (!actor) return "Система";

  return (
    actor.profile?.displayName ??
    actor.profile?.username ??
    actor.name ??
    "Пользователь"
  );
};

const getMetadataSummary = (action: AuditAction, rawMetadata: unknown) => {
  const metadata = isMetadata(rawMetadata) ? rawMetadata : {};

  switch (action) {
    case AuditAction.TEAM_UPDATED: {
      const changedFields = getStringArrayValue(metadata, "changedFields");

      if (changedFields.length === 0) return "Изменения сохранены.";

      return `Поля: ${changedFields
        .map((field) => fieldLabels[field] ?? field)
        .join(", ")}.`;
    }
    case AuditAction.TEAM_MEMBER_ADDED:
      return [
        `Участник: ${getStringValue(metadata, "targetUserId") ?? "неизвестно"}`,
        `роль: ${formatRole(getStringValue(metadata, "role")) ?? "неизвестно"}`,
        `функции: ${formatFunctionRoles(
          getStringArrayValue(metadata, "functionRoles"),
        )}`,
      ].join("; ");
    case AuditAction.TEAM_MEMBER_REMOVED:
    case AuditAction.TEAM_MEMBER_LEFT:
      return [
        `Участник: ${
          getStringValue(metadata, "targetUserId") ??
          getStringValue(metadata, "userId") ??
          "неизвестно"
        }`,
        `предыдущая роль: ${
          formatRole(getStringValue(metadata, "previousRole")) ?? "неизвестно"
        }`,
      ].join("; ");
    case AuditAction.TEAM_MEMBER_ROLE_UPDATED:
      return [
        `Участник: ${getStringValue(metadata, "targetUserId") ?? "неизвестно"}`,
        `было: ${
          formatRole(getStringValue(metadata, "previousRole")) ?? "неизвестно"
        }`,
        `стало: ${
          formatRole(getStringValue(metadata, "newRole")) ?? "неизвестно"
        }`,
      ].join("; ");
    case AuditAction.TEAM_MEMBER_FUNCTION_ROLES_UPDATED:
      return [
        `Участник: ${getStringValue(metadata, "targetUserId") ?? "неизвестно"}`,
        `было: ${formatFunctionRoles(
          getStringArrayValue(metadata, "previousFunctionRoles"),
        )}`,
        `стало: ${formatFunctionRoles(
          getStringArrayValue(metadata, "newFunctionRoles"),
        )}`,
      ].join("; ");
    case AuditAction.TEAM_OWNER_TRANSFERRED:
      return [
        `Бывший владелец: ${
          getStringValue(metadata, "previousOwnerUserId") ?? "неизвестно"
        }`,
        `новый владелец: ${
          getStringValue(metadata, "newOwnerUserId") ?? "неизвестно"
        }`,
      ].join("; ");
    case AuditAction.TEAM_JOIN_REQUEST_ACCEPTED:
    case AuditAction.TEAM_JOIN_REQUEST_REJECTED:
      return `Заявитель: ${
        getStringValue(metadata, "requesterUserId") ?? "неизвестно"
      }.`;
    case AuditAction.TEAM_INVITATION_CREATED:
      return [
        `Приглашённый: ${
          getStringValue(metadata, "invitedUserId") ?? "неизвестно"
        }`,
        `роль: ${formatRole(getStringValue(metadata, "role")) ?? "неизвестно"}`,
        `функции: ${formatFunctionRoles(
          getStringArrayValue(metadata, "functionRoles"),
        )}`,
      ].join("; ");
    case AuditAction.TEAM_INVITATION_CANCELLED:
    case AuditAction.TEAM_INVITATION_ACCEPTED:
    case AuditAction.TEAM_INVITATION_REJECTED:
      return `Приглашённый: ${
        getStringValue(metadata, "invitedUserId") ?? "неизвестно"
      }.`;
    default:
      return "Детали действия сохранены в журнале.";
  }
};

export default async function TeamActivityPage({
  params,
}: TeamActivityPageProps) {
  const { slug } = await params;
  await requireCurrentUser(`/teams/${slug}/activity`);

  const activity = await api.audit.listTeamActivity(slug).catch(() => null);

  if (!activity) {
    notFound();
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Журнал действий
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Последние действия по управлению командой.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/teams/${activity.team.slug}`}
              className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
            >
              Команда
            </Link>
            <Link
              href={`/teams/${activity.team.slug}/members`}
              className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
            >
              Участники
            </Link>
            <Link
              href={`/teams/${activity.team.slug}/settings`}
              className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
            >
              Настройки
            </Link>
          </div>
        </div>

        <section className="mb-6 border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-zinc-950">
            {activity.team.name}
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Видно только владельцу и администраторам команды.
          </p>
        </section>

        {activity.logs.length > 0 ? (
          <div className="grid gap-4">
            {activity.logs.map((log) => (
              <article
                key={log.id}
                className="border border-zinc-200 bg-white p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-950">
                      {auditActionLabels[log.action] ?? log.action}
                    </h2>
                    <p className="mt-2 text-sm text-zinc-600">
                      {getMetadataSummary(log.action, log.metadata)}
                    </p>
                  </div>
                  <time className="text-sm text-zinc-500">
                    {formatActivityDate(log.createdAt)}
                  </time>
                </div>
                <p className="mt-4 text-sm text-zinc-500">
                  Исполнитель: {getActorName(log.actor)}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Действий пока нет
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              В журнале появятся изменения состава, ролей и приглашений команды.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
