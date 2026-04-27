import "server-only";

import { EventStatus } from "@/generated/prisma/enums";

export const publicEventStatuses = [
  EventStatus.PUBLISHED,
  EventStatus.APPLICATIONS_OPEN,
  EventStatus.FULL,
  EventStatus.APPLICATIONS_CLOSED,
  EventStatus.POSTPONED,
  EventStatus.COMPLETED,
  EventStatus.ARCHIVED,
];
