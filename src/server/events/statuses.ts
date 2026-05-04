import "server-only";

import { EventStatus } from "@/generated/prisma/enums";

export const applicationOpenEventStatuses: EventStatus[] = [
  EventStatus.APPLICATIONS_OPEN,
];

export const publicEventStatuses: EventStatus[] = [
  EventStatus.PUBLISHED,
  EventStatus.APPLICATIONS_OPEN,
  EventStatus.FULL,
  EventStatus.APPLICATIONS_CLOSED,
  EventStatus.POSTPONED,
  EventStatus.CANCELLED,
  EventStatus.COMPLETED,
  EventStatus.ARCHIVED,
];
