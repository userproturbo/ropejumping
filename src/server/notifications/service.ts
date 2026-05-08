import type { NotificationType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import type { db as database } from "@/server/db";

type NotificationDb =
  | Pick<typeof database, "notification">
  | Pick<Prisma.TransactionClient, "notification">;

type NotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  href?: string | null;
};

export const createNotification = async (
  db: NotificationDb,
  input: NotificationInput,
) => {
  return db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
    },
  });
};

export const createNotifications = async (
  db: NotificationDb,
  inputs: NotificationInput[],
) => {
  if (inputs.length === 0) return { count: 0 };

  return db.notification.createMany({
    data: inputs.map((input) => ({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
    })),
  });
};
