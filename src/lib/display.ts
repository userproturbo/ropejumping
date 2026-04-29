import type {
  ApplicationStatus,
  EventStatus,
  ObjectType,
  ObjectVisibility,
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

const applicationStatusLabels = {
  PENDING: "Ожидает решения",
  ACCEPTED: "Принята",
  REJECTED: "Отклонена",
  CANCELLED_BY_USER: "Отменена пользователем",
  CONFIRMED_PARTICIPATION: "Участие подтверждено",
  NO_SHOW: "Не явился",
} satisfies Record<ApplicationStatus, string>;

const objectTypeLabels = {
  BRIDGE: "Мост",
  BUILDING: "Здание",
  TOWER: "Башня",
  CLIFF: "Скала",
  INDUSTRIAL: "Индустриальный объект",
  OTHER: "Другое",
} satisfies Record<ObjectType, string>;

const objectVisibilityLabels = {
  PUBLIC: "Публичный",
  HIDDEN: "Скрытый",
} satisfies Record<ObjectVisibility, string>;

export const getTeamStatusLabel = (status: TeamStatus) =>
  teamStatusLabels[status];

export const getTeamRoleLabel = (role: TeamRole) => teamRoleLabels[role];

export const getEventStatusLabel = (status: EventStatus) =>
  eventStatusLabels[status];

export const getApplicationStatusLabel = (status: ApplicationStatus) =>
  applicationStatusLabels[status];

export const getObjectTypeLabel = (type: ObjectType) =>
  objectTypeLabels[type];

export const getObjectVisibilityLabel = (visibility: ObjectVisibility) =>
  objectVisibilityLabels[visibility];
