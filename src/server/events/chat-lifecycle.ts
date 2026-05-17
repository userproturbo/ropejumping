import "server-only";

import { EventStatus } from "@/generated/prisma/enums";

export const READ_ONLY_EVENT_CHAT_STATUSES = [
  EventStatus.COMPLETED,
  EventStatus.ARCHIVED,
  EventStatus.CANCELLED,
] as const;

export const isEventChatReadOnlyStatus = (status: EventStatus) =>
  READ_ONLY_EVENT_CHAT_STATUSES.includes(
    status as (typeof READ_ONLY_EVENT_CHAT_STATUSES)[number],
  );
