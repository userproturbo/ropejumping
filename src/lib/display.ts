import type {
  EventStatus,
  TeamRole,
  TeamStatus,
} from "@/generated/prisma/enums";

const teamStatusLabels = {
  REGULAR: "Обычная",
  VERIFIED: "Проверенная",
  HIDDEN: "Скрытая",
  BLOCKED: "Заблокированная",
} satisfies Record<TeamStatus, string>;

const teamRoleLabels = {
  OWNER: "Владелец",
  ADMIN: "Администратор",
  ORGANIZER: "Организатор",
  MEMBER: "Участник",
} satisfies Record<TeamRole, string>;

const eventStatusLabels = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликовано",
  APPLICATIONS_OPEN: "Набор открыт",
  FULL: "Мест нет",
  APPLICATIONS_CLOSED: "Набор закрыт",
  POSTPONED: "Перенесено",
  CANCELLED: "Отменено",
  COMPLETED: "Состоялось",
  ARCHIVED: "Архив",
} satisfies Record<EventStatus, string>;

export const getTeamStatusLabel = (status: TeamStatus) =>
  teamStatusLabels[status];

export const getTeamRoleLabel = (role: TeamRole) => teamRoleLabels[role];

export const getEventStatusLabel = (status: EventStatus) =>
  eventStatusLabels[status];
